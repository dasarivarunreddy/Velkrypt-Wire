import Notice from '@/components/Notice';
import { can, isOwner, requireStaff } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatDate } from '@/lib/site';
import { PERMISSIONS, PRESETS, ROLE_INFO, isStaffRole } from '@/lib/permissions';
import { setPremium, setStaffAccess } from '@/app/admin/actions';

export const dynamic = 'force-dynamic';

type Row = { id: string; display_name: string | null; role: string; permissions: string[]; is_premium: boolean; subscription_status: string | null; created_at: string };

export default async function People({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const { profile } = await requireStaff('/admin/users');
  const owner = isOwner(profile);
  if (!owner && !can(profile, 'users')) return <Notice error="You do not have permission to manage people." />;

  const db = createAdminClient();
  const [{ data: profiles }, { data: auth }] = await Promise.all([
    db.from('profiles').select('id,display_name,role,permissions,is_premium,subscription_status,created_at').order('created_at', { ascending: false }).limit(500),
    db.auth.admin.listUsers({ perPage: 1000 }),
  ]);
  const emailOf = (id: string) => auth?.users.find((u) => u.id === id)?.email ?? '';
  const mfaOf = (id: string) => (auth?.users.find((u) => u.id === id)?.factors ?? []).some((f) => f.status === 'verified');
  const rows = (profiles ?? []) as Row[];
  const q = (sp.q || '').toLowerCase();
  const staff = rows.filter((r) => isStaffRole(r.role));
  const readers = rows.filter((r) => !isStaffRole(r.role) && (!q || `${r.display_name} ${emailOf(r.id)}`.toLowerCase().includes(q)));

  return (
    <>
      <div className="section-head"><h1>{owner ? 'People & access' : 'Reader memberships'}</h1><span>{rows.length} accounts</span></div>
      <Notice error={sp.error} message={sp.message} />

      {owner && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="section-head"><h2>Staff</h2><span>{staff.length}</span></div>
          <p className="src">Only you (the owner) can add staff or change what they can do. Changes apply instantly. Every change is written to the audit log. Staff must use two-factor to open the admin panel.</p>
          {staff.map((r) => (
            <div className="panel" key={r.id}>
              <div className="actions" style={{ justifyContent: 'space-between' }}>
                <div><b>{r.display_name || 'Unnamed'}</b> <span className="src">{emailOf(r.id)}</span></div>
                <div className="actions">
                  <span className={`pill ${mfaOf(r.id) ? 'active' : 'pending'}`}>2FA {mfaOf(r.id) ? 'on' : 'not set up'}</span>
                  <span className="pill published">{r.role}</span>
                </div>
              </div>
              {r.role === 'owner' ? (
                <p className="sub">{ROLE_INFO.owner}</p>
              ) : (
                <StaffForm row={r} />
              )}
            </div>
          ))}
        </section>
      )}

      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="section-head"><h2>Readers</h2><span>{readers.length}</span></div>
        <form className="subscribe" action="/admin/users" style={{ maxWidth: 420 }}>
          <label htmlFor="uq" className="sr-only">Search readers</label>
          <input id="uq" name="q" defaultValue={sp.q} placeholder="Search name or email" />
          <button className="btn ghost" type="submit">Search</button>
        </form>
        <div className="table-wrap"><table className="data">
          <thead><tr><th>Reader</th><th>Joined</th><th>Membership</th><th>Actions</th></tr></thead>
          <tbody>{readers.slice(0, 200).map((r) => (
            <tr key={r.id}>
              <td><b>{r.display_name}</b><br /><span className="src">{emailOf(r.id)}</span></td>
              <td>{formatDate(r.created_at)}</td>
              <td>{r.subscription_status ? `Paid · ${r.subscription_status}` : r.is_premium ? 'Free membership' : '—'}</td>
              <td>
                <div className="actions">
                  {can(profile, 'users') && !r.subscription_status && (
                    <form action={setPremium.bind(null, r.id, !r.is_premium)}><button className="btn ghost small" type="submit">{r.is_premium ? 'Remove free membership' : 'Give free membership'}</button></form>
                  )}
                  {owner && <details><summary className="btn ghost small" style={{ listStyle: 'none' }}>Make staff</summary><div style={{ paddingTop: 10, minWidth: 260 }}><StaffForm row={r} /></div></details>}
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table></div>
      </section>
    </>
  );
}

function StaffForm({ row }: { row: Row }) {
  const current = new Set(row.permissions ?? []);
  const id = row.id.slice(0, 8);
  return (
    <form className="form" action={setStaffAccess.bind(null, row.id)}>
      <label htmlFor={`role-${id}`}>Role
        <select id={`role-${id}`} name="role" defaultValue={isStaffRole(row.role) ? row.role : 'writer'}>
          <option value="writer">Writer: {ROLE_INFO.writer}</option>
          <option value="editor">Editor: {ROLE_INFO.editor}</option>
          <option value="admin">Admin: {ROLE_INFO.admin}</option>
          <option value="reader">Reader: remove all staff access</option>
        </select>
      </label>
      <label className="check" htmlFor={`preset-${id}`}><input id={`preset-${id}`} type="checkbox" name="use_preset" defaultChecked={!isStaffRole(row.role)} /> Use the standard permissions for this role</label>
      <fieldset style={{ border: '1px solid var(--line)', borderRadius: 6, padding: 12 }}>
        <legend className="src">Or choose exact permissions (untick the box above)</legend>
        <div className="row">
          {PERMISSIONS.map((p) => (
            <label key={p.key} className="check" htmlFor={`${p.key}-${id}`} title={p.help}>
              <input id={`${p.key}-${id}`} type="checkbox" name={`perm_${p.key}`} defaultChecked={current.has(p.key)} /> {p.label}
            </label>
          ))}
        </div>
      </fieldset>
      <p className="src">Standard sets: Writer = {PRESETS.writer.join(', ')} · Editor = {PRESETS.editor.join(', ')} · Admin = everything except staff management.</p>
      <div><button className="btn small" type="submit">Save access</button></div>
    </form>
  );
}
