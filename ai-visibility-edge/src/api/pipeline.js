import { stepStatus, PIPELINE_STEPS } from '../ui/workflow.js';
import { listQuestions, resolveTenantByDomain } from './questions.js';
import { fetchTenantRecommendations } from '../diagnose/recommendations.js';
import { probeDomain } from '../diagnose/probe.js';

export async function getSitePipeline(env, domain) {
  if (!env.DB) {
    return { error: 'db_not_bound' };
  }

  const tenant = await resolveTenantByDomain(env.DB, domain);
  if (!tenant) {
    return { error: 'unknown_domain', domain, steps: PIPELINE_STEPS.map((s) => ({ ...s, status: 'locked' })) };
  }

  const questions = await listQuestions(env.DB, { tenantId: tenant.id });
  const runRow = await env.DB.prepare(
    `SELECT COUNT(*) as n FROM runs r JOIN questions q ON q.id = r.question_id WHERE q.tenant_id = ?`,
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

  let probe = null;
  try {
    probe = await probeDomain(tenant.apex_host);
  } catch {
    /* optional */
  }

  let recommendationCount = 0;
  try {
    const tenantMeta = {
      domain: tenant.apex_host,
      name: tenant.name,
      vertical_id: tenant.vertical_id,
      canary: Boolean(tenant.is_canary),
    };
    const rec = await fetchTenantRecommendations(env, tenantMeta);
    recommendationCount = rec.recommendations?.length ?? 0;
  } catch {
    /* optional */
  }

  const ctx = {
    tenant: true,
    probe,
    questionCount: questions.length,
    runCount: runRow?.n ?? 0,
    obsCount: obsRow?.n ?? 0,
    recommendationCount,
  };

  const steps = PIPELINE_STEPS.map((s) => ({
    id: s.id,
    title: s.title,
    short: s.short,
    auto: s.auto,
    manual: s.manual,
    desc: s.desc,
    status: stepStatus(s.id, ctx),
  }));

  return {
    domain: tenant.apex_host,
    name: tenant.name,
    vertical_id: tenant.vertical_id,
    vertical_name: tenant.vertical_name,
    steps,
    stats: {
      questions: questions.length,
      runs: runRow?.n ?? 0,
      observations: obsRow?.n ?? 0,
      probe_score_hint: probe?.robots_ai_policy ?? null,
    },
  };
}

export async function listSitesFromDb(env) {
  if (!env.DB) return [];
  const { results } = await env.DB.prepare(
    `SELECT t.apex_host as domain, t.name, t.status, t.is_canary, wd.vertical_id, v.name as vertical
     FROM tenants t
     LEFT JOIN watched_domains wd ON wd.tenant_id = t.id AND wd.role = 'tenant'
     LEFT JOIN verticals v ON v.id = wd.vertical_id
     ORDER BY t.apex_host`,
  ).all();
  return results ?? [];
}
