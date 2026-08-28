import assert from 'node:assert/strict';
import {
  buildRecommendations,
  INFO_MODULES,
  USER_CHECKLIST,
} from '../src/diagnose/recommendations.js';

export function testBuildRecommendationsRobots() {
  const items = buildRecommendations({
    probe: {
      robots_ai_policy: 'disallow_all',
      http_status: 200,
      jsonld_blocks: 0,
      has_canonical: 0,
      html_text_chars: 100,
      price_tokens: 0,
    },
    tenant: { domain: 'daotslabna.com', canary: false },
  });

  assert(items.some((r) => r.id === 'robots_disallow_all'));
  assert.equal(items.find((r) => r.id === 'robots_disallow_all').severity, 'critical');
  assert(items.some((r) => r.owner === 'you'));
}

export function testBuildRecommendationsCanaryEdge() {
  const items = buildRecommendations({
    probe: { robots_ai_policy: 'allow', http_status: 200, jsonld_blocks: 1, has_canonical: 1, html_text_chars: 2000, price_tokens: 2 },
    tenant: { domain: 'biocode-bg.com', canary: true },
    edgeActive: false,
  });

  assert(items.some((r) => r.id === 'edge_canary_pending'));
}

export function testInfoModulesAndChecklist() {
  assert(INFO_MODULES.length >= 6);
  assert(INFO_MODULES.some((m) => m.id === 'measurement'));
  assert(INFO_MODULES.every((m) => m.what && m.why));
  assert(USER_CHECKLIST.length >= 5);
  assert(USER_CHECKLIST.some((c) => c.id === 'workflow'));
}
