import assert from 'node:assert/strict';
import { detectClientPath, CLIENT_PATHS } from '../src/onboarding/clientPath.js';
import { buildClientPlaybook } from '../src/onboarding/playbook.js';

function baseCtx(overrides = {}) {
  return {
    domain: 'shop.example.com',
    tenant: { name: 'Shop', is_pilot: false, edge_enabled: false },
    stats: { runCount: 5, obsCount: 3, questionCount: 8 },
    probe: {
      html_text_chars: 2000,
      signals: {
        ai_catalog_ok: false,
        auth_md_ok: false,
        llms_txt_ok: false,
        gptbot_blocked: false,
      },
    },
    edge: { fixes: [{ id: 'robots_serve' }], edge_active: false, status: 'pending_cname' },
    ...overrides,
  };
}

export function testDetectPilotPath() {
  const ctx = baseCtx({ tenant: { is_pilot: true, name: 'Pilot' } });
  const path = detectClientPath(ctx, { CF_API_TOKEN: 'x' });
  assert.equal(path.path_id, 'pilot_worker');
  assert.equal(path.path.label, CLIENT_PATHS.pilot_worker.label);
}

export function testDetectContentFirstPath() {
  const ctx = baseCtx({
    probe: { html_text_chars: 200, signals: { ai_catalog_ok: false, llms_txt_ok: false } },
    edge: { fixes: [] },
  });
  const path = detectClientPath(ctx, {});
  assert.equal(path.path_id, 'content_first');
}

export function testDetectEdgeProxyPath() {
  const ctx = baseCtx({
    probe: {
      html_text_chars: 2000,
      signals: { gptbot_blocked: true, ai_catalog_ok: false, llms_txt_ok: false },
    },
  });
  const path = detectClientPath(ctx, { CF_API_TOKEN: 'x' });
  assert.equal(path.path_id, 'edge_proxy');
  assert.equal(path.capabilities.cf_aeo_auto, true);
}

export function testBuildClientPlaybook() {
  const ctx = baseCtx({ tenant: { is_pilot: true, name: 'D' } });
  const detection = detectClientPath(ctx, {});
  const pb = buildClientPlaybook(detection, ctx, { worker_host: 'worker.example.dev' });
  assert.equal(pb.path_id, 'pilot_worker');
  assert(pb.phases.length >= 3);
  assert(pb.steps.length >= 8);
  assert(pb.auto_actions.includes('run_smoke'));
}
