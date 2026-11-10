import Link from 'next/link';
import { can, isOwner, requireStaff } from '@/lib/auth';

export const metadata = { title: 'Admin', robots: { index: false } };

async function unreadCount(supabase: Awaited<ReturnType<typeof requireStaff>>['supabase'], userId: string) {
  const since = new Date(Date.now() - 14 * 864e5).toISOString();
  const [{ data: all }, { data: read }] = await Promise.all([
    supabase.from('notifications').select('id').gte('created_at', since).limit(200),
    supabase.from('notification_reads').select('notification_id').eq('user_id', userId).limit(1000),
  ]);
  const seen = new Set((read ?? []).map((r) => r.notification_id));
  return (all ?? []).filter((n) => !seen.has(n.id)).length;
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile, supabase, user } = await requireStaff('/admin');
  const unread = await unreadCount(supabase, user.id);
  return (
    <main><div className="wrap">
      <div className="admin">
        <nav aria-label="Admin">
          <p className="kicker" style={{ marginBottom: 8 }}><span className="pill active">{profile?.role}</span></p>
          <ul>
            <li><Link href="/admin/notifications" className="bell">🔔 Notifications {unread > 0 && <b>{unread > 99 ? '99+' : unread}</b>}</Link></li>
            <li><Link href="/admin">Dashboard</Link></li>
            {can(profile, 'write') && <li><Link href="/admin/review">Review queue</Link></li>}
            {can(profile, 'write') && <li><Link href="/admin/articles">Articles</Link></li>}
            {can(profile, 'write') && <li><Link href="/admin/articles/new">Write a story</Link></li>}
            {can(profile, 'feed') && <li><Link href="/admin/feed">News feed</Link></li>}
            {can(profile, 'feed') && <li><Link href="/admin/sources">Sources</Link></li>}
            {can(profile, 'newsletter') && <li><Link href="/admin/newsletter">Newsletter</Link></li>}
            {can(profile, 'subscribers') && <li><Link href="/admin/subscribers">Subscribers</Link></li>}
            {(isOwner(profile) || can(profile, 'users')) && <li><Link href="/admin/users">{isOwner(profile) ? 'People & access' : 'Reader memberships'}</Link></li>}
            {can(profile, 'tips') && <li><Link href="/admin/tips">Reader tips</Link></li>}
            {can(profile, 'learn') && <li><Link href="/admin/ctfs">CTF calendar</Link></li>}
            {isOwner(profile) && <li><Link href="/admin/ai">AI newsroom</Link></li>}
            {isOwner(profile) && <li><Link href="/admin/audit">Audit log</Link></li>}
          </ul>
        </nav>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>{children}</div>
      </div>
    </div></main>
  );
}
