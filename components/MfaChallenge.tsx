'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cancelSignIn, completeMfa } from '@/app/auth/actions';

type Factor = { id: string; friendly_name?: string };

export default function MfaChallenge({ next }: { next: string }) {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [factorId, setFactorId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    createClient().auth.mfa.listFactors().then(({ data }) => {
      const list = (data?.totp ?? []).filter((f) => f.status === 'verified');
      setFactors(list);
      setFactorId(list[0]?.id ?? '');
    });
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get('code') || '').replace(/\D/g, '');
    setBusy(true); setError('');
    const { error } = await createClient().auth.mfa.challengeAndVerify({ factorId, code });
    if (error) {
      setBusy(false);
      setError(error.message.toLowerCase().includes('rate') ? 'Too many tries. Wait a minute and try again.' : 'That code is not right. Codes change every 30 seconds; use the current one.');
      return;
    }
    await completeMfa(next);
  }

  return (
    <>
      {error && <p className="notice err" role="alert">{error}</p>}
      <form className="form" onSubmit={submit}>
        {factors.length > 1 && (
          <label htmlFor="factor">Authenticator
            <select id="factor" value={factorId} onChange={(e) => setFactorId(e.target.value)}>
              {factors.map((f) => <option key={f.id} value={f.id}>{f.friendly_name || 'Authenticator'}</option>)}
            </select>
          </label>
        )}
        <label htmlFor="code">6-digit code
          <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required autoFocus
            style={{ fontFamily: 'var(--mono)', fontSize: '1.6rem', letterSpacing: '.4em', textAlign: 'center' }} />
        </label>
        <button className="btn" type="submit" disabled={busy || !factorId}>{busy ? 'Checking…' : 'Verify'}</button>
      </form>
      <form action={cancelSignIn}><button className="btn ghost small" type="submit">Cancel and sign out</button></form>
      <p className="src">Lost your phone? Use a backup authenticator if you added one. Otherwise contact the site owner to reset two-factor on your account.</p>
    </>
  );
}
