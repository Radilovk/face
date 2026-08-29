import { askQuestion, persistRuns, resolveAskModels } from './ask.js';
import { reprocessRuns } from './reprocess.js';
import { filterModelsByDedup } from './dedup.js';
import {
  cronQuestionsPerTenant,
  cronRepetitions,
  economyEnabled,
  isoWeekIndex,
  measureDedupDays,
  pickRotatingQuestions,
  resolveMeasureModels,
} from '../config/economy.js';

const LEGACY_REPETITIONS = 3;

export async function runCitationBatch(env) {
  if (!env.DB) {
    console.warn('[citations] no DB binding');
    return { skipped: true, reason: 'no_db' };
  }

  if (economyEnabled(env)) {
    return runCitationBatchEconomy(env);
  }

  const { results: questions } = await env.DB.prepare(
    `SELECT id, text FROM questions ORDER BY id`,
  ).all();

  return runQuestionsBatch(env, questions ?? [], {
    repetitions: LEGACY_REPETITIONS,
    reprocess: true,
    purpose: 'cron',
  });
}

/** Economy cron: 1 rep, rotating subset per tenant, dedup, optional gemini-only. */
async function runCitationBatchEconomy(env) {
  const perTenant = cronQuestionsPerTenant(env);
  const week = isoWeekIndex();

  const { results: tenants } = await env.DB.prepare(
    `SELECT DISTINCT tenant_id FROM questions WHERE tenant_id IS NOT NULL ORDER BY tenant_id`,
  ).all();

  const questions = [];
  for (const row of tenants ?? []) {
    const { results: tenantQs } = await env.DB.prepare(
      `SELECT id, text FROM questions WHERE tenant_id = ? ORDER BY id`,
    )
      .bind(row.tenant_id)
      .all();

    const picked = pickRotatingQuestions(tenantQs ?? [], perTenant, week);
    for (const q of picked) {
      questions.push({ ...q, tenant_id: row.tenant_id });
    }
  }

  if (!questions.length) {
    const { results: fallback } = await env.DB.prepare(
      `SELECT id, text FROM questions ORDER BY id LIMIT ?`,
    )
      .bind(perTenant)
      .all();
    questions.push(...(fallback ?? []));
  }

  return runQuestionsBatch(env, questions, {
    repetitions: cronRepetitions(env),
    reprocess: true,
    purpose: 'cron',
    economy: true,
    rotation_week: week,
    questions_per_tenant: perTenant,
  });
}

/** Measure one tenant — for UI pipeline (limited questions/reps to fit Worker timeout). */
export async function runCitationBatchForTenant(env, tenantId, options = {}) {
  if (!env.DB) return { skipped: true, reason: 'no_db' };

  const limit = options.questionLimit ?? 5;
  const { results: questions } = await env.DB.prepare(
    `SELECT id, text FROM questions WHERE tenant_id = ? ORDER BY id LIMIT ?`,
  )
    .bind(tenantId, limit)
    .all();

  if (!questions?.length) {
    return { skipped: true, reason: 'no_questions', tenant_id: tenantId };
  }

  return runQuestionsBatch(env, questions, {
    repetitions: options.repetitions ?? 1,
    reprocess: options.reprocess ?? false,
    tenantId,
    purpose: 'pipeline',
    dedupDays: options.dedupDays,
    models: options.models,
  });
}

async function runQuestionsBatch(env, questions, options) {
  const purpose = options.purpose ?? 'default';
  const repetitions = options.repetitions ?? LEGACY_REPETITIONS;
  const dedupDays = options.dedupDays ?? measureDedupDays(env, purpose);
  const modelOverride = options.models ?? resolveMeasureModels(env, purpose);

  const summary = {
    asked: 0,
    runs: 0,
    skipped_dedup: 0,
    errors: [],
    reprocess: null,
    tenant_id: options.tenantId ?? null,
    economy: options.economy ?? false,
    rotation_week: options.rotation_week ?? null,
    questions_per_tenant: options.questions_per_tenant ?? null,
    dedup_days: dedupDays,
    models: modelOverride ?? 'all_configured',
  };

  for (const q of questions) {
    for (let rep = 1; rep <= repetitions; rep++) {
      summary.asked++;
      try {
        const defaultModels = modelOverride ?? undefined;
        let modelsToAsk = defaultModels;

        if (dedupDays > 0 && env.DB) {
          const baseModels = defaultModels ?? resolveAskModels(env);
          const { models, skipped } = await filterModelsByDedup(env.DB, q.id, baseModels, dedupDays);
          summary.skipped_dedup += skipped.length;
          if (!models.length) continue;
          modelsToAsk = models;
        }

        const answers = await askQuestion(q.text, env, {
          models: modelsToAsk,
        });
        const saved = await persistRuns(env.DB, q.id, answers, rep);
        summary.runs += saved.length;
        await sleep(options.sleepMs ?? 1500);
      } catch (err) {
        summary.errors.push({ question_id: q.id, repetition: rep, error: err.message });
      }
    }
  }

  if (options.reprocess) {
    try {
      summary.reprocess = await reprocessRuns(env, {
        limit: 30,
        tenantId: options.tenantId ?? null,
      });
    } catch (err) {
      summary.errors.push({ step: 'reprocess', error: err.message });
    }
  }

  return summary;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
