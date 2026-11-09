import type { Metadata } from 'next';
import StoryCard from '@/components/StoryCard';
import Notice from '@/components/Notice';
import { requireUser, isStaff } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { LIST_COLUMNS, type Article } from '@/lib/site';
import { signOut, updateDisplayName } from '@/app/actions';
import { setNewsletter } from './actions';

export const metadata: Metadata = { title: 'Your account', robots: { index: false } };

export default async function Account({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const { supabase, user, profile } = await requireUser('/account');

  const { data: saved } = await supabase.from('bookmarks').select(`created_at, articles(${LIST_COLUMNS})`).eq('user_id', user.id).order('created_at', { ascending: false });
  const savedArticles = (saved ?? []).map((b) => b.articles as unknown as Article).filter(Boolean);
  const { data: sub } = await createAdminClient().from('subscribers').select('status').eq('email', (user.email || '').toLowerCase()).maybeSingle();
  const subscribed = sub?.status === 'active';

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

      <section>
        <div className="section-head"><h2>Saved stories</h2><span>{savedArticles.length}</span></div>
        {savedArticles.length ? <div className="grid">{savedArticles.map((a) => <StoryCard key={a.id} a={a} />)}</div>
          : <p className="empty">Nothing saved yet. Use “Save for later” on any story.</p>}
      </section>

      <form action={signOut}><button className="btn ghost" type="submit">Sign out</button></form>
    </div></main>
  );
}
