export const SCHEMA_VERSION = '2026-08';
export const FIXTURE = (() => {
  // Some runtimes (esbuild, wrangler, Cloudflare Workers) may provide
  // import.meta but not a usable import.meta.url string. Avoid calling
  // `new URL(..., import.meta.url)` unless we have a valid string to use
  // as the base; otherwise fall back to the plain relative path string.
  const base = (typeof import.meta === 'object' && typeof import.meta.url === 'string')
    ? import.meta.url
    : null;

  if (!base) return './fixtures/openai-2026-08.json';

  try {
    return new URL('./fixtures/openai-2026-08.json', base);
  } catch (e) {
    // If constructing the URL still fails for some reason, fall back to
    // the relative path so tests/tools can resolve it.
    return './fixtures/openai-2026-08.json';
  }
})();

/**
 * @param {object} raw — OpenAI Responses API body
 * @returns {{ model: string, answerText: string, citations: Array, raw: object }}
 */
export function parse(raw) {
  const answerText = extractAnswerText(raw);
  const citations = extractCitations(raw);

  return {
    model: 'openai',
    answerText,
    citations,
    raw,
  };
}

function extractAnswerText(raw) {
  const chunks = [];
  for (const item of raw?.output ?? []) {
    if (item.type !== 'message') continue;
    for (const part of item.content ?? []) {
      if (part.type === 'output_text' && part.text) chunks.push(part.text);
    }
  }
  return chunks.join('\n').trim();
}

function extractCitations(raw) {
  const citations = [];
  const seen = new Set();

  for (const item of raw?.output ?? []) {
    if (item.type !== 'message') continue;
    for (const part of item.content ?? []) {
      for (const ann of part.annotations ?? []) {
        if (ann.type !== 'url_citation' || !ann.url) continue;
        const key = ann.url + (ann.start_index ?? '');
        if (seen.has(key)) continue;
        seen.add(key);
        citations.push({
          url: ann.url,
          title: ann.title ?? '',
          snippet: '',
          supportedText: extractSupportedText(part.text, ann.start_index, ann.end_index),
        });
      }
    }
  }

  return citations;
}

function extractSupportedText(text, start, end) {
  if (!text || start == null || end == null) return '';
  return text.slice(start, end).trim();
}
