import assert from 'node:assert/strict';
import { TENANTS, renderDashboardPage } from '../src/ui/dashboard.js';

export function testDashboardPage() {
  const html = renderDashboardPage('https://ai-visibility-edge.radilov-k.workers.dev');
  assert(html.includes('AI Visibility Edge'));
  assert(html.includes('biocode-bg.com'));
  assert(html.includes('/api/dashboard/summary'));
  assert.equal(TENANTS.length, 4);
  assert(TENANTS.some((t) => t.canary));
}
