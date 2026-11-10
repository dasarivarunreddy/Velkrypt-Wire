import { NextResponse } from 'next/server';
import { can, getAal, getSession } from '@/lib/auth';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
// Quote every cell and neutralise spreadsheet formulas (CSV injection).
const cell = (v: unknown) => `"${String(v ?? '').replace(/^[=+\-@\t\r]/, "'$&").replace(/"/g, '""')}"`;

export async function GET() {
  const { supabase, user, profile } = await getSession();
  if (!user || !can(profile, 'subscribers') || (await getAal()).current !== 'aal2') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { data } = await supabase.from('subscribers').select('email,status,created_at,confirmed_at').order('created_at');
  await audit({ id: user.id, name: profile?.display_name }, 'Exported subscribers', null, { rows: data?.length ?? 0 });
  const csv = ['email,status,created_at,confirmed_at', ...(data ?? []).map((r) => [r.email, r.status, r.created_at, r.confirmed_at].map(cell).join(','))].join('\n');
  return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="subscribers.csv"' } });
}
