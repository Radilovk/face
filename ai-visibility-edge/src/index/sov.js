import { integrityMultiplier, isSovEligible, FORMULA_VERSION } from '../citations/classify.js';

/**
 * AI-SOV per domain / vertical / model / period (YYYY-WW).
 * SOV = 100 × frequency × position × integrity (eligible classes only).
 */
export async function computeSov(db, { domain, verticalId, model, period }) {
  const { results: rows } = await db
    .prepare(
      `SELECT o.class, o.domain, COUNT(*) as cnt
       FROM observations o
       JOIN runs r ON r.id = o.run_id
       JOIN questions q ON q.id = r.question_id
       WHERE q.vertical_id = ?
         AND (? IS NULL OR r.model = ?)
         AND o.domain = ?
       GROUP BY o.class, o.domain`,
    )
    .bind(verticalId, model, model, domain)
    .all();

  const { total } = await db
    .prepare(
      `SELECT COUNT(DISTINCT r.id) as total
       FROM runs r
       JOIN questions q ON q.id = r.question_id
       WHERE q.vertical_id = ?
         AND (? IS NULL OR r.model = ?)`,
    )
    .bind(verticalId, model, model)
    .first();

  const sessions = total?.total || 1;
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

  const frequency = appearances / sessions;
  const position = appearances > 0 ? 1 / Math.log2(2) : 0;
  const integrity = integrityCount > 0 ? integritySum / integrityCount : 0;
  const sov = 100 * frequency * position * integrity;

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

  return {
    id,
    domain,
    vertical_id: verticalId,
    model: model ?? 'all',
    period,
    frequency,
    position,
    integrity,
    sov,
    observations_count: appearances,
    formula_version: FORMULA_VERSION,
  };
}

export function currentPeriod(date = new Date()) {
  const d = new Date(date);
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - onejan) / 86400000 + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-${String(week).padStart(2, '0')}`;
}
