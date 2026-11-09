import { NextResponse } from 'next/server';
import { getSession, isStaff } from '@/lib/auth';

export const dynamic = 'force-dynamic';
// Quote every cell and neutralise spreadsheet formulas (CSV injection).
const cell = (v: unknown) => `"${String(v ?? '').replace(/^[=+\-@\t\r]/, "'$&").replace(/"/g, '""')}"`;

export async function GET() {
  const { supabase, profile } = await getSession();
  if (!isStaff(profile)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { data } = await supabase.from('subscribers').select('email,status,created_at,confirmed_at').order('created_at');
  const csv = ['email,status,created_at,confirmed_at', ...(data ?? []).map((r) => [r.email, r.status, r.created_at, r.confirmed_at].map(cell).join(','))].join('\n');
  return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="subscribers.csv"' } });
}
