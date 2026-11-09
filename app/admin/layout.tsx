import Link from 'next/link';
import { requireStaff } from '@/lib/auth';

export const metadata = { title: 'Admin', robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireStaff();
  return (
    <main><div className="wrap">
      <div className="admin">
        <nav aria-label="Admin">
          <ul>
            <li><Link href="/admin">Dashboard</Link></li>
            <li><Link href="/admin/articles">Articles</Link></li>
            <li><Link href="/admin/articles/new">Write a story</Link></li>
            <li><Link href="/admin/feed">News feed</Link></li>
            <li><Link href="/admin/newsletter">Newsletter</Link></li>
            <li><Link href="/admin/subscribers">Subscribers</Link></li>
            {profile?.role === 'admin' && <li><Link href="/admin/users">Users</Link></li>}
          </ul>
        </nav>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>{children}</div>
      </div>
    </div></main>
  );
}
