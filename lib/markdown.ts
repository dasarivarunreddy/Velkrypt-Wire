import 'server-only';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

/** Markdown -> safe HTML. Even staff-written content is sanitised (defence in depth against stored XSS). */
export function renderMarkdown(md: string) {
  const raw = marked.parse(md || '', { async: false, gfm: true, breaks: false }) as string;
  return sanitizeHtml(raw, {
    allowedTags: ['h2', 'h3', 'h4', 'p', 'a', 'ul', 'ol', 'li', 'strong', 'em', 'code', 'pre', 'blockquote', 'hr', 'br', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img'],
    allowedAttributes: { a: ['href', 'title'], img: ['src', 'alt', 'title'], code: ['class'] },
    allowedSchemes: ['https', 'http', 'mailto'],
    transformTags: {
      a: (tag, attribs) => ({ tagName: 'a', attribs: { ...attribs, rel: 'noopener noreferrer nofollow', target: '_blank' } }),
    },
  });
}

export function markdownToText(md: string) {
  return sanitizeHtml(renderMarkdown(md), { allowedTags: [], allowedAttributes: {} }).replace(/\s+\n/g, '\n').trim();
}
