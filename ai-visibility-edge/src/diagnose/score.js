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
  if (probeResult.signals?.noindex) return Math.min(15, probeResult.http_status >= 200 ? 15 : 5);
  if (probeResult.robots_ai_policy === 'disallow_all') return Math.min(20, 10);

  let score = 0;

  if (probeResult.http_status >= 200 && probeResult.http_status < 400) score += 20;

  const chars = probeResult.html_text_chars ?? 0;
  if (chars >= 2000) score += 18;
  else if (chars >= 1000) score += 15;
  else if (chars >= 500) score += 10;
  else if (chars >= 200) score += 5;

  const jsonld = probeResult.jsonld_blocks ?? 0;
  if (jsonld >= 2) score += 12;
  else if (jsonld === 1) score += 8;

  const types = probeResult.raw_json?.jsonld_types ?? probeResult.signals?.jsonld_types ?? [];
  if (types.some((t) => /Organization|Product|LocalBusiness|WebSite/i.test(t))) score += 5;

  if (probeResult.has_canonical) score += 8;
  if ((probeResult.price_tokens ?? 0) > 0) score += 8;
  else if ((probeResult.price_tokens ?? 0) === 0 && chars >= 500) score -= 2;

  if (probeResult.robots_ai_policy === 'allow') score += 10;
  else if (probeResult.robots_ai_policy === 'ai_rules_present') score += 6;

  if ((probeResult.blocked_bots ?? []).length > 0) score -= 8;

  if (probeResult.signals?.js_shell_suspect) score -= 15;
  if (probeResult.signals?.brand_mentions === 0 && chars > 100) score -= 5;
  if (probeResult.signals?.sitemap_ok === false) score -= 2;

  const passageScore = passageResult?.score ?? 50;
  score += Math.round(passageScore * 0.22);

  return Math.max(0, Math.min(100, score));
}
