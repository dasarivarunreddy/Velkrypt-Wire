import ArticleForm from '@/components/ArticleForm';
import Notice from '@/components/Notice';
import { can, requireStaff } from '@/lib/auth';

export default async function NewArticle({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const { supabase, profile } = await requireStaff('/admin', 'write');
  let draft = {};
  if (sp.feed && can(profile, 'feed')) {
    const { data: f } = await supabase.from('feed_items').select('*').eq('id', sp.feed).maybeSingle();
    if (f) draft = {
      feed_id: f.id, title: f.title, cves: f.cves, source_name: f.source, source_url: f.url,
      severity: f.source === 'CISA KEV' ? 'critical' : 'high', category: f.source === 'CISA KEV' ? 'Vulnerabilities' : undefined,
      body_md: `Write the story here in your own words: what happened, who is affected and what readers should do.\n\nSource notes (delete before publishing): ${f.summary ?? ''}\n\n### What to do\n\n- \n\n*Original reporting: [${f.source}](${f.url})*`,
    };
  }
  return (
    <>
      <div className="section-head"><h1>Write a story</h1></div>
      <Notice error={sp.error} />
      <ArticleForm article={draft} canPublish={can(profile, 'publish')} />
    </>
  );
}
