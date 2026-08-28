import { fetchDriftStatus, checkRecentParseDrift } from '../drift/index.js';
import { parseModelResponse } from '../citations/extract.js';

export async function getDriftStatus(env, url) {
  if (!env.DB) return { error: 'db_not_bound' };

  const includeRecent = url.searchParams.get('recent') === '1';
  const status = await fetchDriftStatus(env.DB);

  if (includeRecent) {
    const parseAlerts = await checkRecentParseDrift(env.DB, parseModelResponse, {
      limit: parseInt(url.searchParams.get('limit') ?? '10', 10) || 10,
    });
    status.alerts = [...status.alerts, ...parseAlerts];
    status.critical = status.alerts.filter((a) => a.severity === 'critical').length;
    status.warning = status.alerts.filter((a) => a.severity === 'warning').length;
    status.ok = status.critical === 0;
  }

  return status;
}
