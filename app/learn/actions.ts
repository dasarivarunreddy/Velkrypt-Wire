'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getSession, requireStaff } from '@/lib/auth';
import { audit } from '@/lib/audit';

export async function toggleStep(item: string, path: string) {
  const { supabase, user } = await getSession();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  const { data } = await supabase.from('user_progress').select('item').eq('user_id', user.id).eq('item', item).maybeSingle();
  if (data) await supabase.from('user_progress').delete().eq('user_id', user.id).eq('item', item);
  else await supabase.from('user_progress').insert({ user_id: user.id, item: item.slice(0, 60) });
  revalidatePath(path);
  revalidatePath('/account');
}

export async function toggleReminder(eventId: string) {
  const { supabase, user } = await getSession();
  if (!user) redirect('/login?next=/ctfs');
  const { data } = await supabase.from('ctf_reminders').select('event_id').eq('user_id', user.id).eq('event_id', eventId).maybeSingle();
  if (data) await supabase.from('ctf_reminders').delete().eq('user_id', user.id).eq('event_id', eventId);
  else await supabase.from('ctf_reminders').insert({ user_id: user.id, event_id: eventId });
  revalidatePath('/ctfs');
}

export async function saveCtf(formData: FormData) {
  const { supabase, user, profile } = await requireStaff('/admin/ctfs', 'learn');
  const g = (k: string) => String(formData.get(k) || '').trim();
  const row = {
    name: g('name'), url: g('url'), ctftime_url: g('ctftime_url') || null, format: g('format') || 'Jeopardy', location: g('location') || 'Online',
    level: g('level') || 'beginner', starts_at: new Date(g('starts_at')).toISOString(), ends_at: new Date(g('ends_at')).toISOString(),
    student_friendly: formData.get('student_friendly') === 'on', uk: formData.get('uk') === 'on', note: g('note').slice(0, 500) || null, created_by: user.id,
  };
  const { error } = await supabase.from('ctf_events').insert(row);
  if (error) redirect(`/admin/ctfs?error=${encodeURIComponent('Check the name, link and dates (end must be after start).')}`);
  await audit({ id: user.id, name: profile?.display_name }, 'Added CTF event', row.name);
  revalidatePath('/ctfs');
  redirect('/admin/ctfs?message=Added.');
}

export async function deleteCtf(id: string) {
  const { supabase, user, profile } = await requireStaff('/admin/ctfs', 'learn');
  const { data } = await supabase.from('ctf_events').delete().eq('id', id).select('name');
  if (data?.[0]) await audit({ id: user.id, name: profile?.display_name }, 'Removed CTF event', data[0].name);
  revalidatePath('/ctfs');
  revalidatePath('/admin/ctfs');
}
