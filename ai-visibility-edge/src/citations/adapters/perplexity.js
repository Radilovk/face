export const SCHEMA_VERSION = '2026-08';

/**
 * @param {object} raw — Perplexity chat/completions body
 */
export function parse(raw) {
  const answerText = extractAnswerText(raw);
  const citations = extractCitations(raw, answerText);

  return {
    model: 'perplexity',
    answerText,
    citations,
    raw,
  };
}

function extractAnswerText(raw) {
  return raw?.choices?.[0]?.message?.content?.trim() ?? '';
}

function extractCitations(raw, answerText) {
  const citations = [];
  const seen = new Set();

  for (const url of raw?.citations ?? []) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    citations.push({
      url,
      title: '',
      snippet: '',
      supportedText: answerText.slice(0, 120),
    });
  }

  const urlRe = /https?:\/\/[^\s)\]"']+/gi;
  for (const match of answerText.matchAll(urlRe)) {
    const url = match[0].replace(/[.,;]+$/, '');
    if (seen.has(url)) continue;
    seen.add(url);
    citations.push({
      url,
      title: '',
      snippet: '',
      supportedText: answerText.slice(0, 120),
    });
  }

  return citations;
}
