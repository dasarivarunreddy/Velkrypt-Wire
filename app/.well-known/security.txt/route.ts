import { SITE } from '@/lib/site';
// RFC 9116 security contact, expected on a security news site.
export function GET() {
  const expires = new Date(Date.now() + 180 * 864e5).toISOString();
  const lines = [`Contact: ${SITE.url}/tips`, ...(process.env.CONTACT_EMAIL ? [`Contact: mailto:${process.env.CONTACT_EMAIL}`] : []), `Expires: ${expires}`, 'Preferred-Languages: en', `Canonical: ${SITE.url}/.well-known/security.txt`, `Policy: ${SITE.url}/contact`];
  return new Response(lines.join('\n') + '\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
