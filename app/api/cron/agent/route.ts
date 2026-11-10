import { NextResponse, type NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { escalate, publishScheduled, runAgent } from '@/lib/newsroom/agent';
import { drainNewsletterQueue } from '@/lib/email';
import { runTasks } from '@/lib/newsroom/tasks';
import '@/lib/jobs';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorised(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const got = Buffer.from(req.headers.get('authorization') || '');
  const want = Buffer.from(`Bearer ${secret}`);
  return !!secret && got.length === want.length && timingSafeEqual(got, want);
}

// Called every 5 minutes by Supabase (see supabase/schedule.sql).
export async function GET(req: NextRequest) {
  if (!authorised(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const out: Record<string, unknown> = {};
  out.scheduled = await publishScheduled().catch((e) => String(e));
  out.agent = await runAgent({ budgetMs: 40_000 }).catch((e) => String(e));
  out.escalated = await escalate().catch((e) => String(e));
  out.newsletterQueue = await drainNewsletterQueue().catch((e) => String(e));
  out.tasks = await runTasks().catch((e) => String(e)); // later phases add jobs here
  return NextResponse.json(out);
}
export const POST = GET;
