import 'server-only';
import { onPublished, type PublishedStory } from '@/lib/newsroom/hooks';
import { SITE } from '@/lib/site';

const ICON: Record<string, string> = { critical: '🔴', high: '🟠', medium: '🟡', info: '🔵' };

/** Posts every newly published story to Telegram and Discord, if configured (both free). */
async function broadcast(s: PublishedStory) {
  const url = `${SITE.url}/article/${s.slug}`;
  const tg = process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID;
  const jobs: Promise<unknown>[] = [];
  if (tg) {
    const text = `${ICON[s.severity] ?? '•'} <b>${s.title.replace(/[<>&]/g, '')}</b>\n\n${s.excerpt.replace(/[<>&]/g, '')}\n\n${url}`;
    jobs.push(fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text, parse_mode: 'HTML', disable_web_page_preview: false }),
      signal: AbortSignal.timeout(10000),
    }));
  }
  if (process.env.DISCORD_WEBHOOK_URL?.startsWith('https://discord.com/api/webhooks/')) {
    const color = { critical: 0xc2241c, high: 0xc46a06, medium: 0x8a7a0a, info: 0x2346d8 }[s.severity] ?? 0x2346d8;
    jobs.push(fetch(process.env.DISCORD_WEBHOOK_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: SITE.name, allowed_mentions: { parse: [] }, embeds: [{ title: s.title.slice(0, 256), description: s.excerpt.slice(0, 400), url, color, footer: { text: `${s.category}${s.cves.length ? ` · ${s.cves.slice(0, 3).join(', ')}` : ''}` } }] }),
      signal: AbortSignal.timeout(10000),
    }));
  }
  await Promise.allSettled(jobs);
}

onPublished(broadcast);
