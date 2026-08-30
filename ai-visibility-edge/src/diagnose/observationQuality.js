/**
 * Observation quality stats from D1 — feeds precise weakness findings.
 */

const SOV_ELIGIBLE = new Set(['GROUNDED_VERIFIED', 'GROUNDED_WEAK']);
const NEGATIVE = new Set(['MISATTRIBUTED', 'FABRICATED_URL']);

export async function loadObservationQuality(db, tenantId, domain) {
  if (!db || !tenantId) return null;

  const normalized = domain.replace(/^www\./, '').toLowerCase();

  const { results: byClass } = await db
    .prepare(
      `SELECT o.class, COUNT(*) as n
       FROM observations o
       JOIN runs r ON r.id = o.run_id
       JOIN questions q ON q.id = r.question_id
       WHERE q.tenant_id = ?
       GROUP BY o.class`,
    )
    .bind(tenantId)
    .all();

  const { results: byModel } = await db
    .prepare(
      `SELECT r.model,
              COUNT(DISTINCT r.id) as runs_with_obs,
              SUM(CASE WHEN o.class IN ('GROUNDED_VERIFIED','GROUNDED_WEAK') THEN 1 ELSE 0 END) as grounded,
              SUM(CASE WHEN o.class = 'MISATTRIBUTED' THEN 1 ELSE 0 END) as misattributed,
              SUM(CASE WHEN o.class = 'FABRICATED_URL' THEN 1 ELSE 0 END) as fabricated
       FROM observations o
       JOIN runs r ON r.id = o.run_id
       JOIN questions q ON q.id = r.question_id
       WHERE q.tenant_id = ?
       GROUP BY r.model`,
    )
    .bind(tenantId)
    .all();

  const { results: samples } = await db
    .prepare(
      `SELECT o.class, o.url, o.cited_passage, r.model, q.text as question_text
       FROM observations o
       JOIN runs r ON r.id = o.run_id
       JOIN questions q ON q.id = r.question_id
       WHERE q.tenant_id = ? AND o.class IN ('MISATTRIBUTED', 'FABRICATED_URL')
       ORDER BY o.verified_at DESC
       LIMIT 5`,
    )
    .bind(tenantId)
    .all();

  const { results: stale } = await db
    .prepare(
      `SELECT COUNT(*) as n, AVG(o.cache_age_hours) as avg_age
       FROM observations o
       JOIN runs r ON r.id = o.run_id
       JOIN questions q ON q.id = r.question_id
       WHERE q.tenant_id = ? AND o.cache_age_hours IS NOT NULL AND o.cache_age_hours > 72`,
    )
    .bind(tenantId)
    .first();

  const classCounts = {};
  let total = 0;
  let grounded = 0;
  let misattributed = 0;
  let fabricated = 0;

  for (const row of byClass ?? []) {
    classCounts[row.class] = row.n;
    total += row.n;
    if (SOV_ELIGIBLE.has(row.class)) grounded += row.n;
    if (row.class === 'MISATTRIBUTED') misattributed += row.n;
    if (row.class === 'FABRICATED_URL') fabricated += row.n;
  }

  const modelSplit = (byModel ?? []).map((m) => ({
    model: m.model,
    runs_with_obs: m.runs_with_obs,
    grounded: m.grounded ?? 0,
    misattributed: m.misattributed ?? 0,
    fabricated: m.fabricated ?? 0,
    citation_rate: m.runs_with_obs > 0 ? (m.grounded ?? 0) / m.runs_with_obs : 0,
  }));

  return {
    domain: normalized,
    total_observations: total,
    class_counts: classCounts,
    grounded_count: grounded,
    misattributed_count: misattributed,
    fabricated_count: fabricated,
    misattribution_rate: total > 0 ? misattributed / total : 0,
    fabrication_rate: total > 0 ? fabricated / total : 0,
    by_model: modelSplit,
    negative_samples: (samples ?? []).map((s) => ({
      class: s.class,
      url: s.url,
      passage: s.cited_passage?.slice(0, 120) ?? null,
      model: s.model,
      question: s.question_text?.slice(0, 100) ?? null,
    })),
    stale_cache: {
      count: stale?.n ?? 0,
      avg_age_hours: stale?.avg_age != null ? Math.round(stale.avg_age * 10) / 10 : null,
    },
  };
}

export function isNegativeObservationClass(className) {
  return NEGATIVE.has(className);
}
