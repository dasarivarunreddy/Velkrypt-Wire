import 'server-only';
import type { NextRequest } from 'next/server';
import { SITE } from '@/lib/site';
/** Blocks cross-site form posts (CSRF) to route handlers. */
export function sameOrigin(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  return origin === req.nextUrl.origin || origin === SITE.url;
}
