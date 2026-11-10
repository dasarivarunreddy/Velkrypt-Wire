// Quality checks run on every AI draft before a human sees it. Deterministic where possible.
export type Check = { label: string; ok: boolean; note?: string };

const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);

/** Share of the draft's 8-word phrases that also appear in the source. High = too close to copying. */
export function copyOverlap(draft: string, source: string, n = 8) {
  const d = words(draft); const s = words(source);
  if (d.length < n || s.length < n) return 0;
  const set = new Set<string>();
  for (let i = 0; i + n <= s.length; i++) set.add(s.slice(i, i + n).join(' '));
  let hit = 0, total = 0;
  for (let i = 0; i + n <= d.length; i++) { total++; if (set.has(d.slice(i, i + n).join(' '))) hit++; }
  return total ? hit / total : 0;
}

const NUM = /(?:[$€£]\s?)?\d[\d,.]*\s?(?:million|billion|m|bn|k|%)?/gi;
const normNum = (x: string) => x.toLowerCase().replace(/[\s,$€£]/g, '').replace(/million$/, 'm').replace(/billion$/, 'bn');

export function runChecks(d: { title: string; body: string; cves: string[]; verification?: string | null; claims?: { claim: string; supported: boolean }[] }, sourceText: string, sourceUrl?: string | null): Check[] {
  const checks: Check[] = [];
  const src = sourceText.toUpperCase();

  const missing = d.cves.filter((c) => !src.includes(c.toUpperCase()));
  checks.push(missing.length
    ? { label: 'CVE numbers match the source', ok: false, note: `Not found in the source: ${missing.join(', ')}` }
    : { label: 'CVE numbers match the source', ok: true });

  const srcNums = new Set((sourceText.match(NUM) ?? []).map(normNum));
  const unseen = [...new Set((`${d.title} ${d.body}`.match(NUM) ?? []).map((x) => x.trim()))]
    .filter((x) => /\d{2,}|[$€£%]|million|billion|bn/i.test(x) && !/^(19|20)\d\d$/.test(x) && !/^CVE/i.test(x))
    .filter((x) => !srcNums.has(normNum(x)));
  checks.push(unseen.length
    ? { label: 'Figures match the source', ok: false, note: `Check these numbers: ${unseen.slice(0, 6).join(', ')}` }
    : { label: 'Figures match the source', ok: true });

  const overlap = copyOverlap(d.body, sourceText);
  checks.push({ label: 'Written in our own words', ok: overlap < 0.12, note: `${Math.round(overlap * 100)}% of phrases match the source${overlap >= 0.12 ? '. Rewrite the closest passages.' : ''}` });

  if (d.verification === 'claimed') {
    const t = d.title.toLowerCase();
    const assertive = /(hacked|breached|breach|stole|leaks?)\b/.test(t) && !/claim|alleg|say|report/.test(t);
    checks.push({ label: 'Unconfirmed claims are labelled as claims', ok: !assertive, note: assertive ? 'Headline states a breach as fact, but it is only claimed. Use "claims" or "says".' : undefined });
  }

  const unsupported = (d.claims ?? []).filter((c) => !c.supported);
  checks.push(unsupported.length
    ? { label: 'Every claim is backed by the source', ok: false, note: unsupported.map((c) => c.claim).slice(0, 3).join(' · ') }
    : { label: 'Every claim is backed by the source', ok: true });

  checks.push({ label: 'Source is linked', ok: !!sourceUrl });
  return checks;
}

export const checksPassed = (c: Check[]) => c.filter((x) => x.ok).length;
