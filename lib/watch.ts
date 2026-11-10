import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { getKevCatalog } from '@/lib/kev';
import { registerTask } from '@/lib/newsroom/tasks';
import { onPublished, type PublishedStory } from '@/lib/newsroom/hooks';
import { sendWatchAlert, DAILY_LIMIT, sentToday } from '@/lib/email';
import { SITE } from '@/lib/site';

export type WatchItem = { user_id: string; vendor: string; product: string | null };
export type Hit = { key: string; title: string; url: string; why: string };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export function matches(w: { vendor: string; product: string | null }, vendor: string, product: string, extraText = '') {
  const v = norm(w.vendor);
  const hay = norm(`${vendor} ${product} ${extraText}`);
  if (!v || !(` ${hay} `).includes(` ${v} `)) return false;
  return !w.product || ` ${norm(product)} ${norm(extraText)} `.includes(` ${norm(w.product)} `);
}

async function pendingHits(): Promise<Map<string, Hit[]>> {
  const db = createAdminClient();
  const { data: items } = await db.from('watch_items').select('user_id,vendor,product');
  const out = new Map<string, Hit[]>();
  if (!items?.length) return out;
  const since = Date.now() - 3 * 864e5;
  const kev = (await getKevCatalog()).filter((k) => new Date(k.dateAdded).getTime() >= since);
  const { data: stories } = await db.from('articles').select('id,slug,title,entities,tags,cves').eq('status', 'published').gte('published_at', new Date(since).toISOString());
  const { data: sent } = await db.from('watch_alerts').select('user_id,key').gte('sent_at', new Date(Date.now() - 30 * 864e5).toISOString());
  const done = new Set((sent ?? []).map((s) => `${s.user_id}|${s.key}`));
  const add = (uid: string, h: Hit) => { if (done.has(`${uid}|${h.key}`)) return; const l = out.get(uid) ?? []; if (!l.some((x) => x.key === h.key)) l.push(h); out.set(uid, l); };
  for (const w of items as WatchItem[]) {
    for (const k of kev) if (matches(w, k.vendorProject, k.product)) add(w.user_id, { key: k.cveID, title: `${k.cveID}: ${k.vulnerabilityName}`, url: `${SITE.url}/cve/${k.cveID}`, why: `Actively exploited (CISA KEV). Patch deadline for US agencies: ${k.dueDate}.` });
    for (const s of stories ?? []) {
      if (matches(w, (s.entities ?? []).join(' '), '', `${(s.tags ?? []).join(' ')} ${s.title}`)) add(w.user_id, { key: `article:${s.id}`, title: s.title, url: `${SITE.url}/article/${s.slug}`, why: 'New story about a product you watch.' });
    }
  }
  return out;
}

/** Sends each watcher one digest email of new matches. Stops when today's email limit is close. */
export async function sendWatchAlerts() {
  const hits = await pendingHits();
  if (!hits.size) return 0;
  const db = createAdminClient();
  const { data: users } = await db.auth.admin.listUsers({ perPage: 1000 });
  let sent = 0;
  for (const [uid, list] of hits) {
    if ((await sentToday()) >= DAILY_LIMIT - 10) break; // leave room for sign-in codes; the rest go next run
    const email = users?.users.find((u) => u.id === uid)?.email;
    if (!email) continue;
    try {
      await sendWatchAlert(email, list.slice(0, 10));
      await db.from('watch_alerts').upsert(list.map((h) => ({ user_id: uid, key: h.key })));
      sent++;
    } catch { /* try again next run */ }
  }
  return sent;
}

registerTask({ name: 'stackWatch', run: sendWatchAlerts });
// A story going live triggers alerts on the next scheduler tick; nothing extra needed here,
// but keep the hook so Phase 4 broadcasts and Stack Watch share the same event.
onPublished(async (_s: PublishedStory) => {});
