'use client';
import { useCallback, useRef, useState } from 'react';
import Turnstile from './Turnstile';

export default function NewsletterForm({ id = 'nl-email' }: { id?: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  const resetBot = useRef<() => void>(() => {});
  const onReset = useCallback((r: () => void) => { resetBot.current = r; }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get('email') || '');
    const turnstile = String(fd.get('cf-turnstile-response') || '');
    setState('sending');
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, turnstile }),
      });
      const data = await res.json();
      setState(res.ok ? 'done' : 'error');
      if (!res.ok) resetBot.current();
      setMsg(data.message || (res.ok ? 'Check your inbox to confirm.' : 'Something went wrong. Try again.'));
    } catch {
      setState('error');
      setMsg('Could not reach the server. Check your connection and try again.');
    }
  }

  return (
    <form className="subscribe" onSubmit={onSubmit}>
      <label htmlFor={id} className="sr-only">Email address</label>
      <input id={id} name="email" type="email" required placeholder="you@example.com" autoComplete="email" disabled={state === 'sending' || state === 'done'} />
      <button className="btn" type="submit" disabled={state === 'sending' || state === 'done'}>
        {state === 'sending' ? 'Subscribing…' : state === 'done' ? 'Subscribed' : 'Subscribe'}
      </button>
      {state !== 'done' && <Turnstile onReset={onReset} />}
      {msg && <p className="msg" role="status">{msg}</p>}
    </form>
  );
}
