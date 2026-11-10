import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

/** Records a staff action. Written with the service key so staff cannot edit or erase it. */
export async function audit(actor: { id: string; name?: string | null }, action: string, target?: string | null, details: Record<string, unknown> = {}) {
  try {
    await createAdminClient().from('audit_log').insert({ actor_id: actor.id, actor_name: actor.name ?? null, action, target: target ?? null, details });
  } catch { /* never block the action itself */ }
}
