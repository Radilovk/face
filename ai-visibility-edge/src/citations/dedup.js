/**
 * Skip LLM calls when the same question+model was measured recently.
 */

export async function filterModelsByDedup(db, questionId, models, dedupDays) {
  if (!db || !dedupDays || dedupDays <= 0 || !models?.length) {
    return { models: models ?? [], skipped: [] };
  }

  const kept = [];
  const skipped = [];

  for (const model of models) {
    const row = await db
      .prepare(
        `SELECT 1 as ok FROM runs
         WHERE question_id = ? AND model = ?
           AND run_at >= datetime('now', '-' || ? || ' days')
         LIMIT 1`,
      )
      .bind(questionId, model, dedupDays)
      .first();

    if (row?.ok) skipped.push(model);
    else kept.push(model);
  }

  return { models: kept, skipped };
}
