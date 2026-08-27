import { askQuestion, persistRuns } from './ask.js';

const CORE_QUESTION_LIMIT = 10;

export async function runCitationBatch(env) {
  if (!env.DB) {
    console.warn('[citations] no DB binding');
    return { skipped: true, reason: 'no_db' };
  }

  const { results: questions } = await env.DB.prepare(
    `SELECT id, text FROM questions ORDER BY id LIMIT ?`,
  )
    .bind(CORE_QUESTION_LIMIT)
    .all();

  const summary = { asked: 0, runs: 0, errors: [] };

  for (const q of questions ?? []) {
    summary.asked++;
    try {
      const answers = await askQuestion(q.text, env);
      const saved = await persistRuns(env.DB, q.id, answers, 1);
      summary.runs += saved.length;
      await sleep(2000);
    } catch (err) {
      summary.errors.push({ question_id: q.id, error: err.message });
    }
  }

  return summary;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
