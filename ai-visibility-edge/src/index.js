import { withFailOpen } from './middleware/failOpen.js';
import { requireAdmin, requireAdminIfProduction } from './middleware/requireAdmin.js';
import { productionConfigIssues } from './config/production.js';
import { resolveWorkerPublicHost } from './config/workerHost.js';
import { cloudflareConfigured } from './cloudflare/api.js';
import { getAuthStatus } from './api/auth.js';
import { fetchSiteStats } from './api/siteStats.js';
import { fetchCacheIndex } from './api/cacheIndex.js';
import { fetchOnboardingStatus } from './api/onboarding.js';
import { getDriftStatus } from './api/drift.js';
import { fetchDriftStatus } from './drift/index.js';
import { getModelsStatus } from './config/models.js';
import { getEconomyStatus } from './config/economy.js';
import { resolveBaselineId, baselineManifestKey } from './config/baseline.js';
import { loadTenantConfig } from './config/loader.js';
import { runCitationBatch } from './citations/runner.js';
import { reprocessRuns } from './citations/reprocess.js';
import { computeSov, currentPeriod } from './index/sov.js';
import { probeDomain, persistDiagnostic } from './diagnose/probe.js';
import { passageAutonomy, computeDiagnosticScore } from './diagnose/score.js';
import { analyzeDisplacement } from './diagnose/displacement.js';
import { buildDomainReport } from './diagnose/report.js';
import { fetchDomainStrategy } from './diagnose/strategy.js';
import { fetchDashboardSummary, fetchDashboardRecommendations, renderDashboardPage } from './ui/dashboard.js';
import { getSitePipeline, listSitesFromDb } from './api/pipeline.js';
import { runSitePipeline } from './api/pipelineRun.js';
import { registerSite, listVerticals, updateSite, fetchSite, listSites } from './api/sites.js';
import { fetchPlatformInfo } from './api/platform.js';
import { provisionTenantHostname, fetchTenantHostnameStatus } from './api/customHostnames.js';
import { applyTenantCloudflareAeo, runTenantSmoke } from './api/cloudflareAeo.js';
import { runCitationBatchForTenant } from './citations/runner.js';
import { getApplyPlan, runApplyPrep } from './api/apply.js';
import { getEdgeDecision, activateEdgeOptimization, getEdgeStatus } from './api/edge.js';
import { submitDomainIndexNow } from './api/indexNow.js';
import { handleAdvisorStatus, handleAdvisorChat } from './api/advisor.js';
import { fetchOptimizerPlan, runOptimizer, fetchOptimizerStatus } from './api/optimizer.js';
import { applyFindingFix, saveFindingManualOnly } from './api/findingsApply.js';
import { fetchManualExport, manualExportResponse } from './api/manualExport.js';
import { isPlatformHost } from './config/platform.js';
import { loadEdgeConfig } from './config/tenantEdge.js';
import { handleTenantRequest } from './enhance/handleTenant.js';
import { fetchTenantOrigin } from './enhance/tenantOrigin.js';
import { scheduleBotLog } from './observe/botLog.js';
import {
  listQuestions,
  generateAndSaveQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
} from './api/questions.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // Platform API/report routes — no fail-open race
    if (isPlatformRoute(url.pathname, url.hostname, env)) {
      return handleRequest(request, env, ctx);
    }
    // Tenant CNAME traffic — origin fetch must not hit 50ms budget
    if (!isPlatformHost(url.hostname, env)) {
      return handleRequest(request, env, ctx);
    }
    return withFailOpen(request, env, ctx, (req, environment) =>
      handleRequest(req, environment, ctx),
    );
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      (async () => {
        if (event.cron === '0 3 * * 1') {
          const summary = await runCitationBatch(env);
          console.log('[cron] citations', JSON.stringify(summary));
          if (env.DB) {
            const drift = await fetchDriftStatus(env.DB);
            console.log('[cron] drift', JSON.stringify({ ok: drift.ok, critical: drift.critical, warning: drift.warning }));
          }
        }
      })(),
    );
  },
};

async function handleRequest(request, env, ctx) {
  const url = new URL(request.url);

  if (url.pathname === '/health') {
    const issues = productionConfigIssues(env);
    return json(
      {
        ok: issues.length === 0,
        service: 'ai-visibility-edge',
        db: Boolean(env.DB),
        kv: Boolean(env.CACHE),
        cloudflare_hostname_api: cloudflareConfigured(env),
        worker_host: resolveWorkerPublicHost(env),
        production_issues: issues.length ? issues : undefined,
      },
      issues.length ? 503 : 200,
    );
  }

  if (url.pathname === '/api/auth/status') {
    return json(getAuthStatus(env));
  }

  if (url.pathname === '/api/models/status') {
    return json({ ...getModelsStatus(env), economy: getEconomyStatus(env) });
  }

  if (url.pathname === '/' || url.pathname === '/dashboard') {
    const origin = url.origin;
    return html(renderDashboardPage(origin));
  }

  if (url.pathname === '/api/advisor/status') {
    const status = await handleAdvisorStatus(env);
    return json(status);
  }

  if (url.pathname === '/api/advisor/chat' && request.method === 'POST') {
    const denied = requireAdmin(request, env);
    if (denied) return denied;
    const result = await handleAdvisorChat(request, env);
    return json(result, result.error ? (result.error === 'gemini_not_configured' ? 503 : 400) : 200);
  }

  if (url.pathname === '/api/dashboard/summary') {
    const summary = await fetchDashboardSummary(env);
    return json(summary);
  }

  if (url.pathname === '/api/dashboard/recommendations') {
    const domain = url.searchParams.get('domain');
    const result = await fetchDashboardRecommendations(env, { domain });
    if (result.error) return json(result, 404);
    return json(result);
  }

  if (url.pathname === '/api/dashboard/site-stats') {
    const missing = requireDb(env);
    if (missing) return missing;
    const domain = url.searchParams.get('domain');
    if (!domain) return json({ error: 'domain required' }, 400);
    const stats = await fetchSiteStats(env, domain);
    return json(stats, stats.error ? 404 : 200);
  }

  if (url.pathname === '/api/cache-index') {
    const missing = requireDb(env);
    if (missing) return missing;
    const result = await fetchCacheIndex(env, url);
    return json(result, result.error ? 400 : 200);
  }

  const onboardingMatch = url.pathname.match(/^\/api\/onboarding\/([^/]+)$/);
  if (onboardingMatch) {
    const missing = requireDb(env);
    if (missing) return missing;
    const status = await fetchOnboardingStatus(env, decodeURIComponent(onboardingMatch[1]));
    return json(status, status.error ? 404 : 200);
  }

  if (url.pathname === '/api/platform/info') {
    return json(await fetchPlatformInfo(env));
  }

  if (url.pathname === '/api/sites') {
    const missing = requireDb(env);
    if (missing) return missing;
    if (request.method === 'POST') {
      const denied = requireAdmin(request, env);
      if (denied) return denied;
      return sitesCreateEndpoint(request, env);
    }
    const excludePilot = url.searchParams.get('include_pilot') !== '1';
    const status = url.searchParams.get('status') || null;
    const sites = await listSites(env.DB, {
      excludePilot,
      status,
      limit: Number(url.searchParams.get('limit') ?? 500),
      offset: Number(url.searchParams.get('offset') ?? 0),
    });
    let countSql = 'SELECT COUNT(*) as n FROM tenants WHERE 1=1';
    const countBinds = [];
    if (excludePilot) countSql += ' AND is_pilot = 0';
    if (status) {
      countSql += ' AND status = ?';
      countBinds.push(status);
    }
    const total = await env.DB.prepare(countSql).bind(...countBinds).first();
    return json({ sites, total: total?.n ?? sites.length, exclude_pilot: excludePilot });
  }

  const siteMatch = url.pathname.match(/^\/api\/sites\/([^/]+)$/);
  if (siteMatch) {
    const missing = requireDb(env);
    if (missing) return missing;
    const domain = decodeURIComponent(siteMatch[1]);
    if (request.method === 'GET') {
      const result = await fetchSite(env.DB, domain);
      return json(result, result.error ? 404 : 200);
    }
    if (request.method === 'PATCH') {
      const denied = requireAdmin(request, env);
      if (denied) return denied;
      const body = await request.json().catch(() => ({}));
      const result = await updateSite(env.DB, domain, body);
      return json(result, result.error ? 400 : 200);
    }
  }

  const hostnameProvisionMatch = url.pathname.match(/^\/api\/hostnames\/([^/]+)\/provision$/);
  if (hostnameProvisionMatch && request.method === 'POST') {
    const missing = requireDb(env);
    if (missing) return missing;
    const denied = requireAdmin(request, env);
    if (denied) return denied;
    const result = await provisionTenantHostname(env, decodeURIComponent(hostnameProvisionMatch[1]));
    return json(result, result.error ? 400 : 200);
  }

  const hostnameStatusMatch = url.pathname.match(/^\/api\/hostnames\/([^/]+)$/);
  if (hostnameStatusMatch && request.method === 'GET') {
    const missing = requireDb(env);
    if (missing) return missing;
    const result = await fetchTenantHostnameStatus(env, decodeURIComponent(hostnameStatusMatch[1]));
    return json(result, result.error ? 404 : 200);
  }

  if (url.pathname === '/api/verticals') {
    const missing = requireDb(env);
    if (missing) return missing;
    const verticals = await listVerticals(env.DB);
    return json({ verticals });
  }

  if (url.pathname === '/api/measure/run' && request.method === 'POST') {
    const missing = requireDb(env);
    if (missing) return missing;
    const denied = requireAdmin(request, env);
    if (denied) return denied;
    return measureRunEndpoint(request, env);
  }

  const optimizerStatusMatch = url.pathname.match(/^\/api\/optimizer\/([^/]+)\/status$/);
  if (optimizerStatusMatch) {
    const missing = requireDb(env);
    if (missing) return missing;
    const status = await fetchOptimizerStatus(env, decodeURIComponent(optimizerStatusMatch[1]));
    return json(status);
  }

  const optimizerPlanMatch = url.pathname.match(/^\/api\/optimizer\/([^/]+)\/plan$/);
  if (optimizerPlanMatch) {
    const missing = requireDb(env);
    if (missing) return missing;
    const plan = await fetchOptimizerPlan(env, decodeURIComponent(optimizerPlanMatch[1]));
    return json(plan, plan.error ? 404 : 200);
  }

  const optimizerRunMatch = url.pathname.match(/^\/api\/optimizer\/([^/]+)\/run$/);
  if (optimizerRunMatch && request.method === 'POST') {
    const missing = requireDb(env);
    if (missing) return missing;
    const denied = requireAdmin(request, env);
    if (denied) return denied;
    const body = await request.json().catch(() => ({}));
    const result = await runOptimizer(env, decodeURIComponent(optimizerRunMatch[1]), body);
    return json(result, result.error ? 400 : 200);
  }

  const pipelineRunMatch = url.pathname.match(/^\/api\/pipeline\/([^/]+)\/run$/);
  if (pipelineRunMatch && request.method === 'POST') {
    const missing = requireDb(env);
    if (missing) return missing;
    const denied = requireAdmin(request, env);
    if (denied) return denied;
    return pipelineRunEndpoint(request, env, decodeURIComponent(pipelineRunMatch[1]));
  }

  const edgeDecisionMatch = url.pathname.match(/^\/api\/edge\/([^/]+)\/decision$/);
  if (edgeDecisionMatch) {
    const missing = requireDb(env);
    if (missing) return missing;
    const decision = await getEdgeDecision(env, decodeURIComponent(edgeDecisionMatch[1]));
    return json(decision, decision.error ? 404 : 200);
  }

  const edgeActivateMatch = url.pathname.match(/^\/api\/edge\/([^/]+)\/activate$/);
  if (edgeActivateMatch && request.method === 'POST') {
    const missing = requireDb(env);
    if (missing) return missing;
    const denied = requireAdmin(request, env);
    if (denied) return denied;
    const body = await request.json().catch(() => ({}));
    const result = await activateEdgeOptimization(env, decodeURIComponent(edgeActivateMatch[1]), body);
    return json(result, result.error ? 400 : 200);
  }

  const edgeSmokeMatch = url.pathname.match(/^\/api\/edge\/([^/]+)\/smoke$/);
  if (edgeSmokeMatch && request.method === 'GET') {
    const missing = requireDb(env);
    if (missing) return missing;
    const result = await runTenantSmoke(env, decodeURIComponent(edgeSmokeMatch[1]));
    return json(result, result.error ? 404 : 200);
  }

  const cfAeoMatch = url.pathname.match(/^\/api\/cloudflare\/([^/]+)\/apply-aeo$/);
  if (cfAeoMatch && request.method === 'POST') {
    const missing = requireDb(env);
    if (missing) return missing;
    const denied = requireAdmin(request, env);
    if (denied) return denied;
    const body = await request.json().catch(() => ({}));
    const result = await applyTenantCloudflareAeo(env, decodeURIComponent(cfAeoMatch[1]), body);
    return json(result, result.error ? 400 : 200);
  }

  const edgeStatusMatch = url.pathname.match(/^\/api\/edge\/([^/]+)\/status$/);
  if (edgeStatusMatch) {
    const missing = requireDb(env);
    if (missing) return missing;
    const status = await getEdgeStatus(env, decodeURIComponent(edgeStatusMatch[1]));
    return json(status);
  }

  const indexNowMatch = url.pathname.match(/^\/api\/indexnow\/([^/]+)$/);
  if (indexNowMatch && request.method === 'POST') {
    const missing = requireDb(env);
    if (missing) return missing;
    const denied = requireAdmin(request, env);
    if (denied) return denied;
    const body = await request.json().catch(() => ({}));
    const result = await submitDomainIndexNow(env, decodeURIComponent(indexNowMatch[1]), body);
    return json(result, result.error ? 400 : 200);
  }

  const applyMatch = url.pathname.match(/^\/api\/apply\/([^/]+)(?:\/run)?$/);
  if (applyMatch) {
    const missing = requireDb(env);
    if (missing) return missing;
    const domain = decodeURIComponent(applyMatch[1]);
    if (url.pathname.endsWith('/run') && request.method === 'POST') {
      const denied = requireAdmin(request, env);
      if (denied) return denied;
      const body = await request.json().catch(() => ({}));
      const result = await runApplyPrep(env, domain, body);
      return json(result, result.error ? 404 : 200);
    }
    const plan = await getApplyPlan(env, domain);
    return json(plan, plan.error ? 404 : 200);
  }

  const strategyMatch = url.pathname.match(/^\/api\/strategy\/([^/]+)$/);
  if (strategyMatch) {
    const strategy = await fetchDomainStrategy(env, decodeURIComponent(strategyMatch[1]));
    return json(strategy);
  }

  const manualExportMatch = url.pathname.match(/^\/api\/strategy\/([^/]+)\/manual-export$/);
  if (manualExportMatch) {
    const missing = requireDb(env);
    if (missing) return missing;
    const pack = await fetchManualExport(env, decodeURIComponent(manualExportMatch[1]));
    return manualExportResponse(pack);
  }

  const findingApplyMatch = url.pathname.match(/^\/api\/findings\/([^/]+)\/apply$/);
  if (findingApplyMatch && request.method === 'POST') {
    const missing = requireDb(env);
    if (missing) return missing;
    const domain = decodeURIComponent(findingApplyMatch[1]);
    const body = await request.json().catch(() => ({}));
    if (!body.finding_id) return json({ error: 'finding_id_required' }, 400);
    if (body.manual_only) {
      const deniedManual = requireAdminIfProduction(request, env);
      if (deniedManual) return deniedManual;
      const result = await saveFindingManualOnly(env, domain, body.finding_id, body.manual_input ?? {}, {
        edited_artifact: body.edited_artifact,
        artifact_title: body.artifact_title,
      });
      return json(result);
    }
    const denied = requireAdmin(request, env);
    if (denied) return denied;
    const result = await applyFindingFix(env, domain, body.finding_id, {
      manual_input: body.manual_input,
      intent: body.intent,
      max_actions: body.max_actions,
    });
    return json(result, result.error || result.status === 'error' ? 400 : 200);
  }

  const pipelineMatch = url.pathname.match(/^\/api\/pipeline\/([^/]+)$/);
  if (pipelineMatch) {
    const missing = requireDb(env);
    if (missing) return missing;
    const pipeline = await getSitePipeline(env, decodeURIComponent(pipelineMatch[1]));
    return json(pipeline, pipeline.error ? 404 : 200);
  }

  if (url.pathname === '/api/questions' && request.method === 'GET') {
    const missing = requireDb(env);
    if (missing) return missing;
    const domain = url.searchParams.get('domain');
    const verticalId = url.searchParams.get('vertical_id');
    const questions = await listQuestions(env.DB, { domain, verticalId });
    return json({ domain, questions });
  }

  if (url.pathname === '/api/questions/generate' && request.method === 'POST') {
    const missing = requireDb(env);
    if (missing) return missing;
    const denied = requireAdmin(request, env);
    if (denied) return denied;
    return questionsGenerateEndpoint(request, env);
  }

  if (url.pathname === '/api/questions' && request.method === 'POST') {
    const missing = requireDb(env);
    if (missing) return missing;
    const denied = requireAdmin(request, env);
    if (denied) return denied;
    return questionsCreateEndpoint(request, env);
  }

  const questionMatch = url.pathname.match(/^\/api\/questions\/([^/]+)$/);
  if (questionMatch && request.method === 'PUT') {
    const missing = requireDb(env);
    if (missing) return missing;
    const denied = requireAdmin(request, env);
    if (denied) return denied;
    const body = await request.json().catch(() => ({}));
    const result = await updateQuestion(env.DB, decodeURIComponent(questionMatch[1]), body);
    return json(result, result.error ? 404 : 200);
  }

  if (questionMatch && request.method === 'DELETE') {
    const missing = requireDb(env);
    if (missing) return missing;
    const denied = requireAdmin(request, env);
    if (denied) return denied;
    const result = await deleteQuestion(env.DB, decodeURIComponent(questionMatch[1]));
    return json(result);
  }

  if (url.pathname === '/api/baseline-info') {
    const baselineId = await resolveBaselineId(env);
    let tenants = [];
    if (env.DB) {
      const { results } = await env.DB.prepare(
        `SELECT apex_host, status, plan FROM tenants ORDER BY created_at DESC LIMIT 50`,
      ).all();
      tenants = (results ?? []).map((t) => ({
        domain: t.apex_host,
        status: t.status,
        plan: t.plan,
      }));
    }
    const qCount = env.DB
      ? await env.DB.prepare(`SELECT COUNT(*) as n FROM questions`).first()
      : null;
    return json({
      baseline: baselineId,
      questions: qCount?.n ?? 0,
      tenants,
    });
  }

  if (url.pathname === '/api/baseline/status') {
    return baselineStatus(env);
  }

  if (url.pathname === '/api/drift/status') {
    const missing = requireDb(env);
    if (missing) return missing;
    const result = await getDriftStatus(env, url);
    return json(result, result.error ? 503 : 200);
  }

  if (url.pathname === '/api/runs/stats') {
    const missing = requireDb(env);
    if (missing) return missing;
    return runsStats(env);
  }

  if (url.pathname === '/api/observations/stats') {
    const missing = requireDb(env);
    if (missing) return missing;
    return observationsStats(env);
  }

  if (url.pathname === '/api/sov') {
    const missing = requireDb(env);
    if (missing) return missing;
    return sovQuery(env, url);
  }

  if (url.pathname === '/api/citations/reprocess' && request.method === 'POST') {
    const missing = requireDb(env);
    if (missing) return missing;
    return reprocessEndpoint(request, env);
  }

  if (url.pathname === '/api/diagnose/probe') {
    const missing = requireDb(env);
    if (missing) return missing;
    const denied = requireAdminIfProduction(request, env);
    if (denied) return denied;
    return probeEndpoint(env, url);
  }

  if (url.pathname === '/api/diagnose/displacement') {
    const missing = requireDb(env);
    if (missing) return missing;
    return displacementEndpoint(env, url);
  }

  const reportMatch = url.pathname.match(/^\/(?:api\/)?report\/([^/]+)$/);
  if (reportMatch) {
    const missing = requireDb(env);
    if (missing) return missing;
    return reportEndpoint(env, reportMatch[1], url, request);
  }

  const config = await loadTenantConfig(request, env);
  const hostname = url.hostname;

  if (!isPlatformHost(hostname, env)) {
    scheduleBotLog(request, env, ctx, config);

    const edgeConfig = await loadEdgeConfig(env, hostname);
    if (edgeConfig?.edge?.enabled) {
      return handleTenantRequest(request, env, edgeConfig);
    }
    // Registered tenant on shared Worker — fetch THAT domain's HTML origin (never loop to self)
    if (config) {
      return fetchTenantOrigin(request, env, config);
    }
    return fetch(request);
  }

  if (!config) {
    return fetch(request);
  }

  return fetch(request);
}

async function baselineStatus(env) {
  const baselineId = await resolveBaselineId(env);
  const key = baselineManifestKey(baselineId);
  const minModels = 2;

  if (env.CACHE) {
    const manifest = await env.CACHE.get(key, 'json');
    if (manifest) {
      const ready =
        manifest.block_0_1 === 'closed' ||
        manifest.block_0_1 === 'pilot_closed' ||
        manifest.status === 'closed' ||
        manifest.status === 'pilot_closed' ||
        (manifest.models_collected?.length ?? 0) >= minModels;
      return json({
        source: 'kv',
        baseline_id: baselineId,
        ready,
        block_0_1: manifest.block_0_1 ?? (ready ? 'partial' : 'open'),
        ...manifest,
      });
    }
  }

  return json({
    source: 'default',
    baseline_id: baselineId,
    status: 'questions_ready',
    block_0_1: 'open',
    models_collected: [],
    ready: false,
    hint: 'Run aiv-baseline-collect, or npm run baseline:seed-fixtures && baseline:close --pilot',
  });
}

async function runsStats(env) {
  const { results } = await env.DB.prepare(
    `SELECT model, COUNT(*) as count FROM runs GROUP BY model`,
  ).all();

  const total = await env.DB.prepare(`SELECT COUNT(*) as n FROM runs`).first();

  return json({
    total: total?.n ?? 0,
    by_model: results ?? [],
  });
}

async function observationsStats(env) {
  const { results } = await env.DB.prepare(
    `SELECT class, COUNT(*) as count FROM observations GROUP BY class ORDER BY count DESC`,
  ).all();

  const mis = await env.DB.prepare(`SELECT COUNT(*) as n FROM misattributions`).first();

  return json({
    by_class: results ?? [],
    misattributions: mis?.n ?? 0,
  });
}

async function sovQuery(env, url) {
  const domain = url.searchParams.get('domain');
  const verticalId = url.searchParams.get('vertical_id');
  const model = url.searchParams.get('model');
  const period = url.searchParams.get('period') ?? currentPeriod();

  if (!domain || !verticalId) {
    return json({ error: 'domain and vertical_id required' }, 400);
  }

  const score = await computeSov(env.DB, {
    domain,
    verticalId,
    model: model || null,
    period,
  });

  return json(score);
}

async function reprocessEndpoint(request, env) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  const summary = await reprocessRuns(env, { limit: 50 });
  return json(summary);
}

async function questionsGenerateEndpoint(request, env) {
  const body = await request.json().catch(() => ({}));
  const result = await generateAndSaveQuestions(env.DB, {
    domain: body.domain,
    brand: body.brand,
    verticalLabel: body.vertical_label,
    replaceAuto: body.replace_auto !== false,
    env,
    useSiteContext: body.use_site_context !== false,
  });
  return json(result, result.error ? 404 : 200);
}

async function questionsCreateEndpoint(request, env) {
  const body = await request.json().catch(() => ({}));
  const result = await createQuestion(env.DB, body);
  return json(result, result.error ? 400 : 201);
}

async function sitesCreateEndpoint(request, env) {
  const body = await request.json().catch(() => ({}));
  const result = await registerSite(env.DB, body);
  if (result.error === 'domain_exists') {
    const existing = await fetchSite(env.DB, result.domain);
    return json(
      {
        ...result,
        already_exists: true,
        site: existing.site ?? { apex_host: result.domain, id: result.tenant_id },
      },
      409,
    );
  }
  if (result.error) return json(result, 400);

  if (body.run_analysis === true || body.run_pipeline === true) {
    const pipeline = await runSitePipeline(env, result.domain, { skip_edge: !body.activate_edge });
    return json({ ...result, pipeline }, pipeline.error ? 207 : 201);
  }

  return json(result, 201);
}

async function measureRunEndpoint(request, env) {
  const body = await request.json().catch(() => ({}));
  const domain = body.domain ?? new URL(request.url).searchParams.get('domain');
  if (!domain) return json({ error: 'domain required' }, 400);

  const { resolveTenantByDomain } = await import('./api/questions.js');
  const tenant = await resolveTenantByDomain(env.DB, domain);
  if (!tenant) return json({ error: 'unknown_domain', domain }, 404);

  const summary = await runCitationBatchForTenant(env, tenant.id, {
    questionLimit: body.question_limit ?? 5,
    repetitions: body.repetitions ?? 1,
    reprocess: body.reprocess !== false,
  });
  return json({ domain: tenant.apex_host, ...summary });
}

async function pipelineRunEndpoint(request, env, domain) {
  const body = await request.json().catch(() => ({}));
  const result = await runSitePipeline(env, domain, body);
  return json(result, result.error ? 404 : 200);
}

async function probeEndpoint(env, url) {
  const domain = url.searchParams.get('domain');
  if (!domain) return json({ error: 'domain required' }, 400);

  let brand;
  if (env.DB) {
    try {
      const { resolveTenantByDomain } = await import('./api/questions.js');
      const tenant = await resolveTenantByDomain(env.DB, domain.replace(/^www\./, ''));
      brand = tenant?.name;
    } catch { /* optional */ }
  }

  const probeResult = await probeDomain(domain, { brand });
  const passage = passageAutonomy(probeResult.raw_json?.text_sample ?? '');
  const score = computeDiagnosticScore(probeResult, passage);
  const saved = await persistDiagnostic(env.DB, probeResult, score);

  return json({ ...saved, passage });
}

async function displacementEndpoint(env, url) {
  const domain = url.searchParams.get('domain');
  const verticalId = url.searchParams.get('vertical_id');
  const model = url.searchParams.get('model');

  if (!domain || !verticalId) {
    return json({ error: 'domain and vertical_id required' }, 400);
  }

  const result = await analyzeDisplacement(env.DB, { domain, verticalId, model: model || null });
  return json(result);
}

async function reportEndpoint(env, domain, url, request) {
  const format = url.searchParams.get('format') ?? 'html';
  const model = url.searchParams.get('model');

  const report = await buildDomainReport(env, decodeURIComponent(domain), {
    model: model || null,
    includeSov: url.searchParams.get('sov') !== '0',
  });

  if (report.error) return json(report, 404);

  if (format === 'json') {
    const { html, ...rest } = report;
    return json(rest);
  }

  return new Response(report.html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' },
  });
}

function isPlatformRoute(pathname, hostname, env) {
  if (!isPlatformHost(hostname, env)) return false;
  return (
    pathname === '/' ||
    pathname === '/dashboard' ||
    pathname === '/health' ||
    pathname.startsWith('/api/') ||
    /^\/(?:api\/)?report\//.test(pathname)
  );
}

function requireDb(env) {
  if (env.DB) return null;
  return json(
    {
      error: 'db_not_bound',
      hint: 'Worker deploy missing D1 binding. Run GitHub Action aiv-deploy on main.',
      database: 'aiv',
    },
    503,
  );
}
