'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

/** Signed-in readers can switch the newsletter on/off for their own verified account email. */
export async function setNewsletter(on: boolean) {
  const { user } = await requireUser();
  if (!user.email) return;
  const admin = createAdminClient();
  const email = user.email.toLowerCase();
  if (on) {
    // The account email is already verified by Supabase, so no second opt-in is needed.
    await admin.from('subscribers').upsert({ email, status: 'active', user_id: user.id, confirmed_at: new Date().toISOString() }, { onConflict: 'email' });
  } else {
    await admin.from('subscribers').update({ status: 'unsubscribed' }).eq('email', email);
  }
  revalidatePath('/account');
}
