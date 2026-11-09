import 'server-only';
// Small in-memory limiter per server instance. Good enough to slow down form spam;
// use a shared store (e.g. Upstash Redis) if the site grows large.
const hits = new Map<string, number[]>();
export function rateLimit(key: string, limit = 5, windowMs = 60 * 60 * 1000) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length <= limit;
}
