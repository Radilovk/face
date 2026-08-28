import { resolveTenantByDomain } from './questions.js';
import { computeSov, currentPeriod } from '../index/sov.js';
import { fetchBotHitStats } from '../observe/botLog.js';
import { buildCacheIndex } from '../cache/index.js';

/** Per-site measurement stats for dashboard (Layer 1 visibility). */
export async function fetchSiteStats(env, domain) {
  if (!env.DB) return { error: 'db_not_bound' };

  const tenant = await resolveTenantByDomain(env.DB, domain);
  if (!tenant) {
    return { error: 'unknown_domain', domain, hint: 'Добавете сайта през dashboard (+ Сайт).' };
  }

  const runsRow = await env.DB.prepare(
    `SELECT COUNT(*) as n FROM runs r
     JOIN questions q ON q.id = r.question_id
     WHERE q.tenant_id = ?`,
  )
    .bind(tenant.id)
    .first();

  const obsRow = await env.DB.prepare(
    `SELECT COUNT(*) as n FROM observations o
     JOIN runs r ON r.id = o.run_id
     JOIN questions q ON q.id = r.question_id
     WHERE q.tenant_id = ?`,
  )
    .bind(tenant.id)
    .first();

  const pendingRow = await env.DB.prepare(
    `SELECT COUNT(*) as n FROM runs r
     JOIN questions q ON q.id = r.question_id
     WHERE q.tenant_id = ?
       AND NOT EXISTS (SELECT 1 FROM observations o WHERE o.run_id = r.id)`,
  )
    .bind(tenant.id)
    .first();

  const qRow = await env.DB.prepare(`SELECT COUNT(*) as n FROM questions WHERE tenant_id = ?`)
    .bind(tenant.id)
    .first();

  let sov = null;
  if (tenant.vertical_id) {
    try {
      sov = await computeSov(env.DB, {
        domain: tenant.apex_host,
        verticalId: tenant.vertical_id,
        period: currentPeriod(),
        persist: false,
      });
    } catch {
      /* optional */
    }
  }

  const runs = runsRow?.n ?? 0;
  const observations = obsRow?.n ?? 0;
  const pendingReprocess = pendingRow?.n ?? 0;

  let botHits = null;
  let cacheIndex = null;
  try {
    botHits = await fetchBotHitStats(env.DB, tenant.id, { days: 7 });
    cacheIndex = await buildCacheIndex(env.DB, { domain: tenant.apex_host, windowHours: 72 });
  } catch {
    /* optional aggregates */
  }

  return {
    domain: tenant.apex_host,
    tenant_id: tenant.id,
    questions: qRow?.n ?? 0,
    runs,
    observations,
    pending_reprocess: pendingReprocess,
    sov: sov
      ? {
          period: sov.period,
          sov: sov.sov,
          share: sov.share,
          tenant_citations: sov.tenant_citations,
          sessions: sov.sessions,
        }
      : null,
    layer1_ready: runs > 0 && observations > 0,
    needs_reprocess: pendingReprocess > 0,
    bot_hits: botHits?.error ? null : botHits,
    cache_index: cacheIndex?.error ? null : {
      coverage: cacheIndex?.coverage ?? 0,
      observations_total: cacheIndex?.observations_total ?? 0,
      observations_with_age: cacheIndex?.observations_with_age ?? 0,
      cache_age_hours: cacheIndex?.cache_age_hours ?? null,
      note: cacheIndex?.note ?? null,
    },
    generated_at: new Date().toISOString(),
  };
}
