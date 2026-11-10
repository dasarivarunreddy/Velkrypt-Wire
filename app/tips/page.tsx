import type { Metadata } from 'next';
import Notice from '@/components/Notice';
import Turnstile from '@/components/Turnstile';
import { sendTip } from './actions';

export const metadata: Metadata = { title: 'Send us a tip', description: 'Tell Velkrypt Wire about a breach, vulnerability or security story. Anonymous tips welcome.' };

export default async function TipsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  return (
    <main><div className="wrap narrow">
      <h1 className="page-title">Send us a tip</h1>
      <p className="lede">Know about a breach, an exploited flaw or a security story we should cover? Tell us. You can stay anonymous.</p>
      {sp.sent ? <Notice message="Thank you. Your tip reached the newsroom. We verify every tip independently before reporting." /> : (
        <>
          <Notice error={sp.error} />
          <form className="form" action={sendTip}>
            <label htmlFor="message">What should we know?<textarea id="message" name="message" required minLength={10} maxLength={5000} style={{ minHeight: 180 }} /></label>
            <label htmlFor="link">Link to evidence (optional)<input id="link" name="link" type="url" placeholder="https://" /></label>
            <label htmlFor="contact">How can we reach you? (optional: email, Signal username)<input id="contact" name="contact" maxLength={200} /></label>
            <Turnstile />
            <div><button className="btn" type="submit">Send tip</button></div>
          </form>
        </>
      )}
      <div className="prose" style={{ marginTop: 24 }}>
        <h2>How we protect you</h2>
        <ul>
          <li>We do not store your IP address with your tip.</li>
          <li>Contact details are optional, and only newsroom staff can read tips.</li>
          <li>We never name a source without permission.</li>
          <li>For highly sensitive material, leave a Signal username and we will contact you there instead of email.</li>
        </ul>
        <p>Please don&apos;t send stolen personal data or live exploit code. Describe what you have and we will talk.</p>
      </div>
    </div></main>
  );
}
