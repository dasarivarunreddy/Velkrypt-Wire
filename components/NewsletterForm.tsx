'use client';
import { useState } from 'react';

export default function NewsletterForm({ id = 'nl-email' }: { id?: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get('email') || '');
    setState('sending');
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setState(res.ok ? 'done' : 'error');
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
      {msg && <p className="msg" role="status">{msg}</p>}
    </form>
  );
}
