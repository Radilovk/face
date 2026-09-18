/**
 * Сканиране на натрупаните runs за рискови твърдения + коефициент на халюцинация.
 *
 * Коефициентът е продуктът, не единичната находка: един случай се оборва
 * с един контра-тест, разпределение не се оборва.
 */

import { scanAnswerForBrandRisk, brandTermsFor, RISK_VERSION, RISK_CLASSES } from './claimRisk.js';

/** Под този брой изпълнения на въпрос коефициентът не се показва като число. */
export const MIN_RUNS_PER_QUESTION = 3;

const BLOCKING_SEVERITY = new Set(['critical', 'high']);

/**
 * Сканира runs за един домейн и записва находките.
 *
 * @param {object} db — D1
 * @param {object} opts
 * @param {string} opts.domain — наблюдаваната марка (може да е чужда)
 * @param {string} [opts.brandName]
 * @param {string} [opts.verticalId] — ако домейнът не е tenant, обхватът е вертикалът
 * @param {string} [opts.model]
 * @param {number} [opts.days=30]
 * @param {boolean} [opts.persist=true]
 */
export async function scanBrandRisk(db, opts = {}) {
  const { domain, brandName = null, verticalId = null, model = null, days = 30, persist = true } = opts;

  if (!db) return { error: 'no_db' };
  if (!domain) return { error: 'domain_required' };

  const brandTerms = brandTermsFor(domain, brandName);
  const since = isoDaysAgo(days);

  const { results: runs } = await db
    .prepare(
      `SELECT r.id, r.model, r.run_at, r.answer_text, r.repetition, q.id AS question_id, q.text AS question_text
       FROM runs r
       JOIN questions q ON q.id = r.question_id
       WHERE (? IS NULL OR q.vertical_id = ?)
         AND (? IS NULL OR r.model = ?)
         AND r.run_at >= ?
         AND r.answer_text IS NOT NULL
         AND r.answer_text != ''
       ORDER BY r.run_at DESC`,
    )
    .bind(verticalId, verticalId, model, model, since)
    .all();

  const findings = [];
  const runsWithRisk = new Set();
  const questionIds = new Set();
  const byModel = new Map();

  for (const run of runs ?? []) {
    questionIds.add(run.question_id);
    const bucket = byModel.get(run.model) ?? { total: 0, risky: 0 };
    bucket.total++;
    byModel.set(run.model, bucket);

    const hits = scanAnswerForBrandRisk(run.answer_text, brandTerms);
    if (hits.length === 0) continue;

    const blocking = hits.filter((h) => BLOCKING_SEVERITY.has(h.severity));
    if (blocking.length > 0) {
      runsWithRisk.add(run.id);
      bucket.risky++;
    }

    for (const hit of hits) {
      findings.push({
        ...hit,
        run_id: run.id,
        model: run.model,
        run_at: run.run_at,
        question_id: run.question_id,
        question_text: run.question_text,
      });
    }
  }

  if (persist) {
    for (const f of findings) {
      await persistFinding(db, domain, f);
    }
  }

  const totalRuns = runs?.length ?? 0;
  const rate = buildRate({
    totalRuns,
    riskyRuns: runsWithRisk.size,
    questionCount: questionIds.size,
    byModel,
  });

  return {
    domain,
    window_days: days,
    scanned_runs: totalRuns,
    questions: questionIds.size,
    findings_count: findings.length,
    findings,
    rate,
    risk_version: RISK_VERSION,
    generated_at: new Date().toISOString(),
  };
}

/**
 * Коефициент на халюцинация + честен отказ, когато извадката не стига.
 * При под MIN_RUNS_PER_QUESTION изпълнения на въпрос не показваме число:
 * с едно повторение нямаме оценка на дисперсията, а моделите са стохастични.
 */
export function buildRate({ totalRuns, riskyRuns, questionCount, byModel }) {
  const runsPerQuestion = questionCount > 0 ? totalRuns / questionCount : 0;
  const sufficient = runsPerQuestion >= MIN_RUNS_PER_QUESTION;

  const perModel = [];
  for (const [modelName, b] of byModel ?? []) {
    perModel.push({
      model: modelName,
      runs: b.total,
      runs_with_risk: b.risky,
      rate: b.total > 0 ? b.risky / b.total : 0,
    });
  }
  perModel.sort((a, b) => b.rate - a.rate);

  return {
    sufficient_power: sufficient,
    runs_per_question: Math.round(runsPerQuestion * 10) / 10,
    min_runs_per_question: MIN_RUNS_PER_QUESTION,
    total_runs: totalRuns,
    runs_with_risk: riskyRuns,
    hallucination_rate: totalRuns > 0 ? riskyRuns / totalRuns : 0,
    by_model: perModel,
    hint: sufficient
      ? null
      : `Извадката не стига за коефициент — ${MIN_RUNS_PER_QUESTION} изпълнения на въпрос минимум. Покажете находките, не процента.`,
  };
}

/** Групиране за папката — по клас риск, най-тежкото първо. */
export function groupByRiskClass(findings) {
  const order = Object.keys(RISK_CLASSES);
  const groups = new Map();

  for (const f of findings ?? []) {
    const list = groups.get(f.risk_class) ?? [];
    list.push(f);
    groups.set(f.risk_class, list);
  }

  return order
    .filter((cls) => groups.has(cls))
    .map((cls) => ({
      risk_class: cls,
      label: RISK_CLASSES[cls].label,
      severity: RISK_CLASSES[cls].severity,
      count: groups.get(cls).length,
      findings: groups.get(cls),
    }));
}

async function persistFinding(db, domain, f) {
  await db
    .prepare(
      `INSERT OR IGNORE INTO brand_risk_findings (
         id, run_id, domain, model, question_id, risk_class, severity,
         evidence, sentence, sentence_index, detected_at, risk_version
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      crypto.randomUUID(),
      f.run_id,
      domain,
      f.model,
      f.question_id ?? null,
      f.risk_class,
      f.severity,
      f.evidence,
      f.sentence,
      f.sentence_index ?? null,
      new Date().toISOString(),
      RISK_VERSION,
    )
    .run();
}

function isoDaysAgo(days) {
  return new Date(Date.now() - days * 86400000).toISOString();
}
