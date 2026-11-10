import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendStaffAlert } from '@/lib/email';
import { SITE } from '@/lib/site';

type Kind = 'review' | 'update' | 'ai_published' | 'breaking' | 'escalation' | 'system' | 'tip';

/** Emails of staff who hold a permission (the owner always counts). */
export async function staffEmails(perm: string, ownerOnly = false) {
  const db = createAdminClient();
  const { data: people } = await db.from('profiles').select('id,role,permissions').in('role', ['writer', 'editor', 'admin', 'owner']);
  const ids = (people ?? []).filter((p) => p.role === 'owner' || (!ownerOnly && (p.permissions ?? []).includes(perm))).map((p) => p.id);
  if (!ids.length) return [];
  const { data } = await db.auth.admin.listUsers({ perPage: 1000 });
  return (data?.users ?? []).filter((u) => ids.includes(u.id) && u.email).map((u) => u.email!);
}

/** Adds a bell notification in the admin panel. Breaking/escalation ones are also emailed. */
export async function notify(kind: Kind, title: string, opts: { body?: string; link?: string; perm?: string; email?: 'publishers' | 'owner' } = {}) {
  const db = createAdminClient();
  await db.from('notifications').insert({ kind, title: title.slice(0, 300), body: opts.body?.slice(0, 1000) ?? null, link: opts.link ?? null, needs_perm: opts.perm ?? 'write' });
  if (opts.email) {
    const to = await staffEmails('publish', opts.email === 'owner');
    if (to.length) await sendStaffAlert(to, `${kind === 'breaking' ? '🔴 Breaking' : kind === 'escalation' ? '⏰ Waiting' : 'Velkrypt'}: ${title}`, opts.body ?? '', opts.link ? `${SITE.url}${opts.link}` : SITE.url).catch(() => null);
  }
}
