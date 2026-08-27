export const SCHEMA_VERSION = '2026-08';
export const FIXTURE = new URL('./fixtures/openai-2026-08.json', import.meta.url);

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
