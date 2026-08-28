import { ADAPTER_SCHEMA_REGISTRY, checkAdapterParse } from './schema.js';
import { checkConfigDrift, checkRunStaleness, checkBotDrift, DEFAULT_MAX_DAYS_WITHOUT_RUN } from './config.js';

export { ADAPTER_SCHEMA_REGISTRY, DEFAULT_MAX_DAYS_WITHOUT_RUN };

/**
 * Aggregate drift alerts for API / cron (Block 6.3).
 */
export async function fetchDriftStatus(db, options = {}) {
  const alerts = [];

  alerts.push(...(await checkConfigDrift(db, options)));
  alerts.push(...(await checkRunStaleness(db, options)));
  alerts.push(...(await checkBotDrift(db, options)));

  const critical = alerts.filter((a) => a.severity === 'critical').length;
  const warning = alerts.filter((a) => a.severity === 'warning').length;

  return {
    ok: critical === 0,
    critical,
    warning,
    alerts,
    checked_at: new Date().toISOString(),
  };
}

/** Compare live run parse stats vs registry (post-reprocess sanity). */
export async function checkRecentParseDrift(db, parseModelResponse, { limit = 20 } = {}) {
  if (!db || !parseModelResponse) return [];

  const { results: runs } = await db
    .prepare(`SELECT model, raw_response FROM runs ORDER BY run_at DESC LIMIT ?`)
    .bind(limit)
    .all();

  const alerts = [];
  for (const run of runs ?? []) {
    try {
      const parsed = parseModelResponse(run.model, JSON.parse(run.raw_response));
      alerts.push(...checkAdapterParse(run.model, parsed));
    } catch (err) {
      alerts.push({
        kind: 'schema',
        severity: 'critical',
        model: run.model,
        message: `Recent run parse failed: ${err.message}`,
      });
    }
  }

  return alerts;
}
