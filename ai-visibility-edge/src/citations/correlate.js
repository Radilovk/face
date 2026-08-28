/** Correlation window — bot hits ↔ observations (Block 5.1). */
export const CORRELATE_WINDOW_HOURS = 72;

export function hoursBetween(earlierIso, laterIso) {
  if (!earlierIso || !laterIso) return null;
  const ms = new Date(laterIso) - new Date(earlierIso);
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.round((ms / 3600000) * 10) / 10;
}

/**
 * Hours from last verified bot crawl to observation run.
 * @returns {{ cache_age_hours: number|null, method: string, last_bot_hit_at?: string }}
 */
export function correlateFromBotHit({ runAt, lastBotHitAt }) {
  if (!lastBotHitAt) {
    return { cache_age_hours: null, method: 'no_bot_coverage' };
  }
  return {
    cache_age_hours: hoursBetween(lastBotHitAt, runAt),
    method: 'bot_hit',
    last_bot_hit_at: lastBotHitAt,
  };
}

/** Hours from page dateModified to observation run (external domains). */
export function correlateFromDateModified({ runAt, dateModified }) {
  if (!dateModified) {
    return { cache_age_hours: null, method: 'no_freshness_signal' };
  }
  const parsed = Date.parse(dateModified);
  if (!Number.isFinite(parsed)) {
    return { cache_age_hours: null, method: 'invalid_date_modified' };
  }
  return {
    cache_age_hours: hoursBetween(new Date(parsed).toISOString(), runAt),
    method: 'date_modified',
    date_modified: dateModified,
  };
}

export async function findLastVerifiedBotHit(db, tenantId, { beforeAt, windowHours = CORRELATE_WINDOW_HOURS } = {}) {
  if (!db || !tenantId || !beforeAt) return null;

  const row = await db
    .prepare(
      `SELECT hit_at FROM bot_hits
       WHERE tenant_id = ?
         AND verified = 1
         AND hit_at <= ?
         AND hit_at >= datetime(?, ?)
       ORDER BY hit_at DESC
       LIMIT 1`,
    )
    .bind(tenantId, beforeAt, beforeAt, `-${windowHours} hours`)
    .first();

  return row?.hit_at ?? null;
}

function normalizeDomain(domain) {
  return String(domain ?? '')
    .toLowerCase()
    .replace(/^www\./, '');
}

/**
 * Compute cache_age_hours for one observation row.
 */
export async function computeCacheAgeForObservation(db, {
  domain,
  runAt,
  tenantId,
  tenantDomain,
  dateModified,
  windowHours = CORRELATE_WINDOW_HOURS,
}) {
  const obsDomain = normalizeDomain(domain);
  const ownDomain = normalizeDomain(tenantDomain);

  if (tenantId && ownDomain && obsDomain === ownDomain) {
    const lastHit = await findLastVerifiedBotHit(db, tenantId, { beforeAt: runAt, windowHours });
    return correlateFromBotHit({ runAt, lastBotHitAt: lastHit });
  }

  return correlateFromDateModified({ runAt, dateModified });
}
