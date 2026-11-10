import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SITE } from '@/lib/site';

const ics = (d: string) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const esc = (s: string) => s.replace(/[\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');

// "Add to calendar" file for a CTF event.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { data: e } = await (await createClient()).from('ctf_events').select('*').eq('id', id).maybeSingle();
  if (!e) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:-//${SITE.name}//CTF//EN`, 'BEGIN:VEVENT', `UID:${e.id}@velkrypt`, `DTSTAMP:${ics(new Date().toISOString())}`,
    `DTSTART:${ics(e.starts_at)}`, `DTEND:${ics(e.ends_at)}`, `SUMMARY:${esc(e.name)}`, `DESCRIPTION:${esc(`${e.format} CTF · ${e.location}\n${e.url}`)}`, `URL:${e.url}`,
    'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', `DESCRIPTION:${esc(e.name)} starts in 1 hour`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  return new NextResponse(body, { headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': `attachment; filename="${e.name.replace(/[^a-z0-9]+/gi, '-').slice(0, 40)}.ics"` } });
}
