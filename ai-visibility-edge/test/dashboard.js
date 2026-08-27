import assert from 'node:assert/strict';
import { TENANTS, renderDashboardPage, INFO_MODULES, USER_CHECKLIST } from '../src/ui/dashboard.js';

export function testDashboardPage() {
  const html = renderDashboardPage('https://ai-visibility-edge.radilov-k.workers.dev');
  assert(html.includes('AI Visibility Edge'));
  assert(html.includes('biocode-bg.com'));
  assert(html.includes('/api/dashboard/summary'));
  assert(html.includes('/api/dashboard/recommendations'));
  assert(html.includes('Какво трябва да направите вие'));
  assert(html.includes('Какво прави всяка част'));
  assert(html.includes('info-modules'));
  assert.equal(TENANTS.length, 4);
  assert(TENANTS.some((t) => t.canary));
  assert(INFO_MODULES.length >= 6);
  assert(USER_CHECKLIST.length >= 5);
}
