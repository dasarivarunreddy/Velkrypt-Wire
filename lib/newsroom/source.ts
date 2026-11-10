import 'server-only';

/** Fetches a page and returns its readable text (for the AI to summarise in its own words). */
export async function fetchArticleText(url: string, max = 12000) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'VelkryptWire/1.0 (+https://velkrypt.online; newsroom)' }, signal: AbortSignal.timeout(15000) });
    if (!res.ok || !(res.headers.get('content-type') || '').includes('html')) return '';
    let html = await res.text();
    html = html.replace(/<(script|style|noscript|svg|nav|footer|header|aside|form)[\s\S]*?<\/\1>/gi, ' ');
    const main = html.match(/<article[\s\S]*?<\/article>/i)?.[0] || html.match(/<main[\s\S]*?<\/main>/i)?.[0] || html;
    const text = main.replace(/<\/(p|h\d|li|tr|div)>/gi, '\n').replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&rsquo;|&lsquo;/g, "'").replace(/&[a-z]+;/g, ' ')
      .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
    return text.slice(0, max);
  } catch {
    return '';
  }
}
