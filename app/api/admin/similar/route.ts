import { NextResponse, type NextRequest } from 'next/server';
import { can, getAal, getSession } from '@/lib/auth';
import { findSimilar } from '@/lib/newsroom/similar';

export const dynamic = 'force-dynamic';

// Live "already covered?" check used by the story editor as you type.
export async function GET(req: NextRequest) {
  const { user, profile } = await getSession();
  if (!user || !can(profile, 'write') || (await getAal()).current !== 'aal2') return NextResponse.json({ matches: [] }, { status: 403 });
  const sp = req.nextUrl.searchParams;
  const title = (sp.get('title') || '').slice(0, 200);
  const cves = (sp.get('cves') || '').toUpperCase().match(/CVE-\d{4}-\d{4,}/g) ?? [];
  const url = (sp.get('url') || '').slice(0, 500);
  if (title.length < 12 && !cves.length && !url) return NextResponse.json({ matches: [] });
  const matches = await findSimilar(title, cves, url ? [url] : [], sp.get('exclude'));
  return NextResponse.json({ matches: matches.filter((m) => m.score >= 0.4) });
}
