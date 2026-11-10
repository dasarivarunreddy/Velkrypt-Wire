import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Free AI providers, tried in order. All speak the OpenAI-compatible chat API.
 * Model names on free tiers change often: override any of them with the env vars below.
 */
export type Provider = { id: string; name: string; baseUrl: string; keyEnv: string; model: string };

export const PROVIDERS: Provider[] = [
  { id: 'groq', name: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', keyEnv: 'GROQ_API_KEY', model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile' },
  { id: 'cerebras', name: 'Cerebras', baseUrl: 'https://api.cerebras.ai/v1', keyEnv: 'CEREBRAS_API_KEY', model: process.env.CEREBRAS_MODEL || 'llama-3.3-70b' },
  { id: 'openrouter', name: 'OpenRouter (free models)', baseUrl: 'https://openrouter.ai/api/v1', keyEnv: 'OPENROUTER_API_KEY', model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free' },
];

export const configuredProviders = () => PROVIDERS.filter((p) => !!process.env[p.keyEnv]);

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

async function callProvider(p: Provider, messages: ChatMessage[], opts: { json?: boolean; maxTokens?: number; temperature?: number }) {
  const res = await fetch(`${p.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env[p.keyEnv]}`,
      'Content-Type': 'application/json',
      ...(p.id === 'openrouter' ? { 'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://velkrypt.online', 'X-Title': 'Velkrypt Wire' } : {}),
    },
    body: JSON.stringify({
      model: p.model,
      messages,
      temperature: opts.temperature ?? 0.2,
      max_tokens: opts.maxTokens ?? 1800,
      ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(`${p.name} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error(`${p.name} returned an empty answer`);
  return text;
}

async function record(provider: string, ok: boolean) {
  try { await createAdminClient().rpc('bump_ai_usage', { p: provider, ok }); } catch { /* usage logging is best-effort */ }
}

export async function todaysRequests() {
  const { data } = await createAdminClient().from('ai_usage').select('requests').eq('day', new Date().toISOString().slice(0, 10));
  return (data ?? []).reduce((n, r) => n + r.requests, 0);
}

/** Asks the first working provider. Falls through to the next on errors or rate limits. */
export async function chat(messages: ChatMessage[], opts: { json?: boolean; maxTokens?: number; temperature?: number } = {}) {
  const list = configuredProviders();
  if (!list.length) throw new Error('No AI provider keys are set. Add GROQ_API_KEY (or CEREBRAS_API_KEY / OPENROUTER_API_KEY) in Vercel.');
  const errors: string[] = [];
  for (const p of list) {
    try {
      const text = await callProvider(p, messages, opts);
      await record(p.id, true);
      return { text, provider: p.name };
    } catch (e) {
      await record(p.id, false);
      errors.push((e as Error).message);
    }
  }
  throw new Error(`All AI providers failed: ${errors.join(' | ')}`);
}

/** Like chat(), but parses a JSON object out of the answer. */
export async function chatJSON<T>(messages: ChatMessage[], opts: { maxTokens?: number } = {}): Promise<{ data: T; provider: string }> {
  const { text, provider } = await chat(messages, { ...opts, json: true });
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('The AI did not return JSON.');
  return { data: JSON.parse(text.slice(start, end + 1)) as T, provider };
}

/** Used by the "Test" button on the AI settings page. */
export async function testProvider(id: string) {
  const p = PROVIDERS.find((x) => x.id === id);
  if (!p) return { ok: false, message: 'Unknown provider' };
  if (!process.env[p.keyEnv]) return { ok: false, message: `${p.keyEnv} is not set in Vercel.` };
  try {
    const text = await callProvider(p, [{ role: 'user', content: 'Reply with the single word: ready' }], { maxTokens: 5 });
    await record(p.id, true);
    return { ok: true, message: `Working (${p.model}): "${text.slice(0, 30)}"` };
  } catch (e) {
    await record(p.id, false);
    return { ok: false, message: (e as Error).message };
  }
}
