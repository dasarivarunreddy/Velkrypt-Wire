import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { SV_COOKIE, sessionGate } from '@/lib/security/session';

// Pages a half-signed-in visitor may still open (to finish signing in or sign out).
const OPEN = ['/login', '/signup', '/auth', '/api', '/forgot-password'];

// Refreshes the Supabase session cookie on every request and keeps signed-out visitors out of private areas.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return response;

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  if (user && !OPEN.some((p) => path.startsWith(p))) {
    const gate = await sessionGate(supabase, user, request.cookies.get(SV_COOKIE)?.value);
    if (gate !== 'ok') {
      const url = request.nextUrl.clone();
      url.pathname = gate === 'mfa' ? '/login/mfa' : '/login/verify';
      url.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
      const redirect = NextResponse.redirect(url);
      response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
      return redirect;
    }
  }
  if (!user && (path.startsWith('/admin') || path.startsWith('/account'))) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|icon-192.png|icon-512.png|apple-icon.png|manifest.webmanifest|robots.txt|sitemap.xml|rss.xml|opengraph-image|.well-known|api/stripe/webhook|api/cron).*)'],
};
