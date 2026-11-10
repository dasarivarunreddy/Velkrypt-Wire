import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { markAllRead } from '@/app/admin/newsroom-actions';

export const dynamic = 'force-dynamic';
const ICON: Record<string, string> = { review: '📝', update: '🔄', ai_published: '🤖', breaking: '🔴', escalation: '⏰', system: '⚙️', tip: '💡' };
const ago = (d: string) => { const m = Math.round((Date.now() - new Date(d).getTime()) / 60000); return m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };

export default async function Notifications() {
  const { supabase, user } = await requireStaff('/admin/notifications');
  const [{ data: list }, { data: read }] = await Promise.all([
    supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(100),
    supabase.from('notification_reads').select('notification_id').eq('user_id', user.id).limit(2000),
  ]);
  const seen = new Set((read ?? []).map((r) => r.notification_id));
  return (
    <>
      <div className="section-head"><h1>Notifications</h1><form action={markAllRead}><button className="btn ghost small" type="submit">Mark all as read</button></form></div>
      <div>
        {(list ?? []).map((n) => (
          <div key={n.id} className={`notif${seen.has(n.id) ? '' : ' unread'}`}>
            <span className="ic" aria-hidden="true">{ICON[n.kind] ?? '•'}</span>
            <span>{n.link ? <Link href={n.link}><b>{n.title}</b></Link> : <b>{n.title}</b>}</span>
            <span className="src">{ago(n.created_at)}</span>
            {n.body && <p>{n.body}</p>}
          </div>
        ))}
        {!list?.length && <p className="empty">No notifications yet. AI drafts, writer submissions, breaking news and system alerts appear here.</p>}
      </div>
    </>
  );
}
