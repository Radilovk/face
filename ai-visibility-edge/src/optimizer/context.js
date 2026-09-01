/**
 * Full optimization context for autonomous planner (Block 7).
 */
import { fetchDomainStrategy } from '../diagnose/strategy.js';
import { analyzeDisplacement } from '../diagnose/displacement.js';
import { getEdgeDecision } from '../api/edge.js';
import { getApplyPlan } from '../api/apply.js';
import { getSitePipeline } from '../api/pipeline.js';
import { resolveTenantByDomain } from '../api/questions.js';
import { buildSiteBrief } from '../diagnose/siteBrief.js';
import { probeDomain } from '../diagnose/probe.js';

export async function buildOptimizerContext(env, domain) {
  const normalized = domain.replace(/^www\./, '').toLowerCase().split('/')[0];

  if (!env.DB) {
    return { error: 'db_not_bound', domain: normalized };
  }

  const tenant = await resolveTenantByDomain(env.DB, normalized);
  if (!tenant) {
    return { error: 'unknown_domain', domain: normalized };
  }

  const [strategy, edge, apply, pipeline, displacement, probe] = await Promise.all([
    fetchDomainStrategy(env, normalized).catch(() => null),
    getEdgeDecision(env, normalized).catch(() => null),
    getApplyPlan(env, normalized).catch(() => null),
    getSitePipeline(env, normalized).catch(() => null),
    tenant.vertical_id
      ? analyzeDisplacement(env.DB, { domain: normalized, verticalId: tenant.vertical_id }).catch(() => null)
      : null,
    probeDomain(normalized, { brand: tenant.name ?? undefined }).catch(() => null),
  ]);

  const stats = await loadTenantStats(env.DB, tenant.id);
  const siteBrief = probe ? buildSiteBrief({ probe, brand: tenant.name, verticalLabel: tenant.vertical_name }) : null;

  return {
    domain: normalized,
    tenant: {
      id: tenant.id,
      name: tenant.name,
      apex_host: tenant.apex_host,
      vertical_id: tenant.vertical_id,
      vertical_name: tenant.vertical_name,
      is_canary: Boolean(tenant.is_canary),
      edge_enabled: Boolean(tenant.edge_enabled),
      edge_status: tenant.edge_status ?? 'measurement_only',
    },
    stats,
    strategy: strategy
      ? {
          score: strategy.score,
          verdict: strategy.verdict,
          pillars: strategy.pillars,
          top_issues: (strategy.recommendations ?? []).slice(0, 8),
          plan_week: strategy.plan?.this_week?.slice(0, 5),
        }
      : null,
    probe: strategy?.probe ?? (probe ? summarizeProbe(probe) : null),
    site_brief: siteBrief,
    displacement: displacement
      ? {
          displacement_rate: displacement.displacement_rate,
          displaced_count: displacement.displaced_count,
          total_runs: displacement.total_runs,
          events: displacement.events?.slice(0, 5),
          competitors: displacement.competitors_tracked?.slice(0, 8),
        }
      : null,
    edge: edge
      ? {
          status: edge.status,
          edge_active: edge.edge_active,
          verdict: edge.verdict,
          fixes: edge.fixes,
          blockers: edge.blockers,
          pipeline_next: edge.pipeline_next,
        }
      : null,
    apply: apply && !apply.error
      ? {
          summary: apply.summary,
          fix_count: apply.fixes?.length ?? 0,
          manual_fixes: (apply.fixes ?? []).filter((f) => f.type === 'manual').length,
        }
      : null,
    pipeline: pipeline && !pipeline.error ? { stats: pipeline.stats, steps: pipeline.steps } : null,
    generated_at: new Date().toISOString(),
  };
}

async function loadTenantStats(db, tenantId) {
  const [q, r, o, pending] = await Promise.all([
    db.prepare(`SELECT COUNT(*) as n FROM questions WHERE tenant_id = ?`).bind(tenantId).first(),
    db.prepare(
      `SELECT COUNT(*) as n FROM runs r JOIN questions q ON q.id = r.question_id WHERE q.tenant_id = ?`,
    )
      .bind(tenantId)
      .first(),
    db.prepare(
      `SELECT COUNT(*) as n FROM observations o
       JOIN runs r ON r.id = o.run_id JOIN questions q ON q.id = r.question_id WHERE q.tenant_id = ?`,
    )
      .bind(tenantId)
      .first(),
    db.prepare(
      `SELECT COUNT(*) as n FROM runs r
       JOIN questions q ON q.id = r.question_id
       WHERE q.tenant_id = ?
         AND NOT EXISTS (SELECT 1 FROM observations o WHERE o.run_id = r.id)`,
    )
      .bind(tenantId)
      .first(),
  ]);

  return {
    questionCount: q?.n ?? 0,
    runCount: r?.n ?? 0,
    obsCount: o?.n ?? 0,
    pendingReprocess: pending?.n ?? 0,
  };
}

function summarizeProbe(probe) {
  return {
    http_status: probe.http_status,
    jsonld_blocks: probe.jsonld_blocks,
    robots_ai_policy: probe.robots_ai_policy,
    html_text_chars: probe.html_text_chars,
    final_url: probe.raw_json?.final_url,
    redirect_chain: probe.raw_json?.redirect_chain ?? [],
  };
}
