import assert from 'node:assert/strict';
import { buildOptimizationRoadmap } from '../src/optimizer/roadmap.js';
import { buildOptimizationPlan } from '../src/optimizer/plan.js';

const baseCtx = {
  domain: 'example.com',
  tenant: {
    id: 't1',
    name: 'Example',
    apex_host: 'example.com',
    vertical_id: 'v1',
    vertical_name: 'supplements',
    edge_enabled: true,
    edge_status: 'pending_cname',
  },
  stats: { questionCount: 8, runCount: 12, obsCount: 10, pendingReprocess: 0 },
  probe: { domain: 'example.com', html_text_chars: 200, jsonld_blocks: 0 },
  strategy: { score: 45 },
  edge: {
    status: 'pending_cname',
    edge_active: false,
    fixes: [{ id: 'inject_jsonld' }],
  },
  displacement: { displacement_rate: 0.2 },
};

export function testRoadmapHasOrderedSteps() {
  const roadmap = buildOptimizationRoadmap(baseCtx, {
    worker_host: 'worker.example.dev',
    content_drafts: [{ artifact: '<p>draft</p>' }],
  });
  assert(roadmap.steps.length >= 8);
  assert.equal(roadmap.steps[0].id, 'register');
  assert.equal(roadmap.steps[0].status, 'done');
  assert(roadmap.honesty_note.includes('ръчн') || roadmap.honesty_note.includes('ваше'));
}

export function testRoadmapCnameManualStep() {
  const roadmap = buildOptimizationRoadmap(baseCtx, { worker_host: 'worker.example.dev' });
  const cname = roadmap.steps.find((s) => s.id === 'cname');
  assert(cname);
  assert.equal(cname.status, 'waiting_manual');
  assert(cname.instructions.some((i) => i.includes('CNAME')));
}

export function testRoadmapFreshSite() {
  const ctx = {
    domain: 'new.com',
    tenant: null,
    stats: { questionCount: 0, runCount: 0, obsCount: 0, pendingReprocess: 0 },
    probe: {},
    edge: { status: 'measurement_only', edge_active: false, fixes: [] },
  };
  const roadmap = buildOptimizationRoadmap(ctx, {});
  assert.equal(roadmap.steps.find((s) => s.id === 'register').status, 'current');
}

export function testPlanHeadlinePlainLanguage() {
  const plan = buildOptimizationPlan(
    {
      ...baseCtx,
      stats: { questionCount: 0, runCount: 0, obsCount: 0, pendingReprocess: 0 },
      probe: { html_text_chars: 200 },
      edge: baseCtx.edge,
      displacement: { displacement_rate: 0 },
    },
    { AUTO_EDGE_ACTIVATE: '1' },
  );
  assert(plan.headline.includes('ръчн') || plan.headline.includes('автоматичн'));
  assert(!plan.headline.includes('full_auto'));
}
