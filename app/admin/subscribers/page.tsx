import { requireStaff } from '@/lib/auth';
import { formatDate } from '@/lib/site';

export const dynamic = 'force-dynamic';

export default async function Subscribers() {
  const { supabase } = await requireStaff('/admin', 'subscribers');
  const { data } = await supabase.from('subscribers').select('email,status,created_at,confirmed_at').order('created_at', { ascending: false }).limit(500);
  const active = (data ?? []).filter((s) => s.status === 'active').length;
  return (
    <>
      <div className="section-head"><h1>Subscribers</h1><a className="btn ghost small" href="/api/admin/subscribers.csv">Export CSV</a></div>
      <p className="src">{active} active of {data?.length ?? 0} total.</p>
      <div className="table-wrap"><table className="data">
        <thead><tr><th>Email</th><th>Status</th><th>Joined</th><th>Confirmed</th></tr></thead>
        <tbody>{(data ?? []).map((s) => (
          <tr key={s.email}><td>{s.email}</td><td><span className={`pill ${s.status}`}>{s.status}</span></td><td>{formatDate(s.created_at)}</td><td>{formatDate(s.confirmed_at)}</td></tr>
        ))}</tbody>
      </table></div>
    </>
  );
}
