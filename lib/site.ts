export const SITE = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || 'Velkrypt Wire',
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, ''),
  tagline: 'Cybersecurity news & threat intel',
  description:
    'Plain-language cybersecurity news: exploited vulnerabilities, breaches, threat campaigns and AI security, with a daily CISA KEV watch.',
};

export const CATEGORIES = ['Vulnerabilities', 'Breaches', 'Threats', 'AI Security', 'Policy', 'Guides'] as const;
export type Category = (typeof CATEGORIES)[number];
export const SEVERITIES = ['critical', 'high', 'medium', 'info'] as const;
export type Severity = (typeof SEVERITIES)[number];

export const categorySlug = (c: string) => c.toLowerCase().replace(/\s+/g, '-');
export const categoryFromSlug = (s: string) => CATEGORIES.find((c) => categorySlug(c) === s);

export type Article = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body_md: string;
  category: Category;
  severity: Severity;
  cves: string[];
  tags: string[];
  source_name: string | null;
  source_url: string | null;
  is_premium: boolean;
  is_lead: boolean;
  status: 'draft' | 'published';
  published_at: string | null;
  updated_at: string;
};

export const LIST_COLUMNS =
  'id,slug,title,excerpt,category,severity,cves,tags,source_name,source_url,is_premium,is_lead,status,published_at,updated_at';

export function formatDate(d: string | null, long = false) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', long
    ? { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' }
    : { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/London' });
}

export function slugify(t: string) {
  return t.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80).replace(/-$/, '');
}

/** Only allow same-site relative redirects (blocks open-redirect attacks). */
export function safeNext(next: string | null | undefined, fallback = '/account') {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  return next;
}
