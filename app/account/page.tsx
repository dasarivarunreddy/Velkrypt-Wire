import type { Metadata } from 'next';
import StoryCard from '@/components/StoryCard';
import Notice from '@/components/Notice';
import { requireUser, isStaff } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { LIST_COLUMNS, formatDate, type Article } from '@/lib/site';
import Link from 'next/link';
import { ROADMAPS } from '@/lib/learn/roadmaps';
import { signOut, signOutEverywhere, updateAuthorProfile, updateDisplayName } from '@/app/actions';
import { setNewsletter } from './actions';

export const metadata: Metadata = { title: 'Your account', robots: { index: false } };

export default async function Account({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const { supabase, user, profile } = await requireUser('/account');

  const { data: saved } = await supabase.from('bookmarks').select(`created_at, articles(${LIST_COLUMNS})`).eq('user_id', user.id).order('created_at', { ascending: false });
  const savedArticles = (saved ?? []).map((b) => b.articles as unknown as Article).filter(Boolean);
  const { data: sub } = await createAdminClient().from('subscribers').select('status').eq('email', (user.email || '').toLowerCase()).maybeSingle();
  const subscribed = sub?.status === 'active';
  const [{ data: mfa }, { data: history }] = await Promise.all([
    supabase.auth.mfa.listFactors(),
    supabase.from('login_events').select('event,ip,country,city,device,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
  ]);
  const twoFactorOn = (mfa?.totp ?? []).some((f) => f.status === 'verified');
  const maskIp = (ip: string | null) => !ip ? '—' : ip.includes(':') ? ip.split(':').slice(0, 3).join(':') + ':…' : ip.split('.').slice(0, 2).join('.') + '.x.x';

  return (
    <main><div className="wrap">
      <div className="section-head"><h1>Your account</h1><span>{user.email}</span></div>
      <Notice message={sp.message} error={sp.error} />
      <div className="cards">
        <section className="panel">
          <h3>Profile</h3>
          <form className="form" action={updateDisplayName}>
            <label htmlFor="display_name">Display name (shown on comments)
              <input id="display_name" name="display_name" defaultValue={profile?.display_name ?? ''} maxLength={60} />
            </label>
            <div><button className="btn small" type="submit">Save</button></div>
          </form>
        </section>

        <section className="panel">
          <h3>Membership</h3>
          {profile?.is_premium || isStaff(profile) ? (
            <>
              <p className="sub">{isStaff(profile) ? `Staff account (${profile?.role}). Premium content is unlocked.` : `Active member${profile?.subscription_status ? ` · ${profile.subscription_status}` : ''}.`}</p>
              {profile?.stripe_customer_id && (
                <form action="/api/stripe/portal" method="post"><button className="btn ghost small" type="submit">Manage billing</button></form>
              )}
            </>
          ) : (
            <>
              <p className="sub">Free account. Members unlock in-depth analysis on every story.</p>
              <form action="/api/stripe/checkout" method="post"><button className="btn small" type="submit">Become a member</button></form>
            </>
          )}
        </section>

        <section className="panel">
          <h3>Newsletter</h3>
          <p className="sub">{subscribed ? 'You receive the Weekly Wire at your account email.' : 'You are not subscribed to the Weekly Wire.'}</p>
          <form action={setNewsletter.bind(null, !subscribed)}>
            <button className={`btn small${subscribed ? ' ghost' : ''}`} type="submit">{subscribed ? 'Unsubscribe' : 'Subscribe'}</button>
          </form>
        </section>
      </div>

      {isStaff(profile) && (
        <form className="panel form" action={updateAuthorProfile}>
          <h3>Author profile</h3>
          <p className="sub">Shown on your public author page and next to your stories. Real, credible authors help readers trust the site and help Google rank it.</p>
          <label htmlFor="job_title">Title<input id="job_title" name="job_title" maxLength={80} defaultValue={(profile as Record<string, string | null> | null)?.job_title ?? ''} placeholder="Founder & Editor · Penetration Tester" /></label>
          <label htmlFor="bio">Short bio<textarea id="bio" name="bio" maxLength={600} defaultValue={(profile as Record<string, string | null> | null)?.bio ?? ''} /></label>
          <div className="row">
            <label htmlFor="linkedin">LinkedIn URL<input id="linkedin" name="linkedin" type="url" defaultValue={(profile as Record<string, string | null> | null)?.linkedin ?? ''} placeholder="https://www.linkedin.com/in/..." /></label>
            <label htmlFor="website">Website<input id="website" name="website" type="url" defaultValue={(profile as Record<string, string | null> | null)?.website ?? ''} /></label>
          </div>
          <div className="actions"><button className="btn small" type="submit">Save author profile</button><Link className="src" href={`/author/${user.id}`}>View my author page</Link></div>
        </form>
      )}
      <section className="panel"><h3>Stack Watch</h3><p className="sub">Get an email when products you use have an exploited flaw or a news story.</p><div><Link className="btn small" href="/account/watch">Manage Stack Watch</Link></div></section>
      <MyLearning supabase={supabase} userId={user.id} />

      <section className="panel" aria-labelledby="sec-h">
        <h3 id="sec-h">Security</h3>
        <div className="actions">
          <span>Two-factor authentication: <span className={`pill ${twoFactorOn ? 'active' : 'pending'}`}>{twoFactorOn ? 'On' : 'Off'}</span></span>
          <Link className="btn small" href="/account/security">{twoFactorOn ? 'Manage' : 'Turn on'}</Link>
        </div>
        <p className="sub">New devices must enter a code we email you, and you get an alert whenever a new device signs in.</p>
        <h3 style={{ fontSize: '1.1rem', marginTop: 8 }}>Recent sign-in activity</h3>
        <div className="table-wrap"><table className="data">
          <thead><tr><th>When</th><th>What</th><th>Device</th><th>Where</th><th>IP</th></tr></thead>
          <tbody>{(history ?? []).map((h, i) => (
            <tr key={i}>
              <td style={{ whiteSpace: 'nowrap' }}>{formatDate(h.created_at)} {new Date(h.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' })}</td>
              <td>{h.event}</td><td>{h.device}</td><td>{[h.city, h.country].filter(Boolean).join(', ') || '—'}</td><td>{maskIp(h.ip)}</td>
            </tr>
          ))}</tbody>
        </table></div>
        {!history?.length && <p className="sub">No sign-ins recorded yet.</p>}
        <p className="sub">Don&apos;t recognise something? Reset your password, then sign out everywhere.</p>
        <form action={signOutEverywhere}><button className="btn danger small" type="submit">Sign out everywhere</button></form>
      </section>

      <section>
        <div className="section-head"><h2>Saved stories</h2><span>{savedArticles.length}</span></div>
        {savedArticles.length ? <div className="grid">{savedArticles.map((a) => <StoryCard key={a.id} a={a} />)}</div>
          : <p className="empty">Nothing saved yet. Use “Save for later” on any story.</p>}
      </section>

      <form action={signOut}><button className="btn ghost" type="submit">Sign out</button></form>
    </div></main>
  );
}

async function MyLearning({ supabase, userId }: { supabase: Awaited<ReturnType<typeof requireUser>>['supabase']; userId: string }) {
  const { data } = await supabase.from('user_progress').select('item').eq('user_id', userId);
  const done = new Set((data ?? []).map((d) => d.item));
  const started = ROADMAPS.map((r) => ({ r, n: r.steps.filter((s) => done.has(s.id)).length })).filter((x) => x.n > 0);
  return (
    <section className="panel" aria-labelledby="learn-h">
      <h3 id="learn-h">My learning</h3>
      {started.length ? started.map(({ r, n }) => (
        <div key={r.slug}>
          <Link href={`/learn/roadmaps/${r.slug}`}><b>{r.title}</b></Link> <span className="src">{n}/{r.steps.length} steps</span>
          <div className="progress" style={{ marginTop: 4 }}><span style={{ width: `${(n / r.steps.length) * 100}%` }} /></div>
        </div>
      )) : <p className="sub">You haven&apos;t started a roadmap yet. <Link href="/learn">Pick one</Link> and tick off steps as you go.</p>}
    </section>
  );
}
