import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { registerTask } from '@/lib/newsroom/tasks';
import { sendCtfReminder } from '@/lib/email';
import { RESOURCES } from './resources';
import { UK_SCHEMES } from './careers';
import { CERTS } from './certs';

const ALL_LINKS = [...RESOURCES.map((r) => r.url), ...UK_SCHEMES.map((s) => s.url), ...CERTS.map((c) => c.url)];

/** Re-checks a few directory links per run, so each one is verified about once a week. */
async function checkLinks() {
  const db = createAdminClient();
  const { data } = await db.from('link_checks').select('url,checked_at');
  const last = new Map((data ?? []).map((r) => [r.url, new Date(r.checked_at).getTime()]));
  const due = ALL_LINKS.filter((u) => !last.has(u) || Date.now() - last.get(u)! > 7 * 864e5).slice(0, 4);
  for (const url of due) {
    let ok = false, status = 0;
    try {
      const res = await fetch(url, { method: 'GET', redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VelkryptWire-linkcheck/1.0)' }, signal: AbortSignal.timeout(10000) });
      status = res.status; ok = res.status < 400 || res.status === 403 || res.status === 429; // 403/429 = bot protection, not a dead link
    } catch { ok = false; }
    await db.from('link_checks').upsert({ url, ok, status, checked_at: new Date().toISOString() });
  }
  return due.length;
}

/** Emails people who asked to be reminded about a CTF that starts within 24 hours. */
async function ctfReminders() {
  const db = createAdminClient();
  const soon = new Date(Date.now() + 24 * 3600e3).toISOString();
  const { data: events } = await db.from('ctf_events').select('id,name,url,starts_at,format,location').gt('starts_at', new Date().toISOString()).lte('starts_at', soon);
  let sent = 0;
  for (const e of events ?? []) {
    const { data: rem } = await db.from('ctf_reminders').select('user_id').eq('event_id', e.id).is('sent_at', null).limit(40);
    if (!rem?.length) continue;
    const { data: users } = await db.auth.admin.listUsers({ perPage: 1000 });
    for (const r of rem) {
      const email = users?.users.find((u) => u.id === r.user_id)?.email;
      if (email) { await sendCtfReminder(email, e).catch(() => null); sent++; }
      await db.from('ctf_reminders').update({ sent_at: new Date().toISOString() }).eq('user_id', r.user_id).eq('event_id', e.id);
    }
  }
  return sent;
}

registerTask({ name: 'linkCheck', run: checkLinks });
registerTask({ name: 'ctfReminders', run: ctfReminders });
