/** Config + run staleness drift (Block 6.3). */

export const DEFAULT_MAX_DAYS_WITHOUT_RUN = 8;

/**
 * @returns {Promise<Array<{ kind: string, severity: string, key: string, message: string }>>}
 */
export async function checkConfigDrift(db, { now = new Date() } = {}) {
  if (!db) return [];

  const alerts = [];
  const { results: rows } = await db
    .prepare(`SELECT key, value, expires_at FROM platform_config ORDER BY key`)
    .all();

  for (const row of rows ?? []) {
    if (!row.expires_at) continue;
    const expires = Date.parse(row.expires_at);
    if (!Number.isFinite(expires)) continue;
    if (expires < now.getTime()) {
      alerts.push({
        kind: 'config',
        severity: 'warning',
        key: row.key,
        message: `platform_config.${row.key} expired ${row.expires_at}`,
      });
    }
  }

  return alerts;
}

/**
 * @returns {Promise<Array<{ kind: string, severity: string, message: string, days?: number }>>}
 */
export async function checkRunStaleness(db, { maxDays = DEFAULT_MAX_DAYS_WITHOUT_RUN, now = new Date() } = {}) {
  if (!db) return [];

  const row = await db.prepare(`SELECT MAX(run_at) AS last_run FROM runs`).first();
  if (!row?.last_run) {
    return [
      {
        kind: 'runs',
        severity: 'critical',
        message: 'No runs in D1 — baseline/measurement not started',
        days: null,
      },
    ];
  }

  const last = Date.parse(row.last_run);
  if (!Number.isFinite(last)) return [];

  const days = Math.floor((now.getTime() - last) / 86400000);
  if (days <= maxDays) return [];

  return [
    {
      kind: 'runs',
      severity: days > maxDays + 7 ? 'critical' : 'warning',
      message: `${days} days since last run (threshold ${maxDays}d)`,
      days,
      last_run: row.last_run,
    },
  ];
}

/**
 * High unverified bot ratio may skew cache-index.
 */
export async function checkBotDrift(db, { windowDays = 7, maxUnverifiedRatio = 0.5 } = {}) {
  if (!db) return [];

  const row = await db
    .prepare(
      `SELECT
         SUM(CASE WHEN verified = 1 THEN 1 ELSE 0 END) AS verified,
         SUM(CASE WHEN verified != 1 THEN 1 ELSE 0 END) AS unverified
       FROM bot_hits
       WHERE hit_at >= datetime('now', ?)`,
    )
    .bind(`-${windowDays} days`)
    .first();

  const verified = row?.verified ?? 0;
  const unverified = row?.unverified ?? 0;
  const total = verified + unverified;
  if (total < 5) return [];

  const ratio = unverified / total;
  if (ratio <= maxUnverifiedRatio) return [];

  return [
    {
      kind: 'access',
      severity: 'warning',
      message: `Unverified bot hits ${Math.round(ratio * 100)}% (${unverified}/${total}) — cache-index may skew`,
      unverified_ratio: Math.round(ratio * 1000) / 1000,
    },
  ];
}
