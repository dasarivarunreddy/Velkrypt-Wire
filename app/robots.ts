import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/account', '/api', '/auth'] }], sitemap: `${SITE.url}/sitemap.xml` };
}
