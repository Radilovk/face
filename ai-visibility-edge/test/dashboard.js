import assert from 'node:assert/strict';
import { renderDashboardPage } from '../src/ui/dashboardPage.js';

export function testDashboardV2Page() {
  const html = renderDashboardPage('https://ai-visibility-edge.radilov-k.workers.dev');
  assert(html.includes('AI Visibility'));
  assert(html.includes('id="verdict"'));
  assert(html.includes('id="pillars"'));
  assert(html.includes('id="plan-week"'));
  assert(html.includes('/api/strategy/'));
  assert(html.includes('Стартирай пълен анализ'));
  assert(html.includes('Приложи'));
  assert(html.includes('/api/apply/'));
  assert(!html.includes('data-tab="workflow"'));
}
