import { askQuestion, persistRuns } from './ask.js';
import { reprocessRuns } from './reprocess.js';

const REPETITIONS = 3;

export async function runCitationBatch(env) {
  if (!env.DB) {
    console.warn('[citations] no DB binding');
    return { skipped: true, reason: 'no_db' };
  }

  const { results: questions } = await env.DB.prepare(
    `SELECT id, text FROM questions ORDER BY id`,
  ).all();

  return runQuestionsBatch(env, questions ?? [], { repetitions: REPETITIONS, reprocess: true });
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
  });
}

async function runQuestionsBatch(env, questions, options) {
  const repetitions = options.repetitions ?? REPETITIONS;
  const summary = { asked: 0, runs: 0, errors: [], reprocess: null, tenant_id: options.tenantId ?? null };

  for (const q of questions) {
    for (let rep = 1; rep <= repetitions; rep++) {
      summary.asked++;
      try {
        const answers = await askQuestion(q.text, env);
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
