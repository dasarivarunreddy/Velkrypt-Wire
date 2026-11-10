import type { Metadata } from 'next';
import Link from 'next/link';
import { getSession, can } from '@/lib/auth';
import { toggleReminder } from '@/app/learn/actions';

export const metadata: Metadata = { title: 'Upcoming CTF competitions', description: 'Hand-picked upcoming and live capture-the-flag competitions, with beginner and UK student picks and email reminders.' };
export const dynamic = 'force-dynamic';

type Ev = { id: string; name: string; url: string; ctftime_url: string | null; format: string; location: string; level: string; starts_at: string; ends_at: string; student_friendly: boolean; uk: boolean; note: string | null };
const fmt = (d: string) => new Date(d).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });

export default async function Ctfs({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const sp = await searchParams;
  const { supabase, user, profile } = await getSession();
  const now = new Date().toISOString();
  const { data } = await supabase.from('ctf_events').select('*').gte('ends_at', now).order('starts_at').limit(100);
  const { data: mine } = user ? await supabase.from('ctf_reminders').select('event_id').eq('user_id', user.id) : { data: [] };
  const reminded = new Set((mine ?? []).map((m) => m.event_id));
  let events = (data ?? []) as Ev[];
  if (sp.filter === 'beginner') events = events.filter((e) => e.level === 'beginner');
  if (sp.filter === 'students') events = events.filter((e) => e.student_friendly);
  if (sp.filter === 'uk') events = events.filter((e) => e.uk);
  const live = events.filter((e) => e.starts_at <= now);
  const upcoming = events.filter((e) => e.starts_at > now);

  const Row = ({ e }: { e: Ev }) => (
    <div className="ctf">
      <div>
        <div className="kicker"><span>{e.format}</span><span>{e.location}</span><span>{e.level}</span>{e.student_friendly && <span className="chip">Students</span>}{e.uk && <span className="chip">UK</span>}</div>
        <h3><a href={e.url} target="_blank" rel="noopener noreferrer">{e.name} ↗</a></h3>
        <div className="when">{fmt(e.starts_at)} → {fmt(e.ends_at)} UK time</div>
        {e.note && <p className="src" style={{ margin: '4px 0 0' }}>{e.note}</p>}
      </div>
      <div className="actions" style={{ alignItems: 'flex-start' }}>
        <a className="btn ghost small" href={`/api/ctf/${e.id}`}>Add to calendar</a>
        {e.starts_at > now && (user
          ? <form action={toggleReminder.bind(null, e.id)}><button className={`btn small${reminded.has(e.id) ? '' : ' ghost'}`} type="submit">{reminded.has(e.id) ? '🔔 Reminder on' : 'Remind me'}</button></form>
          : <Link className="btn ghost small" href="/login?next=/ctfs">Remind me</Link>)}
      </div>
    </div>
  );

  return (
    <main><div className="wrap narrow">
      <p className="kicker"><Link href="/learn">Learn</Link><span>CTFs</span></p>
      <h1 className="page-title">CTF calendar</h1>
      <p className="lede">Hand-picked capture-the-flag competitions. Not sure where to start? Pick a beginner event, find a team, and just have a go.</p>
      <div className="filters-bar">
        <a href="/ctfs" aria-current={!sp.filter}>All</a><a href="/ctfs?filter=beginner" aria-current={sp.filter === 'beginner'}>Beginner-friendly</a>
        <a href="/ctfs?filter=students" aria-current={sp.filter === 'students'}>Students</a><a href="/ctfs?filter=uk" aria-current={sp.filter === 'uk'}>UK</a>
        {can(profile, 'learn') && <Link className="btn ghost small" href="/admin/ctfs">Manage events</Link>}
      </div>
      {live.length > 0 && <section><div className="section-head"><h2><span className="live">●</span> Live now</h2></div>{live.map((e) => <Row key={e.id} e={e} />)}</section>}
      <section>
        <div className="section-head"><h2>Upcoming</h2><span>{upcoming.length}</span></div>
        {upcoming.map((e) => <Row key={e.id} e={e} />)}
        {!upcoming.length && <p className="empty">No upcoming events listed yet. Meanwhile, practise on <a href="https://picoctf.org" target="_blank" rel="noopener noreferrer">picoCTF</a> or browse the full global calendar on <a href="https://ctftime.org" target="_blank" rel="noopener noreferrer">CTFtime</a>.</p>}
      </section>
      <p className="src">The global CTF calendar is run by <a href="https://ctftime.org" target="_blank" rel="noopener noreferrer">CTFtime</a>. We highlight a selection and link to each event&apos;s official page.</p>
    </div></main>
  );
}
