'use client';
import { useEffect, useRef } from 'react';

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id: string) => void;
};
declare global { interface Window { turnstile?: TurnstileApi } }

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
let loader: Promise<void> | null = null;
function loadScript() {
  loader ??= new Promise<void>((resolve) => {
    if (window.turnstile) return resolve();
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = () => resolve();
    document.head.appendChild(s);
  });
  return loader;
}

/** Cloudflare bot check. Adds a hidden "cf-turnstile-response" field to the surrounding form. Renders nothing if not configured. */
export default function Turnstile({ onReset }: { onReset?: (reset: () => void) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!SITE_KEY) return;
    let id: string | undefined;
    let gone = false;
    loadScript().then(() => {
      if (gone || !ref.current || !window.turnstile) return;
      id = window.turnstile.render(ref.current, { sitekey: SITE_KEY, theme: 'auto', size: 'flexible' });
      onReset?.(() => window.turnstile?.reset(id));
    });
    return () => { gone = true; if (id && window.turnstile) window.turnstile.remove(id); };
  }, [onReset]);
  if (!SITE_KEY) return null;
  return <div ref={ref} style={{ flexBasis: '100%', minHeight: 65 }} />;
}
