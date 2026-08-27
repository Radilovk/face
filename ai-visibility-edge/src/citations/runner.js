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

  const summary = { asked: 0, runs: 0, errors: [], reprocess: null };

  for (const q of questions ?? []) {
    for (let rep = 1; rep <= REPETITIONS; rep++) {
      summary.asked++;
      try {
        const answers = await askQuestion(q.text, env);
        const saved = await persistRuns(env.DB, q.id, answers, rep);
        summary.runs += saved.length;
        await sleep(2000);
      } catch (err) {
        summary.errors.push({ question_id: q.id, repetition: rep, error: err.message });
      }
    }
  }

  try {
    summary.reprocess = await reprocessRuns(env, { limit: 30 });
  } catch (err) {
    summary.errors.push({ step: 'reprocess', error: err.message });
  }

  return summary;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
