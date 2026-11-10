import type { Metadata } from 'next';
import { SITE } from '@/lib/site';
export const metadata: Metadata = { title: 'About' };
export default function About() {
  return (
    <main><div className="wrap narrow">
      <h1 className="page-title">About {SITE.name}</h1>
      <div className="prose">
        <p>{SITE.name} is an independent cybersecurity news site from Velkrypt. We explain the vulnerabilities, breaches and threat campaigns that matter each week in plain language, for defenders, students and anyone who runs a system worth protecting.</p>
        <h2>How we report</h2>
        <ul>
          <li>Every story links to its original reporting or advisory.</li>
          <li>Summaries are written in our own words. We do not copy articles.</li>
          <li>Ransomware leak-site claims are not reported as confirmed breaches until the victim or an investigator confirms them.</li>
          <li>Corrections are made openly. Spot a mistake? Comment on the story.</li>
        </ul>
        <h2>Severity labels</h2>
        <ul>
          <li><strong>Critical</strong>: exploited in the wild or CVSS 9.0+. Patch today.</li>
          <li><strong>High</strong>: serious impact or active campaigns. Patch this week.</li>
          <li><strong>Medium</strong>: limited reach, or needs special conditions to exploit.</li>
          <li><strong>Info</strong>: policy, research and industry news.</li>
        </ul>
      </div>
    </div></main>
  );
}
