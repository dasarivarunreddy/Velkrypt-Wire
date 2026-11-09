import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import { SITE, CATEGORIES, categorySlug } from '@/lib/site';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = ['', '/about', '/newsletter', '/membership'].map((p) => ({ url: `${SITE.url}${p}` }))
    .concat(CATEGORIES.map((c) => ({ url: `${SITE.url}/category/${categorySlug(c)}` })));
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return pages;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data } = await supabase.from('articles').select('slug,updated_at').eq('status', 'published').order('published_at', { ascending: false }).limit(5000);
  return pages.concat((data ?? []).map((a) => ({ url: `${SITE.url}/article/${a.slug}`, lastModified: a.updated_at })));
}
