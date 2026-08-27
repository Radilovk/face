import { withFailOpen } from './middleware/failOpen.js';
import { loadTenantConfig } from './config/loader.js';

export default {
  async fetch(request, env, ctx) {
    return withFailOpen(request, env, ctx, (req, environment) =>
      handleRequest(req, environment),
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
      baseline: '2026-08-27',
      questions: 20,
      tenants: [
        'daotslabna.com',
        'biocode-bg.com',
        'life-protocols.com',
        'biocode-peptides.com',
      ],
    });
  }

  const config = await loadTenantConfig(request, env);
  if (!config) {
    return fetch(request);
  }

  return fetch(request);
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
