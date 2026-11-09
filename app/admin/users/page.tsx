import { redirect } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatDate } from '@/lib/site';
import { setUserAccess } from '@/app/admin/actions';

export const dynamic = 'force-dynamic';

export default async function Users() {
  const { profile } = await requireStaff();
  if (profile?.role !== 'admin') redirect('/admin');
  const db = createAdminClient();
  const [{ data: profiles }, { data: auth }] = await Promise.all([
    db.from('profiles').select('*').order('created_at', { ascending: false }).limit(500),
    db.auth.admin.listUsers({ perPage: 1000 }),
  ]);
  const emailOf = (id: string) => auth?.users.find((u) => u.id === id)?.email ?? '';
  return (
    <>
      <div className="section-head"><h1>Users</h1><span>{profiles?.length ?? 0} accounts</span></div>
      <p className="src">Editors can write and publish. Admins can also manage users. Tick Premium to give someone free membership.</p>
      <div className="table-wrap"><table className="data">
        <thead><tr><th>User</th><th>Joined</th><th>Billing</th><th>Access</th></tr></thead>
        <tbody>{(profiles ?? []).map((p) => (
          <tr key={p.id}>
            <td><b>{p.display_name}</b><br /><span className="src">{emailOf(p.id)}</span></td>
            <td>{formatDate(p.created_at)}</td>
            <td>{p.subscription_status ?? '—'}</td>
            <td>
              <form action={setUserAccess.bind(null, p.id)} className="actions">
                <select name="role" defaultValue={p.role} aria-label="Role" style={{ width: 'auto' }}>
                  <option value="reader">reader</option><option value="editor">editor</option><option value="admin">admin</option>
                </select>
                <label className="check"><input type="checkbox" name="is_premium" defaultChecked={p.is_premium} /> Premium</label>
                <button className="btn ghost small" type="submit">Save</button>
              </form>
            </td>
          </tr>
        ))}</tbody>
      </table></div>
    </>
  );
}
