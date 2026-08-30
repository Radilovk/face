import assert from 'node:assert/strict';
import { buildOptimizationPlan, HUMAN_GATES } from '../src/optimizer/plan.js';
import { pickRotatingQuestions } from '../src/config/economy.js';
import { parseHtmlBlock } from '../src/optimizer/content.js';

const baseCtx = {
  domain: 'example.com',
  tenant: {
    id: 't1',
    name: 'Example',
    apex_host: 'example.com',
    vertical_id: 'v1',
    vertical_name: 'supplements',
    edge_enabled: false,
    edge_status: 'measurement_only',
  },
  stats: { questionCount: 0, runCount: 0, obsCount: 0, pendingReprocess: 0 },
  probe: { html_text_chars: 200, jsonld_blocks: 0, robots_ai_policy: 'disallow_all' },
  edge: {
    status: 'pending_cname',
    edge_active: false,
    fixes: [{ id: 'inject_jsonld' }, { id: 'robots_allow' }],
    blockers: [{ id: 'thin_content' }],
    pipeline_next: 'activate_edge',
  },
  displacement: { displacement_rate: 0.4, displaced_count: 4, total_runs: 10, events: [] },
};

export function testOptimizerPlanFreshSite() {
  const plan = buildOptimizationPlan(baseCtx, { AUTO_EDGE_ACTIVATE: '1' });
  assert(plan.auto_actions.some((a) => a.action === 'run_pipeline'));
  assert(plan.auto_actions.some((a) => a.action === 'generate_content'));
  assert(plan.auto_actions.some((a) => a.action === 'activate_edge'));
  assert(plan.human_gates.some((h) => h.gate === 'cms_publish'));
  assert(plan.human_gates.some((h) => h.gate === 'dns_cname'));
  assert.equal(plan.automation_level, 'hybrid');
}

export function testOptimizerPlanNoRunsSkipsEdgeWhenDisabled() {
  const plan = buildOptimizationPlan(baseCtx, { AUTO_EDGE_ACTIVATE: '0' });
  assert(!plan.auto_actions.some((a) => a.action === 'activate_edge'));
}

export function testOptimizerSensitiveVerticalHumanGate() {
  const ctx = {
    ...baseCtx,
    tenant: { ...baseCtx.tenant, vertical_name: 'research peptides pharma' },
  };
  const plan = buildOptimizationPlan(ctx, { AUTO_EDGE_ACTIVATE: '1' });
  assert(plan.human_gates.some((h) => h.gate === 'strategic_review'));
}

export function testHumanGatesRegistry() {
  assert(HUMAN_GATES.dns_cname.id === 'dns_cname');
  assert(HUMAN_GATES.cms_publish.why.includes('CMS'));
  assert(HUMAN_GATES.dns_cname.short);
}

export function testParseHtmlBlockOptimizer() {
  const html = parseHtmlBlock('```html\n<section><h1>Test</h1></section>\n```');
  assert(html.includes('<h1>Test</h1>'));
}

export function testPickRotatingForOptimizerContext() {
  const qs = [{ id: 'q001' }, { id: 'q002' }, { id: 'q003' }];
  assert.equal(pickRotatingQuestions(qs, 2, 5).length, 2);
}
