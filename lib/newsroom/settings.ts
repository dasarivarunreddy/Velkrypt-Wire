import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export type AiSettings = { enabled: boolean; autopublish_official: boolean; daily_request_limit: number; escalation_minutes: number; min_importance: number; show_ai_label: boolean };
export const AI_DEFAULTS: AiSettings = { enabled: true, autopublish_official: true, daily_request_limit: 300, escalation_minutes: 20, min_importance: 3, show_ai_label: false };

export async function getAiSettings(): Promise<AiSettings> {
  const { data } = await createAdminClient().from('settings').select('value').eq('key', 'ai').maybeSingle();
  return { ...AI_DEFAULTS, ...((data?.value as Partial<AiSettings>) ?? {}) };
}

export async function saveAiSettings(v: AiSettings) {
  await createAdminClient().from('settings').upsert({ key: 'ai', value: v, updated_at: new Date().toISOString() });
}
