import type { Metadata } from 'next';
import { SITE } from '@/lib/site';
export const metadata: Metadata = { title: 'Terms of use' };
export default function Terms() {
  return (
    <main><div className="wrap narrow">
      <h1 className="page-title">Terms of use</h1>
      <div className="prose">
        <p>By using {SITE.name} you agree to these terms.</p>
        <h2>Information only</h2>
        <p>Our articles are general security information, not professional advice. Always verify fixes against the vendor&apos;s own advisory before acting.</p>
        <h2>Responsible use</h2>
        <p>Do not use information from this site to attack systems you do not own or have written permission to test.</p>
        <h2>Comments</h2>
        <p>Be respectful. No harassment, spam, illegal content, live exploit code or personal data about others. We may remove comments or suspend accounts that break these rules.</p>
        <h2>Membership</h2>
        <p>Memberships renew automatically until cancelled. You can cancel any time from Manage billing on your account page; access continues until the end of the paid period.</p>
      </div>
    </div></main>
  );
}
