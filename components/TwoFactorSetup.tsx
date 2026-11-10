'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Factor = { id: string; friendly_name?: string; status: string; created_at: string };
type Enrolling = { id: string; qr: string; secret: string };

export default function TwoFactorSetup({ required }: { required: boolean }) {
  const router = useRouter();
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [enrolling, setEnrolling] = useState<Enrolling | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await createClient().auth.mfa.listFactors();
    setFactors(((data?.all ?? []) as Factor[]).filter((f) => f.status === 'verified' && (f as { factor_type?: string }).factor_type === 'totp'));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function start(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get('name') || '').trim() || 'Authenticator app';
    setBusy(true); setMsg(null);
    const supabase = createClient();
    // Clear any half-finished setups first.
    const { data } = await supabase.auth.mfa.listFactors();
    for (const f of (data?.all ?? []) as Factor[]) if (f.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data: en, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `${name} (${new Date().toLocaleDateString('en-GB')})`, issuer: 'Velkrypt Wire' });
    setBusy(false);
    if (error || !en) return setMsg({ kind: 'err', text: error?.message || 'Could not start setup. Check that TOTP is enabled in Supabase.' });
    setEnrolling({ id: en.id, qr: en.totp.qr_code, secret: en.totp.secret });
  }

  async function confirm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!enrolling) return;
    const code = String(new FormData(e.currentTarget).get('code') || '').replace(/\D/g, '');
    setBusy(true);
    const { error } = await createClient().auth.mfa.challengeAndVerify({ factorId: enrolling.id, code });
    setBusy(false);
    if (error) return setMsg({ kind: 'err', text: 'That code is not right. Use the current code shown in your app.' });
    setEnrolling(null);
    setMsg({ kind: 'ok', text: 'Two-factor authentication is on. You will be asked for a code each time you sign in.' });
    await load();
    router.refresh();
  }

  async function remove(id: string) {
    setBusy(true); setMsg(null);
    const { error } = await createClient().auth.mfa.unenroll({ factorId: id });
    setBusy(false);
    if (error) return setMsg({ kind: 'err', text: 'To remove an authenticator, sign out and sign back in with a code first.' });
    setMsg({ kind: 'ok', text: 'Authenticator removed.' });
    await load();
    router.refresh();
  }

  const on = (factors?.length ?? 0) > 0;
  return (
    <div className="form">
      {required && !on && <p className="notice err">Admin and editor accounts must use two-factor authentication. Set it up below to open the admin panel.</p>}
      {msg && <p className={`notice ${msg.kind}`} role="status">{msg.text}</p>}
      <p><span className={`pill ${on ? 'active' : 'pending'}`}>{factors === null ? 'Checking…' : on ? 'On' : 'Off'}</span></p>

      {on && (
        <div className="table-wrap"><table className="data">
          <thead><tr><th>Authenticator</th><th></th></tr></thead>
          <tbody>{factors!.map((f) => (
            <tr key={f.id}><td>{f.friendly_name || 'Authenticator app'}</td>
              <td><button className="btn ghost small" type="button" disabled={busy} onClick={() => remove(f.id)}>Remove</button></td></tr>
          ))}</tbody>
        </table></div>
      )}

      {!enrolling ? (
        <form className="form" onSubmit={start}>
          <label htmlFor="name">{on ? 'Add a backup authenticator (e.g. a second phone)' : 'Name this device'}
            <input id="name" name="name" maxLength={40} placeholder="My phone" />
          </label>
          <div><button className="btn" type="submit" disabled={busy}>{on ? 'Add backup authenticator' : 'Set up two-factor'}</button></div>
        </form>
      ) : (
        <div className="panel">
          <h3>Scan this code</h3>
          <ol className="list-plain">
            <li>Open Google Authenticator, Microsoft Authenticator, Authy or 1Password.</li>
            <li>Add an account and scan the QR code.</li>
            <li>Type the 6-digit code it shows.</li>
          </ol>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enrolling.qr} alt="QR code for your authenticator app" width={200} height={200} style={{ background: '#fff', padding: 8, borderRadius: 6 }} />
          <p className="src">Can&apos;t scan? Enter this key instead: <code style={{ fontFamily: 'var(--mono)', wordBreak: 'break-all' }}>{enrolling.secret}</code></p>
          <form className="form" onSubmit={confirm}>
            <label htmlFor="code">6-digit code
              <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required autoFocus
                style={{ fontFamily: 'var(--mono)', fontSize: '1.4rem', letterSpacing: '.3em' }} />
            </label>
            <div className="actions">
              <button className="btn" type="submit" disabled={busy}>Turn on two-factor</button>
              <button className="btn ghost" type="button" onClick={() => setEnrolling(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
