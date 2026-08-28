import { parseModelResponse } from '../citations/extract.js';
import { extractDomain } from '../citations/verify.js';

/**
 * Displacement: AI lists competitors A,B,C but not the tenant domain.
 */
export async function analyzeDisplacement(db, { domain, verticalId, model = null, limit = 500 }) {
  const tenantDomain = normalizeDomain(domain);

  const { results: competitors } = await db
    .prepare(
      `SELECT domain FROM watched_domains
       WHERE vertical_id = ? AND role = 'competitor'`,
    )
    .bind(verticalId)
    .all();

  const competitorSet = new Set((competitors ?? []).map((r) => normalizeDomain(r.domain)));

  const { results: runs } = await db
    .prepare(
      `SELECT r.id, r.model, r.answer_text, r.raw_response, q.id as question_id, q.text as question_text
       FROM runs r
       JOIN questions q ON q.id = r.question_id
       WHERE q.vertical_id = ?
         AND (? IS NULL OR r.model = ?)
       ORDER BY r.run_at DESC
       LIMIT ?`,
    )
    .bind(verticalId, model, model, limit)
    .all();

  const events = [];
  let displacedCount = 0;
  let presentCount = 0;

  for (const run of runs ?? []) {
    const mentioned = extractMentionedDomains(run, competitorSet);
    const tenantPresent = mentioned.has(tenantDomain);
    const mentionedCompetitors = [...mentioned].filter((d) => competitorSet.has(d));

    if (mentionedCompetitors.length > 0 && !tenantPresent) {
      displacedCount++;
      events.push({
        run_id: run.id,
        model: run.model,
        question_id: run.question_id,
        question_text: run.question_text,
        tenant_domain: tenantDomain,
        competitors_mentioned: mentionedCompetitors,
        all_domains_mentioned: [...mentioned],
        summary: `Моделът изброява ${mentionedCompetitors.join(', ')} — ${tenantDomain} липсва`,
      });
    } else if (tenantPresent) {
      presentCount++;
    }
  }

  const total = runs?.length ?? 0;
  const displacementRate = total > 0 ? displacedCount / total : 0;

  return {
    domain: tenantDomain,
    vertical_id: verticalId,
    model: model ?? 'all',
    total_runs: total,
    tenant_present_count: presentCount,
    displaced_count: displacedCount,
    displacement_rate: Math.round(displacementRate * 1000) / 1000,
    events: events.slice(0, 20),
    competitors_tracked: [...competitorSet],
  };
}

export function extractMentionedDomains(run, competitorSet = new Set()) {
  const mentioned = new Set();
  let parsed;

  try {
    parsed = parseModelResponse(run.model, JSON.parse(run.raw_response));
  } catch {
    parsed = { citations: [], answerText: run.answer_text ?? '' };
  }

  for (const c of parsed.citations ?? []) {
    const d = extractDomain(c.url);
    if (d) mentioned.add(normalizeDomain(d));
  }

  const text = parsed.answerText ?? run.answer_text ?? '';
  const urlRe = /https?:\/\/[^\s)\]"']+/gi;
  for (const match of text.matchAll(urlRe)) {
    const d = extractDomain(match[0]);
    if (d) mentioned.add(normalizeDomain(d));
  }

  for (const comp of competitorSet) {
    if (text.toLowerCase().includes(comp)) mentioned.add(comp);
  }

  return mentioned;
}

function normalizeDomain(domain) {
  return String(domain).replace(/^www\./, '').toLowerCase().split('/')[0];
}
