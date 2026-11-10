import 'server-only';
// Things that happen whenever a story goes live. Phase 3 (Stack Watch) and Phase 4 (Telegram/Discord) plug in here.
export type PublishedStory = { id: string; slug: string; title: string; excerpt: string; severity: string; category: string; cves: string[]; entities: string[]; tags: string[] };
type Hook = (s: PublishedStory) => Promise<void>;
const hooks: Hook[] = [];
export const onPublished = (h: Hook) => { hooks.push(h); };
export async function storyPublished(s: PublishedStory) {
  await import('@/lib/jobs'); // registers Telegram/Discord broadcast and other listeners
  await Promise.all(hooks.map((h) => h(s).catch(() => null)));
}
