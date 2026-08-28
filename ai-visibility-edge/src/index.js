import { withFailOpen } from './middleware/failOpen.js';
import { requireAdmin } from './middleware/requireAdmin.js';
import { getAuthStatus } from './api/auth.js';
import { fetchSiteStats } from './api/siteStats.js';
import { fetchCacheIndex } from './api/cacheIndex.js';
import { getModelsStatus } from './config/models.js';
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
import { registerSite, listVerticals } from './api/sites.js';
import { runCitationBatchForTenant } from './citations/runner.js';
import { getApplyPlan, runApplyPrep } from './api/apply.js';
import { getEdgeDecision, activateEdgeOptimization, getEdgeStatus } from './api/edge.js';
import { handleAdvisorStatus, handleAdvisorChat } from './api/advisor.js';
import { isPlatformHost } from './config/platform.js';
import { loadEdgeConfig } from './config/tenantEdge.js';
import { handleTenantRequest } from './enhance/handleTenant.js';
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
    if (isPlatformRoute(url.pathname, url.hostname)) {
      return handleRequest(request, env, ctx);
    }
    // Tenant CNAME traffic — origin fetch must not hit 50ms budget
    if (!isPlatformHost(url.hostname)) {
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
        }
      })(),
    );
  },
};

async function handleRequest(request, env, ctx) {
  const url = new URL(request.url);

  if (url.pathname === '/health') {
    return json({ ok: true, service: 'ai-visibility-edge', db: Boolean(env.DB), kv: Boolean(env.CACHE) }, 200);
  }

  if (url.pathname === '/api/auth/status') {
    return json(getAuthStatus(env));
  }

  if (url.pathname === '/api/models/status') {
    return json(getModelsStatus(env));
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

  if (url.pathname === '/api/sites') {
    const missing = requireDb(env);
    if (missing) return missing;
    if (request.method === 'POST') {
      const denied = requireAdmin(request, env);
      if (denied) return denied;
      return sitesCreateEndpoint(request, env);
    }
    const sites = await listSitesFromDb(env);
    return json({ sites });
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
    const result = await activateEdgeOptimization(env, decodeURIComponent(edgeActivateMatch[1]));
    return json(result, result.error ? 400 : 200);
  }

  const edgeStatusMatch = url.pathname.match(/^\/api\/edge\/([^/]+)\/status$/);
  if (edgeStatusMatch) {
    const missing = requireDb(env);
    if (missing) return missing;
    const status = await getEdgeStatus(env, decodeURIComponent(edgeStatusMatch[1]));
    return json(status);
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
    return json({
      baseline: env.BASELINE_ID ?? '2026-08-27',
      questions: 20,
      tenants: [
        'daotslabna.com',
        'biocode-bg.com',
        'life-protocols.com',
        'biocode-peptides.com',
      ],
    });
  }

  if (url.pathname === '/api/baseline/status') {
    return baselineStatus(env);
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

  if (!isPlatformHost(hostname)) {
    scheduleBotLog(request, env, ctx, config);

    const edgeConfig = await loadEdgeConfig(env, hostname);
    if (edgeConfig?.edge?.enabled) {
      return handleTenantRequest(request, env, edgeConfig);
    }
    if (config) {
      return fetch(request);
    }
    return fetch(request);
  }

  if (!config) {
    return fetch(request);
  }

  return fetch(request);
}

async function baselineStatus(env) {
  const baselineId = env.BASELINE_ID ?? '2026-08-27';
  const key = `aiv/baseline/${baselineId}/manifest`;

  if (env.CACHE) {
    const manifest = await env.CACHE.get(key, 'json');
    if (manifest) {
      return json({
        source: 'kv',
        baseline_id: baselineId,
        ready: (manifest.models_collected?.length ?? 0) >= (manifest.gates?.minimum_models ?? 2),
        ...manifest,
      });
    }
  }

  return json({
    source: 'default',
    baseline_id: baselineId,
    status: 'questions_ready',
    models_collected: [],
    ready: false,
    hint: 'Run aiv-baseline-collect workflow or npm run baseline:collect',
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
  return json(result, result.error ? 400 : 201);
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

  const probeResult = await probeDomain(domain);
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

function isPlatformRoute(pathname, hostname) {
  if (!isPlatformHost(hostname)) return false;
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
