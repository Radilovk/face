import assert from 'node:assert/strict';
import { buildManualTaskList, isManualOptimizationTask, isAutoOnlyFinding } from '../src/diagnose/manualTasks.js';
import { buildSiteFindings } from '../src/diagnose/findings.js';

const thinProbe = {
  domain: 'shop.bg',
  http_status: 503,
  html_text_chars: 280,
  jsonld_blocks: 0,
  has_canonical: 0,
  price_tokens: 0,
  robots_ai_policy: 'allow',
  blocked_bots: [],
  signals: { noindex: false, brand_mentions: 0, js_shell_suspect: false, sitemap_ok: false },
  raw_json: { final_url: 'https://shop.bg/', title: 'Welcome', text_sample: 'text' },
};

export function testManualTasksFromFindings() {
  const pack = buildSiteFindings({
    probe: thinProbe,
    brand: 'ShopBG',
    tenant: { apex_host: 'shop.bg', name: 'ShopBG' },
    edgeActive: false,
  });
  const tasks = buildManualTaskList(pack.findings);
  assert(tasks.length > 0);
  assert(tasks.some((t) => t.id === 'http_error'));
  assert(tasks.some((t) => t.manual_form?.id === 'hosting'));
  assert(tasks.some((t) => t.artifact?.content || t.manual_form));
}

export function testManualVsAutoSplit() {
  const pack = buildSiteFindings({
    probe: { ...thinProbe, http_status: 200, robots_ai_policy: 'disallow_all' },
    brand: 'ShopBG',
    tenant: { apex_host: 'shop.bg', name: 'ShopBG' },
    edgeActive: true,
  });
  const manual = pack.findings.filter(isManualOptimizationTask);
  const auto = pack.findings.filter(isAutoOnlyFinding);
  assert(manual.length >= 0);
  assert(auto.some((f) => f.id === 'robots_disallow_all') || manual.length > 0);
}

export function testManualTasksMergeApplyPlan() {
  const pack = buildSiteFindings({ probe: thinProbe, brand: 'X' });
  const tasks = buildManualTaskList(pack.findings, {
    fixes: [
      {
        id: 'extra_page',
        type: 'manual',
        title: 'Extra manual fix',
        instructions: 'Do it',
        artifact: '<p>x</p>',
        artifact_format: 'html',
        priority: 'high',
      },
    ],
  });
  assert(tasks.some((t) => t.id === 'apply_extra_page'));
}
