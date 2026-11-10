import type { Metadata } from 'next';
import { SITE } from '@/lib/site';
export const metadata: Metadata = { title: 'Privacy policy' };
export default function Privacy() {
  return (
    <main><div className="wrap narrow">
      <h1 className="page-title">Privacy policy</h1>
      <div className="prose">
        <p>This policy explains what {SITE.name} collects and why. We are based in the United Kingdom and follow UK GDPR.</p>
        <h2>What we collect</h2>
        <ul>
          <li><strong>Account</strong>: your email, display name and a securely hashed password (handled by Supabase).</li>
          <li><strong>Newsletter</strong>: your email and whether you confirmed or unsubscribed.</li>
          <li><strong>Membership</strong>: payment is handled by Stripe. We never see or store your card details; we store your Stripe customer ID and subscription status.</li>
          <li><strong>Content you post</strong>: comments and saved stories.</li>
          <li><strong>Security logs</strong>: when you sign in, we record the time, browser, approximate location and IP address to detect suspicious sign-ins and show you your recent activity. These are deleted after 90 days.</li>
          <li><strong>Trusted devices</strong>: a cookie remembers browsers you have verified, for 30 days.</li>
        </ul>
        <h2>What we do not do</h2>
        <p>We do not sell your data, run advertising trackers or share your email with third parties for marketing.</p>
        <h2>Cookies</h2>
        <p>We use only essential cookies to keep you signed in and to remember devices you have verified. Forms are protected by Cloudflare Turnstile, which checks for bots without tracking you across sites. No analytics or advertising cookies.</p>
        <h2>Your rights</h2>
        <p>You can update your details from your account page, unsubscribe from any email with one click, and ask us to export or delete your data at any time by contacting us through the site.</p>
        <h2>Processors</h2>
        <p>Supabase (database and accounts), Resend (email delivery), Stripe (payments), Cloudflare (bot protection) and Vercel (hosting).</p>
      </div>
    </div></main>
  );
}
