import assert from 'node:assert/strict';
import {
  isRichLanding,
  shouldRecommendEdge,
  shouldSuggestContentDraft,
  resolveManualGate,
  inferPublishStack,
  resolveProductPhase,
} from '../src/diagnose/siteProfile.js';
import { enrichFindingsWithAutomation } from '../src/diagnose/findingsAutomation.js';
import { buildOptimizationRoadmap } from '../src/optimizer/roadmap.js';
import { buildStrategy } from '../src/diagnose/strategy.js';

const kasyProbe = {
  domain: 'ai-kasy.online',
  http_status: 200,
  html_text_chars: 2300,
  jsonld_blocks: 1,
  robots_ai_policy: 'allow',
  signals: { brand_mentions: 0, sitemap_ok: true },
  raw_json: {
    final_url: 'https://ai-kasy.online/frontend/landing.html',
    redirect_chain: [{ url: 'https://ai-kasy.online/' }, { url: 'https://ai-kasy.online/frontend/landing.html' }],
    text_passage: 'KASY — AI Secretary. KASY Plus €6.99/mo.',
    jsonld_types: ['Organization', 'WebSite', 'SoftwareApplication', 'Offer'],
  },
};

export function testSiteProfileRichLanding() {
  assert(isRichLanding(kasyProbe, 'KASY'));
  assert.equal(inferPublishStack(kasyProbe), 'static_html');
  assert(!shouldRecommendEdge(kasyProbe));
  assert(!shouldSuggestContentDraft(kasyProbe, 'KASY', 'brand_absent'));
}

export function testResolveManualGateStaticSite() {
  assert.equal(resolveManualGate('cms_publish', kasyProbe), 'site_deploy');
  assert.equal(resolveManualGate('cname', kasyProbe), 'cname');
}

export function testRichSiteSuppressesHomepageDraft() {
  const findings = enrichFindingsWithAutomation(
    [
      {
        id: 'brand_absent',
        severity: 'warning',
        fix: { owner: 'you', steps: [] },
      },
    ],
    { probe: kasyProbe, brand: 'KASY', tenant: { apex_host: 'ai-kasy.online', name: 'KASY' }, edgeActive: false },
  );
  const auto = findings[0].automation;
  assert.equal(auto.site_rich, true);
  assert(!auto.artifact?.content?.includes('[опишете'));
}

export function testKasyDeployedMeasurementPhase() {
  const probe = {
    domain: 'ai-kasy.online',
    http_status: 200,
    html_text_chars: 2300,
    jsonld_blocks: 1,
    robots_ai_policy: 'allow',
    signals: { brand_mentions: 12, sitemap_ok: true },
    price_tokens: 3,
    raw_json: {
      final_url: 'https://ai-kasy.online/frontend/landing.html',
      jsonld_types: ['Organization', 'WebSite', 'SoftwareApplication', 'Offer'],
    },
  };
  const phase = resolveProductPhase({ probe, brand: 'KASY', runCount: 0 });
  assert.equal(phase.product_phase, 'measurement');
  assert(phase.complete);
}

export function testKasyStrategyAfterDeploy() {
  const probe = {
    domain: 'ai-kasy.online',
    http_status: 200,
    html_text_chars: 2300,
    jsonld_blocks: 1,
    robots_ai_policy: 'allow',
    blocked_bots: [],
    has_canonical: 1,
    price_tokens: 3,
    signals: { brand_mentions: 12, sitemap_ok: true, noindex: false, js_shell_suspect: false },
    raw_json: {
      final_url: 'https://ai-kasy.online/frontend/landing.html',
      title: 'KASY — AI Secretary',
      jsonld_types: ['Organization', 'WebSite', 'SoftwareApplication', 'Offer'],
    },
  };
  const strategy = buildStrategy({
    probe,
    tenant: { apex_host: 'ai-kasy.online', name: 'KASY' },
    registered: true,
    runCount: 0,
    diagnostic_score: 82,
  });
  assert.equal(strategy.product_phase, 'measurement');
  assert(strategy.verdict.headline.includes('готова') || strategy.verdict.headline.includes('измерване'));
  assert(!strategy.plan.this_week.some((a) => a.id === 'activate_edge'));
}

export function testRoadmapSkipsCnameWithoutEdgeFixes() {
  const roadmap = buildOptimizationRoadmap(
    {
      domain: 'ai-kasy.online',
      tenant: { apex_host: 'ai-kasy.online' },
      stats: { questionCount: 5, runCount: 1, obsCount: 10, pendingReprocess: 0 },
      probe: kasyProbe,
      edge: { edge_active: false, fixes: [], status: 'measurement_only' },
      strategy: { score: 75 },
    },
    { worker_host: 'worker.example.dev' },
  );
  const cname = roadmap.steps.find((s) => s.id === 'cname');
  assert.equal(cname.status, 'done');
  assert(cname.summary.includes('не е нужен') || cname.summary.includes('Няма Edge'));
}
