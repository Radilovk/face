import assert from 'node:assert/strict';
import { buildEdgeDecision } from '../src/edge/decision.js';
import { renderRobotsTxt, robotsResponse } from '../src/enhance/robots.js';
import { isPlatformHost } from '../src/config/platform.js';

export function testBuildEdgeDecisionMissingJsonLd() {
  const decision = buildEdgeDecision({
    probe: {
      domain: 'example.com',
      jsonld_blocks: 0,
      robots_ai_policy: 'allow',
      html_text_chars: 1200,
    },
    tenant: { apex_host: 'example.com', name: 'Example' },
    edgeActive: false,
  });

  assert.equal(decision.status, 'pending_cname');
  assert(decision.fixes.some((f) => f.id === 'inject_jsonld'));
  assert.equal(decision.edge_config.edge.inject_jsonld, true);
  assert(decision.edge_config.jsonld);
  assert.equal(decision.pipeline_next, 'activate_edge');
}

export function testBuildEdgeDecisionRobotsDisallow() {
  const decision = buildEdgeDecision({
    probe: {
      domain: 'blocked.com',
      jsonld_blocks: 1,
      robots_ai_policy: 'disallow_all',
      html_text_chars: 800,
    },
    tenant: { apex_host: 'blocked.com', name: 'Blocked' },
  });

  assert(decision.fixes.some((f) => f.id === 'robots_allow'));
  assert.equal(decision.edge_config.edge.robots_mode, 'serve');
  assert(decision.edge_config.robots_txt.includes('GPTBot'));
}

export function testBuildEdgeDecisionActive() {
  const decision = buildEdgeDecision({
    probe: { domain: 'live.com', jsonld_blocks: 0, robots_ai_policy: 'allow', html_text_chars: 900 },
    tenant: { apex_host: 'live.com', name: 'Live' },
    edgeActive: true,
  });

  assert.equal(decision.status, 'active');
  assert.equal(decision.edge_active, true);
  assert.equal(decision.pipeline_next, 'remeasure');
  assert.equal(decision.prerequisites.length, 0);
}

export function testBuildEdgeDecisionThinContentBlocker() {
  const decision = buildEdgeDecision({
    probe: { domain: 'thin.com', jsonld_blocks: 0, robots_ai_policy: 'none', html_text_chars: 50 },
    tenant: { apex_host: 'thin.com', name: 'Thin' },
  });

  assert(decision.blockers.some((b) => b.id === 'thin_content'));
  assert.equal(decision.verdict.level, 'warning');
}

export function testRenderRobotsTxt() {
  const txt = renderRobotsTxt({ robots_txt: 'User-agent: *\nAllow: /' });
  assert(txt.includes('Allow: /'));
  const res = robotsResponse(txt);
  assert.equal(res.headers.get('Content-Type'), 'text/plain; charset=utf-8');
}

export function testIsPlatformHost() {
  assert(isPlatformHost('ai-visibility-edge.radilov-k.workers.dev'));
  assert(isPlatformHost('localhost'));
  assert(!isPlatformHost('ai-kasy.online'));
  assert(!isPlatformHost('example.com'));
}
