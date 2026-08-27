import { withFailOpen } from './middleware/failOpen.js';
import { loadTenantConfig } from './config/loader.js';
import { runCitationBatch } from './citations/runner.js';
import { reprocessRuns } from './citations/reprocess.js';
import { computeSov, currentPeriod } from './index/sov.js';
import { probeDomain, persistDiagnostic } from './diagnose/probe.js';
import { passageAutonomy, computeDiagnosticScore } from './diagnose/score.js';
import { analyzeDisplacement } from './diagnose/displacement.js';
import { buildDomainReport } from './diagnose/report.js';
import { fetchDashboardSummary, renderDashboardPage } from './ui/dashboard.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // Platform API/report routes bypass fail-open (probe/report take >50ms)
    if (isPlatformRoute(url.pathname)) {
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

  if (url.pathname === '/' || url.pathname === '/dashboard') {
    const origin = url.origin;
    return html(renderDashboardPage(origin));
  }

  if (url.pathname === '/api/dashboard/summary') {
    const summary = await fetchDashboardSummary(env);
    return json(summary);
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
      return json({ source: 'kv', baseline_id: baselineId, ...manifest });
    }
  }

  return json({
    source: 'default',
    baseline_id: baselineId,
    status: 'questions_ready',
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
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (env.ADMIN_TOKEN && token !== env.ADMIN_TOKEN) {
    return json({ error: 'unauthorized' }, 401);
  }

  const summary = await reprocessRuns(env, { limit: 50 });
  return json(summary);
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

function isPlatformRoute(pathname) {
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
