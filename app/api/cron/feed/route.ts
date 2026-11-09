import { NextResponse, type NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { runFeed } from '@/lib/feed';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Vercel Cron calls this daily (see vercel.json) with Authorization: Bearer $CRON_SECRET.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const got = Buffer.from(req.headers.get('authorization') || '');
  const want = Buffer.from(`Bearer ${secret}`);
  if (!secret || got.length !== want.length || !timingSafeEqual(got, want)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json(await runFeed());
}
