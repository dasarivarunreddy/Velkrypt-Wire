import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeNext } from '@/lib/site';
import { isTrustedDevice, logEvent, markSessionVerified, requestContext, welcomeNewDevice } from '@/lib/security/device';

// Email links (confirm sign-up, reset password) land here with a one-time code.
// Clicking the link proves the person controls the inbox, so the device check is satisfied.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = safeNext(searchParams.get('next'));
  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const ctx = await requestContext();
      await markSessionVerified(supabase);
      if (await isTrustedDevice(data.user.id, ctx)) await logEvent(data.user.id, ctx, 'Signed in by email link');
      else await welcomeNewDevice(data.user.id, undefined, ctx, 'Signed in by email link (new device)');
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('That link has expired or was already used. Sign in or request a new link.')}`);
}
