import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { chatJSON, todaysRequests } from '@/lib/ai/providers';
import { getEpss, getKevCatalog } from '@/lib/kev';
import { runFeed } from '@/lib/feed';
import { CATEGORIES, SEVERITIES, slugify } from '@/lib/site';
import { getAiSettings } from './settings';
import { notify } from './notify';
import { findSimilar } from './similar';
import { runChecks, checksPassed } from './checks';
import { fetchArticleText } from './source';
import { kevArticle } from './kev-alert';
import { storyPublished } from './hooks';

const STYLE = `You are a careful cybersecurity news editor for Velkrypt Wire, a UK site. Rules:
- Use ONLY facts in the SOURCE TEXT. Never invent names, numbers, dates, CVEs or quotes. If something is unknown, say it is not yet known.
- Write entirely in your own words. Do not copy sentences or long phrases from the source.
- British English, plain and calm. No hype, no exclamation marks.
- If a breach is only claimed (for example by a ransomware gang) and not confirmed by the victim, say "claims" and set verification to "claimed".
- verification: "official" (government/vendor advisory), "confirmed" (victim or vendor confirmed), "claimed" (attackers or unverified reports), "investigating" (organisation says it is investigating).`;

type Triage = { importance: number; newsworthy: boolean; category: string; severity: string; verification: string; entities: string[]; cves: string[]; reason: string };
type Draft = { title: string; excerpt: string; body_md: string; tags: string[]; cves: string[]; verification: string; claims: { claim: string; supported: boolean }[] };
type UpdateDecision = { adds_new_information: boolean; update_md: string };

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) : s);
const pick = <T extends string>(v: string, list: readonly T[], d: T) => (list.includes(v as T) ? (v as T) : d);
const VERIFS = ['official', 'confirmed', 'claimed', 'investigating'] as const;

async function uniqueSlug(base: string) {
  const db = createAdminClient();
  let slug = base || `story-${Date.now()}`;
  for (let i = 2; i < 20; i++) {
    const { data } = await db.from('articles').select('id').eq('slug', slug).maybeSingle();
    if (!data) return slug;
    slug = `${base}-${i}`.slice(0, 90);
  }
  return `${base}-${Date.now()}`;
}

async function mark(id: string, ai_status: string, ai_note?: string, extra: Record<string, unknown> = {}) {
  await createAdminClient().from('feed_items').update({ ai_status, ai_note: ai_note?.slice(0, 500) ?? null, ...extra }).eq('id', id);
}

type Item = { id: string; source: string; title: string; url: string; summary: string | null; cves: string[]; published_at: string | null };

/** Existing story found: ask whether this item adds anything, and if so, propose a timeline update. */
async function proposeUpdate(item: Item, existing: { id: string; title: string; slug: string }) {
  const db = createAdminClient();
  const { data: art } = await db.from('articles').select('excerpt,body_md').eq('id', existing.id).single();
  const { data: ups } = await db.from('article_updates').select('body_md').eq('article_id', existing.id).neq('status', 'rejected').order('created_at', { ascending: false }).limit(5);
  const sourceText = (await fetchArticleText(item.url)) || item.summary || item.title;
  const { data } = await chatJSON<UpdateDecision>([
    { role: 'system', content: `${STYLE}\nDecide if the NEW SOURCE adds genuinely new facts to the EXISTING STORY. If yes, write a 1-2 sentence update in your own words starting with the new fact. Reply as JSON {"adds_new_information": boolean, "update_md": string}.` },
    { role: 'user', content: `EXISTING STORY: ${existing.title}\n${clip(art?.excerpt ?? '', 400)}\n${clip(art?.body_md ?? '', 2500)}\nUPDATES SO FAR:\n${(ups ?? []).map((u) => `- ${u.body_md}`).join('\n') || 'none'}\n\nNEW SOURCE (${item.source}): ${item.title}\nSOURCE TEXT:\n${clip(sourceText, 6000)}` },
  ], { maxTokens: 400 });
  if (!data.adds_new_information || !data.update_md?.trim()) {
    await mark(item.id, 'duplicate', `Already covered: ${existing.title}`);
    return;
  }
  await db.from('article_updates').insert({ article_id: existing.id, body_md: clip(data.update_md.trim(), 1500), source_name: item.source, source_url: item.url, status: 'pending', ai_generated: true });
  await mark(item.id, 'update', `Update suggested for: ${existing.title}`);
  await notify('update', `Update suggested: ${existing.title}`, { body: data.update_md, link: `/admin/review#updates` });
}

async function handleKev(item: Item, kevMap: Map<string, Awaited<ReturnType<typeof getKevCatalog>>[number]>, autopublish: boolean) {
  const cve = item.cves[0];
  const k = cve ? kevMap.get(cve) : undefined;
  if (!k) return mark(item.id, 'skipped', 'KEV entry not found');
  if (Date.now() - new Date(k.dateAdded).getTime() > 2 * 864e5) return mark(item.id, 'skipped', 'Older than 2 days: left in the feed for manual review');
  const epss = (await getEpss([k.cveID]))[k.cveID];
  const a = kevArticle(k, epss);
  const db = createAdminClient();
  const status = autopublish ? 'published' : 'review';
  const { data, error } = await db.from('articles').insert({
    ...a, slug: await uniqueSlug(a.slug), status, ai_generated: false, ai_checks: [{ label: 'Built only from official CISA data', ok: true }],
    published_at: autopublish ? new Date().toISOString() : null,
  }).select('id,slug').single();
  if (error || !data) return mark(item.id, 'error', error?.message);
  await mark(item.id, autopublish ? 'published' : 'drafted', a.title, { article_id: data.id });
  if (autopublish) {
    await notify('ai_published', `Published automatically: ${a.title}`, { link: `/admin/articles/${data.id}`, email: a.priority === 'breaking' ? 'publishers' : undefined, body: 'Official CISA alert, built from CISA data.' });
    await storyPublished({ id: data.id, slug: data.slug, title: a.title, excerpt: a.excerpt, severity: a.severity, category: a.category, cves: a.cves, entities: a.entities, tags: a.tags });
  } else {
    await notify('review', `Official alert ready: ${a.title}`, { link: `/admin/articles/${data.id}` });
  }
}

async function handleNews(item: Item, minImportance: number) {
  const sourceText = (await fetchArticleText(item.url)) || `${item.title}\n${item.summary ?? ''}`;
  const { data: t } = await chatJSON<Triage>([
    { role: 'system', content: `${STYLE}\nTriage this item for a cybersecurity news site. importance: 1 (trivial, marketing, opinion) to 5 (major breach or mass exploitation affecting many organisations). Reply as JSON {"importance":1-5,"newsworthy":bool,"category":one of ${JSON.stringify(CATEGORIES)},"severity":"critical|high|medium|info","verification":"official|confirmed|claimed|investigating","entities":[company and product names],"cves":[CVE ids in the text],"reason":"short"}.` },
    { role: 'user', content: `SOURCE: ${item.source}\nHEADLINE: ${item.title}\nSOURCE TEXT:\n${clip(sourceText, 5000)}` },
  ], { maxTokens: 300 });
  const importance = Math.max(1, Math.min(5, Number(t.importance) || 1));
  if (!t.newsworthy || importance < minImportance) return mark(item.id, 'skipped', `Importance ${importance}: ${t.reason}`, { importance });

  const { data: d } = await chatJSON<Draft>([
    { role: 'system', content: `${STYLE}\nWrite a news story in Markdown with sections "### What happened", "### Why it matters", "### What to do" (practical steps for defenders or affected people). 250-450 words. End with: *Original reporting: [${item.source}](${item.url})*. Also list the main factual claims and whether each is directly supported by the source text. Reply as JSON {"title":"under 110 chars","excerpt":"1-2 sentences","body_md":"...","tags":["max 4"],"cves":["only CVEs in the source"],"verification":"...","claims":[{"claim":"...","supported":true}]}.` },
    { role: 'user', content: `SOURCE: ${item.source} (${item.url})\nHEADLINE: ${item.title}\nSOURCE TEXT:\n${clip(sourceText, 9000)}` },
  ], { maxTokens: 1800 });

  const cves = [...new Set([...(d.cves ?? []), ...(t.cves ?? []), ...item.cves].map((c) => String(c).toUpperCase()).filter((c) => /^CVE-\d{4}-\d{4,}$/.test(c)))].slice(0, 10);
  const verification = pick(d.verification || t.verification, VERIFS, 'investigating');
  const checks = runChecks({ title: d.title, body: d.body_md, cves, verification, claims: d.claims }, sourceText, item.url);
  const priority = importance >= 5 ? 'breaking' : importance >= 4 ? 'high' : 'normal';
  const db = createAdminClient();
  const { data: art, error } = await db.from('articles').insert({
    slug: await uniqueSlug(slugify(d.title)), title: clip(d.title, 200), excerpt: clip(d.excerpt ?? '', 400), body_md: d.body_md,
    category: pick(t.category, CATEGORIES, 'Threats'), severity: pick(t.severity, SEVERITIES, 'high'),
    cves, tags: (d.tags ?? []).slice(0, 4), entities: (t.entities ?? []).slice(0, 8).map(String),
    source_name: item.source, source_url: item.url, sources: [{ name: item.source, url: item.url }],
    verification, status: 'review', ai_generated: true, ai_checks: checks, priority,
  }).select('id').single();
  if (error || !art) return mark(item.id, 'error', error?.message);
  await mark(item.id, 'drafted', `Importance ${importance}`, { importance, article_id: art.id });
  const passed = checksPassed(checks);
  await notify(priority === 'breaking' ? 'breaking' : 'review', `${priority === 'breaking' ? 'Breaking draft' : 'AI draft'} to review: ${d.title}`, {
    body: `Self-check: ${passed}/${checks.length} passed.`, link: `/admin/articles/${art.id}`, email: priority === 'breaking' ? 'publishers' : undefined,
  });
}

/** One pass of the newsroom agent. Called every few minutes by the scheduler. */
export async function runAgent({ budgetMs = 45_000 } = {}) {
  const started = Date.now();
  const settings = await getAiSettings();
  const report = { feed: { checked: 0, added: 0 }, processed: 0, skipped: 0, notes: [] as string[] };
  if (!settings.enabled) { report.notes.push('AI is paused (kill switch).'); return report; }

  const feed = await runFeed();
  report.feed = { checked: feed.checked, added: feed.added };

  const db = createAdminClient();
  const { data: items } = await db.from('feed_items').select('id,source,title,url,summary,cves,published_at')
    .eq('ai_status', 'pending').eq('status', 'new').gte('created_at', new Date(Date.now() - 3 * 864e5).toISOString())
    .order('published_at', { ascending: false, nullsFirst: false }).limit(12);
  if (!items?.length) return report;

  const kevMap = new Map((await getKevCatalog()).map((k) => [k.cveID, k]));
  for (const item of items as Item[]) {
    if (Date.now() - started > budgetMs) break;
    if ((await todaysRequests()) >= settings.daily_request_limit && item.source !== 'CISA KEV') {
      report.notes.push('Daily AI limit reached.');
      await notify('system', 'AI daily limit reached', { body: `The newsroom used ${settings.daily_request_limit} AI requests today and paused drafting until tomorrow. Change the limit in AI settings.`, perm: 'publish' });
      break;
    }
    try {
      const similar = await findSimilar(item.title, item.cves, [item.url]);
      const strong = similar.find((s) => s.score >= 0.55);
      if (strong) await proposeUpdate(item, strong);
      else if (item.source === 'CISA KEV') await handleKev(item, kevMap, settings.autopublish_official);
      else await handleNews(item, settings.min_importance);
      report.processed++;
    } catch (e) {
      await mark(item.id, 'error', (e as Error).message);
      report.notes.push((e as Error).message.slice(0, 200));
    }
  }
  return report;
}

/** Publishes stories whose scheduled time has arrived. */
export async function publishScheduled() {
  const db = createAdminClient();
  const { data } = await db.from('articles').select('id,slug,title,excerpt,severity,category,cves,entities,tags')
    .eq('status', 'scheduled').lte('scheduled_for', new Date().toISOString()).limit(20);
  for (const a of data ?? []) {
    await db.from('articles').update({ status: 'published', published_at: new Date().toISOString() }).eq('id', a.id);
    await notify('ai_published', `Scheduled story is live: ${a.title}`, { link: `/article/${a.slug}` });
    await storyPublished(a);
  }
  return data?.length ?? 0;
}

/** Urgent drafts nobody has picked up get escalated to publishers and the owner by email. */
export async function escalate() {
  const { escalation_minutes } = await getAiSettings();
  const db = createAdminClient();
  const cutoff = new Date(Date.now() - escalation_minutes * 60_000).toISOString();
  const { data } = await db.from('articles').select('id,title').eq('status', 'review').in('priority', ['high', 'breaking'])
    .is('escalated_at', null).is('claimed_by', null).lte('created_at', cutoff).limit(10);
  for (const a of data ?? []) {
    await db.from('articles').update({ escalated_at: new Date().toISOString() }).eq('id', a.id);
    await notify('escalation', `Still waiting for review after ${escalation_minutes} min: ${a.title}`, { link: `/admin/articles/${a.id}`, email: 'publishers', perm: 'publish', body: 'Nobody has picked up this urgent draft yet.' });
  }
  return data?.length ?? 0;
}
