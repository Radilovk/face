import assert from 'node:assert/strict';
import { isPlatformHost } from '../src/config/platform.js';
import { isEdgeEnabled, getTenantEdgeConfig } from '../src/config/tenantEdge.js';

export function testPlatformHost() {
  assert(isPlatformHost('ai-visibility-edge.radilov-k.workers.dev'));
  assert(isPlatformHost('localhost'));
  assert(!isPlatformHost('biocode-bg.com'));
  assert(!isPlatformHost('www.biocode-bg.com'));
}

export function testTenantEdgeConfig() {
  const cfg = getTenantEdgeConfig('biocode-bg.com');
  assert.equal(cfg.domain, 'biocode-bg.com');
  assert.equal(cfg.edge.enabled, true);
  assert(isEdgeEnabled('biocode-bg.com'));
  assert(!isEdgeEnabled('daotslabna.com'));
}
