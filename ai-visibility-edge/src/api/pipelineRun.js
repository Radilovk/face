import { probeDomain, persistDiagnostic } from '../diagnose/probe.js';
import { passageAutonomy, computeDiagnosticScore } from '../diagnose/score.js';
import { generateAndSaveQuestions } from './questions.js';
import { resolveTenantByDomain } from './questions.js';
import { fetchTenantRecommendations } from '../diagnose/recommendations.js';
import { runCitationBatchForTenant } from '../citations/runner.js';
import { reprocessRuns } from '../citations/reprocess.js';
import { invalidateAdvisorContext } from '../advisor/context.js';

/**
 * Run automated pipeline for one site (no user action between steps).
 */
export async function runSitePipeline(env, domain, options = {}) {
  if (!env.DB) return { error: 'db_not_bound' };

  const tenant = await resolveTenantByDomain(env.DB, domain);
  if (!tenant) return { error: 'unknown_domain', domain };

  const result = {
    domain: tenant.apex_host,
    tenant_id: tenant.id,
    started_at: new Date().toISOString(),
    steps: {},
  };

  if (options.audit !== false) {
    result.steps.audit = await runAuditStep(env, tenant.apex_host);
  }

  if (options.generate_questions !== false) {
    const qCount = await env.DB.prepare(
      `SELECT COUNT(*) as n FROM questions WHERE tenant_id = ?`,
    )
      .bind(tenant.id)
      .first();

    if ((qCount?.n ?? 0) === 0 || options.replace_questions) {
      result.steps.questions = await generateAndSaveQuestions(env.DB, {
        domain: tenant.apex_host,
        brand: tenant.name,
        verticalLabel: tenant.vertical_name,
        replaceAuto: Boolean(options.replace_questions),
      });
    } else {
      result.steps.questions = { skipped: true, existing: qCount.n };
    }
  }

  if (options.measure !== false && hasMeasureKeys(env)) {
    result.steps.measure = await runCitationBatchForTenant(env, tenant.id, {
      questionLimit: options.question_limit ?? 5,
      repetitions: options.repetitions ?? 1,
      reprocess: false,
    });
  } else if (options.measure !== false) {
    result.steps.measure = { skipped: true, reason: 'missing_api_keys' };
  }

  if (options.reprocess !== false) {
    result.steps.reprocess = await reprocessRuns(env, { limit: 50, tenantId: tenant.id });
  }

  if (options.recommendations !== false) {
    const edgeConfig = await import('../config/tenantEdge.js').then((m) =>
      m.loadEdgeConfig(env, tenant.apex_host),
    );
    const edgeActive = Boolean(edgeConfig?.edge?.enabled) && Boolean(tenant.edge_enabled);
    const rec = await fetchTenantRecommendations(env, {
      domain: tenant.apex_host,
      name: tenant.name,
      vertical_id: tenant.vertical_id,
      canary: Boolean(tenant.is_canary),
      apex_host: tenant.apex_host,
    }, { edgeActive });
    result.steps.recommendations = {
      count: rec.recommendations?.length ?? 0,
      top: (rec.recommendations ?? []).slice(0, 5),
    };
  }

  if (options.edge !== false) {
    try {
      const { getEdgeDecision } = await import('./edge.js');
      const decision = await getEdgeDecision(env, tenant.apex_host);
      result.steps.edge = {
        status: decision.edge_active ? 'active' : 'decision_ready',
        verdict: decision.verdict?.headline,
        fixes: (decision.fixes ?? []).map((f) => f.id),
        pipeline_next: decision.pipeline_next,
      };
    } catch (err) {
      result.steps.edge = { status: 'error', message: err.message };
    }
  }

  result.finished_at = new Date().toISOString();
  await invalidateAdvisorContext(env, tenant.apex_host);
  return result;
}

async function runAuditStep(env, domain) {
  const probe = await probeDomain(domain);
  const passage = passageAutonomy(probe.raw_json?.text_sample ?? '');
  const score = computeDiagnosticScore(probe, passage);

  if (env.DB) {
    await persistDiagnostic(env.DB, probe, score);
  }

  return {
    http_status: probe.http_status,
    robots_ai_policy: probe.robots_ai_policy,
    jsonld_blocks: probe.jsonld_blocks,
    html_text_chars: probe.html_text_chars,
    diagnostic_score: score,
    final_url: probe.raw_json?.final_url,
    redirect_hops: probe.raw_json?.redirect_chain?.length ?? 1,
  };
}

function hasMeasureKeys(env) {
  return Boolean(env.OPENAI_API_KEY || env.GEMINI_API_KEY);
}
