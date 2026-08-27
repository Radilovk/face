import { withFailOpen } from './middleware/failOpen.js';
import { loadTenantConfig } from './config/loader.js';
import { runCitationBatch } from './citations/runner.js';

export default {
  async fetch(request, env, ctx) {
    return withFailOpen(request, env, ctx, (req, environment) =>
      handleRequest(req, environment),
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

async function handleRequest(request, env) {
  const url = new URL(request.url);

  if (url.pathname === '/health') {
    return json({ ok: true, service: 'ai-visibility-edge' }, 200);
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

  if (url.pathname === '/api/runs/stats' && env.DB) {
    return runsStats(env);
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

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
