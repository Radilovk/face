import {
  computeCacheAgeForObservation,
  CORRELATE_WINDOW_HOURS,
} from '../citations/correlate.js';

export function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/** Distribution stats — never a single number without coverage (Block 5.3). */
export function computeDistribution(samples) {
  const total = samples.length;
  const values = samples.filter((v) => v != null && Number.isFinite(v)).sort((a, b) => a - b);
  const count = values.length;

  return {
    count,
    coverage: total > 0 ? Math.round((count / total) * 1000) / 1000 : 0,
    median: percentile(values, 0.5),
    p25: percentile(values, 0.25),
    p75: percentile(values, 0.75),
    min: values[0] ?? null,
    max: values[count - 1] ?? null,
  };
}

/**
 * Build cache-index for domain or vertical (Block 5.2–5.3).
 * Tenant domains: bot-hit correlation; external: dateModified proxy.
 */
export async function buildCacheIndex(db, options = {}) {
  if (!db) return { error: 'db_not_bound' };

  const {
    domain = null,
    verticalId = null,
    model = null,
    windowHours = CORRELATE_WINDOW_HOURS,
    limit = 200,
  } = options;

  if (!domain && !verticalId) {
    return { error: 'domain_or_vertical_id_required' };
  }

  let sql = `
    SELECT o.id, o.domain, o.cache_age_hours, o.content_version,
           r.run_at, r.model, q.tenant_id, t.apex_host AS tenant_domain
    FROM observations o
    JOIN runs r ON r.id = o.run_id
    JOIN questions q ON q.id = r.question_id
    LEFT JOIN tenants t ON t.id = q.tenant_id
    WHERE r.run_at >= datetime('now', ?)
      AND o.class NOT IN ('PARAMETRIC_RECALL', 'FABRICATED_URL')
  `;
  const binds = [`-${windowHours} hours`];

  if (domain) {
    const d = domain.replace(/^www\./, '').toLowerCase();
    sql += ` AND (o.domain = ? OR o.domain = ? OR t.apex_host = ? OR t.apex_host = ?)`;
    binds.push(d, `www.${d}`, d, `www.${d}`);
  }

  if (verticalId) {
    sql += ` AND q.vertical_id = ?`;
    binds.push(verticalId);
  }

  if (model) {
    sql += ` AND r.model = ?`;
    binds.push(model);
  }

  sql += ` ORDER BY r.run_at DESC LIMIT ?`;
  binds.push(limit);

  const { results: rows } = await db.prepare(sql).bind(...binds).all();

  const samples = [];
  const byMethod = {};
  let recomputed = 0;

  for (const row of rows ?? []) {
    let age = row.cache_age_hours;

    if (age == null) {
      const correlated = await computeCacheAgeForObservation(db, {
        domain: row.domain,
        runAt: row.run_at,
        tenantId: row.tenant_id,
        tenantDomain: row.tenant_domain,
        dateModified: null,
        windowHours,
      });
      age = correlated.cache_age_hours;
      byMethod[correlated.method] = (byMethod[correlated.method] ?? 0) + 1;
      if (age != null) recomputed++;
    } else {
      byMethod.stored = (byMethod.stored ?? 0) + 1;
    }

    samples.push(age);
  }

  const distribution = computeDistribution(samples);

  return {
    domain: domain ?? null,
    vertical_id: verticalId ?? null,
    model: model ?? 'all',
    window_hours: windowHours,
    observations_total: rows?.length ?? 0,
    observations_with_age: distribution.count,
    coverage: distribution.coverage,
    cache_age_hours: {
      median: distribution.median,
      p25: distribution.p25,
      p75: distribution.p75,
      min: distribution.min,
      max: distribution.max,
    },
    correlation_methods: byMethod,
    recomputed_from_bot_hits: recomputed,
    generated_at: new Date().toISOString(),
    note:
      distribution.count === 0
        ? 'Няма достатъчно данни — нужни bot hits (tenant) или dateModified (external).'
        : null,
  };
}
