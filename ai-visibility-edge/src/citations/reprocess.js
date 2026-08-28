import { parseModelResponse } from './extract.js';
import { verifyCitation } from './verify.js';
import {
  classifyFromVerify,
  detectParametricRecall,
  getThresholds,
  isMisattribution,
} from './classify.js';

/**
 * Reprocess runs → observations (+ misattributions).
 */
export async function reprocessRuns(env, options = {}) {
  const db = env.DB;
  if (!db) return { skipped: true, reason: 'no_db' };

  const limit = options.limit ?? 50;
  const fetchImpl = options.fetch ?? fetch;

  const row = await db
    .prepare(`SELECT value FROM platform_config WHERE key = 'verify_thresholds' LIMIT 1`)
    .first();
  const thresholds = getThresholds(row?.value);

  const tenantId = options.tenantId ?? null;

  const { results: runs } = await db
    .prepare(
      `SELECT r.id, r.model, r.raw_response, r.answer_text, q.tenant_id
       FROM runs r
       JOIN questions q ON q.id = r.question_id
       WHERE NOT EXISTS (SELECT 1 FROM observations o WHERE o.run_id = r.id)
         AND (? IS NULL OR q.tenant_id = ?)
       ORDER BY r.run_at DESC
       LIMIT ?`,
    )
    .bind(tenantId, tenantId, limit)
    .all();

  const summary = { processed: 0, observations: 0, misattributions: 0, parametric: 0 };

  for (const run of runs ?? []) {
    summary.processed++;
    let parsed;
    try {
      parsed = parseModelResponse(run.model, JSON.parse(run.raw_response));
    } catch (err) {
      console.warn('[reprocess] parse fail', run.id, err.message);
      continue;
    }

    const tenantDomain = await resolveTenantDomain(db, run.tenant_id);
    const citationDomains = (parsed.citations ?? []).map((c) => {
      try {
        return new URL(c.url).hostname;
      } catch {
        return '';
      }
    });

    for (const citation of parsed.citations ?? []) {
      const verified = await verifyCitation(citation, { fetch: fetchImpl });
      const classified = classifyFromVerify(verified, thresholds);

      const obsId = crypto.randomUUID();
      await db
        .prepare(
          `INSERT INTO observations (
            id, run_id, domain, url, canonical_url, class,
            numeric_match, semantic_score, content_version, cache_age_hours,
            verified_at, cited_passage, passage_offset, heading_context
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          obsId,
          run.id,
          classified.domain || verified.domain || '',
          classified.url || citation.url,
          classified.canonical_url ?? null,
          classified.class,
          classified.numeric_match ?? verified.numeric_match ?? null,
          null,
          classified.content_version ?? null,
          null,
          new Date().toISOString(),
          classified.cited_passage ?? null,
          classified.passage_offset ?? null,
          classified.heading_context ?? null,
        )
        .run();

      summary.observations++;

      if (isMisattribution(classified.class)) {
        await db
          .prepare(
            `INSERT INTO misattributions (id, observation_id, domain, claim_text, model, detected_at, severity)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            crypto.randomUUID(),
            obsId,
            classified.domain || '',
            citation.supportedText || citation.snippet || '',
            run.model,
            new Date().toISOString(),
            'commercial',
          )
          .run();
        summary.misattributions++;
      }

      await sleep(300);
    }

    const parametric = detectParametricRecall(
      parsed.answerText,
      citationDomains,
      tenantDomain ? [tenantDomain] : [],
    );

    for (const p of parametric) {
      const obsId = crypto.randomUUID();
      await db
        .prepare(
          `INSERT INTO observations (
            id, run_id, domain, url, canonical_url, class, verified_at
          ) VALUES (?, ?, ?, NULL, NULL, ?, ?)`,
        )
        .bind(obsId, run.id, p.domain, 'PARAMETRIC_RECALL', new Date().toISOString())
        .run();
      summary.parametric++;
      summary.observations++;
    }
  }

  return summary;
}

async function resolveTenantDomain(db, tenantId) {
  if (!tenantId) return null;
  const row = await db.prepare(`SELECT apex_host FROM tenants WHERE id = ?`).bind(tenantId).first();
  return row?.apex_host ?? null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
