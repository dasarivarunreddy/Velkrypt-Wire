'use client';
import { useEffect, useState } from 'react';

type Match = { id: string; slug: string; title: string; status: string; ai_generated: boolean; created_at: string; score: number };

const ago = (d: string) => {
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  return m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`;
};

/** Watches the headline, CVE and source fields and warns if the story already exists. */
export default function DuplicateWarning({ excludeId }: { excludeId?: string | null }) {
  const [matches, setMatches] = useState<Match[]>([]);
  useEffect(() => {
    const form = document.getElementById('article-form') as HTMLFormElement | null;
    if (!form) return;
    let timer: ReturnType<typeof setTimeout>;
    const check = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const fd = new FormData(form);
        const qs = new URLSearchParams({ title: String(fd.get('title') || ''), cves: String(fd.get('cves') || ''), url: String(fd.get('source_url') || ''), ...(excludeId ? { exclude: excludeId } : {}) });
        try {
          const res = await fetch(`/api/admin/similar?${qs}`);
          if (res.ok) setMatches((await res.json()).matches ?? []);
        } catch { /* ignore network blips */ }
      }, 600);
    };
    ['title', 'cves', 'source_url'].forEach((n) => (form.elements.namedItem(n) as HTMLInputElement | null)?.addEventListener('input', check));
    check();
    return () => ['title', 'cves', 'source_url'].forEach((n) => (form.elements.namedItem(n) as HTMLInputElement | null)?.removeEventListener('input', check));
  }, [excludeId]);

  if (!matches.length) return null;
  return (
    <div className="notice err" role="status" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <b>⚠️ This may already be covered</b>
      {matches.map((m) => (
        <div key={m.id} className="actions" style={{ justifyContent: 'space-between' }}>
          <span>&ldquo;{m.title}&rdquo; <span className="src">({m.status}{m.ai_generated ? ', written by AI' : ''}, {ago(m.created_at)})</span></span>
          <a className="btn small" href={`/admin/articles/${m.id}#updates`}>Add an update to that story</a>
        </div>
      ))}
      <span className="src">Not the same story? Carry on; this is only a warning.</span>
    </div>
  );
}
