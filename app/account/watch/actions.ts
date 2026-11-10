'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';

export async function addWatch(formData: FormData) {
  const { supabase, user } = await requireUser('/account/watch');
  const vendor = String(formData.get('vendor') || '').trim().slice(0, 80);
  const product = String(formData.get('product') || '').trim().slice(0, 80) || null;
  if (vendor.length < 2) redirect('/account/watch?error=' + encodeURIComponent('Type a vendor name, like Fortinet or Microsoft.'));
  const { error } = await supabase.from('watch_items').insert({ user_id: user.id, vendor, product });
  if (error) redirect('/account/watch?error=' + encodeURIComponent(error.code === '23505' ? 'You are already watching that.' : 'Free accounts can watch 3 products. Members can watch up to 100.'));
  revalidatePath('/account/watch');
  redirect('/account/watch?message=' + encodeURIComponent(`Watching ${vendor}${product ? ` ${product}` : ''}. We'll email you when something new comes up.`));
}

export async function removeWatch(id: string) {
  const { supabase } = await requireUser('/account/watch');
  await supabase.from('watch_items').delete().eq('id', id);
  revalidatePath('/account/watch');
}
