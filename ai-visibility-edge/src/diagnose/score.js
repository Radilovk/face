/**
 * Regex-based passage autonomy — no model API cost.
 * Penalizes paragraphs starting with anaphora (това, той, затова…).
 */

const ANAPHORA =
  /^(това|този|тази|тези|той|тя|те|затова|следователно|освен това|от друга страна|както споменахме|above|this|these|it|they)([\s,.:;—-]|$)/i;

const PRICE_RE = /\d+[.,]?\d*\s*(€|лв|BGN|EUR)/i;

export function splitParagraphs(text) {
  if (!text) return [];
  return text
    .split(/\n{2,}|<\/p>|<\/h[1-6]>/i)
    .map((p) => p.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 40);
}

export function passageAutonomy(text) {
  const paragraphs = splitParagraphs(text);
  if (paragraphs.length === 0) {
    return { score: 50, paragraphs: 0, anaphora_starts: 0, self_contained: 0, details: [] };
  }

  let anaphoraStarts = 0;
  let selfContained = 0;
  const details = [];

  for (const p of paragraphs) {
    const startsWithAnaphora = ANAPHORA.test(p);
    const hasEntity = /[A-ZА-Я][a-zа-я]{2,}/.test(p) || /\.(com|bg|net|org)\b/i.test(p);
    const hasPrice = PRICE_RE.test(p);
    const autonomous = !startsWithAnaphora && (hasEntity || hasPrice || p.length > 120);

    if (startsWithAnaphora) anaphoraStarts++;
    if (autonomous) selfContained++;

    details.push({
      preview: p.slice(0, 80),
      anaphora_start: startsWithAnaphora,
      autonomous,
    });
  }

  const autonomyRatio = selfContained / paragraphs.length;
  const anaphoraPenalty = anaphoraStarts / paragraphs.length;
  const score = Math.round(Math.max(0, Math.min(100, autonomyRatio * 100 - anaphoraPenalty * 30)));

  return {
    score,
    paragraphs: paragraphs.length,
    anaphora_starts: anaphoraStarts,
    self_contained: selfContained,
    details: details.slice(0, 10),
  };
}

/**
 * Combine probe metrics into a single diagnostic score (0–100).
 */
export function computeDiagnosticScore(probeResult, passageResult) {
  let score = 0;

  if (probeResult.http_status >= 200 && probeResult.http_status < 400) score += 25;
  if ((probeResult.html_text_chars ?? 0) > 500) score += 15;
  if ((probeResult.jsonld_blocks ?? 0) > 0) score += 10;
  if (probeResult.has_canonical) score += 10;
  if ((probeResult.price_tokens ?? 0) > 0) score += 10;
  if (probeResult.robots_ai_policy === 'allow' || probeResult.robots_ai_policy === 'ai_rules_present') {
    score += 10;
  }
  if (probeResult.robots_ai_policy === 'disallow_all') score -= 20;

  const passageScore = passageResult?.score ?? 50;
  score += Math.round(passageScore * 0.2);

  return Math.max(0, Math.min(100, score));
}
