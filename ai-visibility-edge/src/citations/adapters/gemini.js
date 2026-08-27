export const SCHEMA_VERSION = '2026-08';

/**
 * @param {object} raw — Gemini generateContent response
 */
export function parse(raw) {
  const candidate = raw?.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  const answerText = parts.map((p) => p.text ?? '').join('\n').trim();
  const meta = candidate?.groundingMetadata ?? raw?.groundingMetadata ?? {};
  const citations = extractGroundingCitations(meta, answerText);

  return {
    model: 'gemini',
    answerText,
    citations,
    raw,
    subquestions_detected: meta.groundingSupports ?? null,
  };
}

function extractGroundingCitations(meta, answerText) {
  const chunks = meta.groundingChunks ?? [];
  const supports = meta.groundingSupports ?? [];
  const citations = [];
  const seen = new Set();

  for (const support of supports) {
    const segment = support.segment?.text ?? '';
    for (const idx of support.groundingChunkIndices ?? []) {
      const chunk = chunks[idx];
      const web = chunk?.web;
      if (!web?.uri) continue;
      const key = web.uri + segment;
      if (seen.has(key)) continue;
      seen.add(key);
      citations.push({
        url: web.uri,
        title: web.title ?? '',
        snippet: chunk?.retrievedContext?.text ?? '',
        supportedText: segment || answerText.slice(0, 120),
      });
    }
  }

  if (citations.length === 0) {
    for (const chunk of chunks) {
      const web = chunk?.web;
      if (!web?.uri || seen.has(web.uri)) continue;
      seen.add(web.uri);
      citations.push({
        url: web.uri,
        title: web.title ?? '',
        snippet: chunk?.retrievedContext?.text ?? '',
        supportedText: '',
      });
    }
  }

  return citations;
}
