'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireOwner, requireStaff } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { testSource } from '@/lib/feed';
import { audit } from '@/lib/audit';

export async function testSourceAction(id: string) {
  await requireStaff('/admin/sources', 'feed');
  const { data } = await createAdminClient().from('feed_sources').select('id,name,url,kind,link_match').eq('id', id).single();
  if (!data) return;
  const r = await testSource(data);
  redirect(`/admin/sources?${r.ok ? 'message' : 'error'}=${encodeURIComponent(`${data.name}: ${r.message}`)}`);
}

export async function addSource(formData: FormData) {
  const { user, profile } = await requireOwner('/admin/sources');
  const g = (k: string) => String(formData.get(k) || '').trim();
  const row = { name: g('name').slice(0, 80), url: g('url'), kind: g('kind') === 'page' ? 'page' : 'rss', link_match: g('link_match').slice(0, 80) || null, category: ['government', 'vendor', 'news', 'research'].includes(g('category')) ? g('category') : 'news', region: g('region').slice(0, 10) || null };
  if (!row.name || !/^https:\/\//.test(row.url)) redirect('/admin/sources?error=' + encodeURIComponent('Give the source a name and an https:// link.'));
  if (row.link_match) { try { new RegExp(row.link_match); } catch { redirect('/admin/sources?error=' + encodeURIComponent('The link pattern is not valid.')); } }
  const { data, error } = await createAdminClient().from('feed_sources').insert(row).select('id,name,url,kind,link_match').single();
  if (error) redirect('/admin/sources?error=' + encodeURIComponent(error.message.includes('unique') ? 'A source with that name already exists.' : error.message));
  await audit({ id: user.id, name: profile?.display_name }, 'Added news source', row.name, { url: row.url });
  const r = await testSource(data!);
  redirect(`/admin/sources?${r.ok ? 'message' : 'error'}=${encodeURIComponent(`Added ${row.name}. ${r.message}`)}`);
}

export async function toggleSource(id: string, enabled: boolean) {
  const { user, profile } = await requireOwner('/admin/sources');
  const { data } = await createAdminClient().from('feed_sources').update({ enabled }).eq('id', id).select('name').single();
  await audit({ id: user.id, name: profile?.display_name }, enabled ? 'Enabled news source' : 'Disabled news source', data?.name ?? id);
  revalidatePath('/admin/sources');
}

export async function deleteSource(id: string) {
  const { user, profile } = await requireOwner('/admin/sources');
  const { data } = await createAdminClient().from('feed_sources').delete().eq('id', id).select('name').single();
  await audit({ id: user.id, name: profile?.display_name }, 'Removed news source', data?.name ?? id);
  revalidatePath('/admin/sources');
}
