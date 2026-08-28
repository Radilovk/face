import { integrityMultiplier, isSovEligible, FORMULA_VERSION } from '../citations/classify.js';

/**
 * AI-SOV per domain / vertical / model / period (YYYY-WW).
 * SOV = 100 × frequency × position × integrity (eligible classes only).
 * frequency = runs_with_tenant_citation / total_runs_in_period (capped at 1).
 */
export async function computeSov(db, { domain, verticalId, model, period, persist = false }) {
  const { start, end } = periodToUtcRange(period);

  const sessionRow = await db
    .prepare(
      `SELECT COUNT(DISTINCT r.id) as total
       FROM runs r
       JOIN questions q ON q.id = r.question_id
       WHERE q.vertical_id = ?
         AND (? IS NULL OR r.model = ?)
         AND r.run_at >= ?
         AND r.run_at < ?`,
    )
    .bind(verticalId, model, model, start, end)
    .first();

  const sessions = Math.max(sessionRow?.total ?? 0, 1);

  const { results: rows } = await db
    .prepare(
      `SELECT o.class, o.domain, COUNT(*) as cnt
       FROM observations o
       JOIN runs r ON r.id = o.run_id
       JOIN questions q ON q.id = r.question_id
       WHERE q.vertical_id = ?
         AND (? IS NULL OR r.model = ?)
         AND o.domain = ?
         AND r.run_at >= ?
         AND r.run_at < ?
       GROUP BY o.class, o.domain`,
    )
    .bind(verticalId, model, model, domain, start, end)
    .all();

  const runRow = await db
    .prepare(
      `SELECT COUNT(DISTINCT r.id) as runs_with_citation
       FROM observations o
       JOIN runs r ON r.id = o.run_id
       JOIN questions q ON q.id = r.question_id
       WHERE q.vertical_id = ?
         AND (? IS NULL OR r.model = ?)
         AND o.domain = ?
         AND r.run_at >= ?
         AND r.run_at < ?
         AND o.class IN ('GROUNDED_VERIFIED', 'GROUNDED_WEAK')`,
    )
    .bind(verticalId, model, model, domain, start, end)
    .first();

  const totalObsRow = await db
    .prepare(
      `SELECT COUNT(*) as n
       FROM observations o
       JOIN runs r ON r.id = o.run_id
       JOIN questions q ON q.id = r.question_id
       WHERE q.vertical_id = ?
         AND (? IS NULL OR r.model = ?)
         AND r.run_at >= ?
         AND r.run_at < ?`,
    )
    .bind(verticalId, model, model, start, end)
    .first();

  let appearances = 0;
  let integritySum = 0;
  let integrityCount = 0;

  for (const row of rows ?? []) {
    if (!isSovEligible(row.class)) continue;
    appearances += row.cnt;
    const mult = integrityMultiplier(row.class);
    if (mult != null) {
      integritySum += mult * row.cnt;
      integrityCount += row.cnt;
    }
  }

  const runsWithCitation = runRow?.runs_with_citation ?? 0;
  const frequency = Math.min(runsWithCitation / sessions, 1);
  const position = 1;
  const integrity = integrityCount > 0 ? integritySum / integrityCount : 0;
  const sov = Math.min(100, 100 * frequency * position * integrity);

  const result = {
    domain,
    vertical_id: verticalId,
    model: model ?? 'all',
    period,
    frequency,
    position,
    integrity,
    sov,
    share: sov / 100,
    observations_count: appearances,
    tenant_citations: appearances,
    total_observations: totalObsRow?.n ?? 0,
    sessions,
    runs_with_citation: runsWithCitation,
    formula_version: FORMULA_VERSION,
  };

  if (persist) {
    const id = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO sov_scores (
          id, domain, vertical_id, model, period,
          frequency, position, integrity, sov, observations_count, formula_version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        domain,
        verticalId,
        model ?? 'all',
        period,
        frequency,
        position,
        integrity,
        sov,
        appearances,
        FORMULA_VERSION,
      )
      .run();
    result.id = id;
  }

  return result;
}

/** Inverse of currentPeriod — week boundaries in UTC ISO strings. */
export function periodToUtcRange(period) {
  const [yearStr, weekStr] = String(period).split('-');
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekStr, 10);
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const jan1Day = jan1.getUTCDay();
  const startOffset = (week - 1) * 7 - jan1Day;
  const start = new Date(Date.UTC(year, 0, 1 + startOffset));
  const end = new Date(start.getTime() + 7 * 86400000);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function currentPeriod(date = new Date()) {
  const d = new Date(date);
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - onejan) / 86400000 + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-${String(week).padStart(2, '0')}`;
}

export function runAtInPeriod(runAtIso, period) {
  return currentPeriod(new Date(runAtIso)) === period;
}
