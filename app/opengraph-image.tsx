import { ogCard, OG_SIZE } from '@/lib/og';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Velkrypt Wire: cybersecurity news, exploited vulnerabilities and free learning';
export default function Image() {
  return ogCard({ kicker: 'Cybersecurity news & threat intel', title: 'Exploited flaws, breaches, and free roadmaps into cyber.' });
}
