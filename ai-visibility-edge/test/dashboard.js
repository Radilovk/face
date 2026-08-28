import assert from 'node:assert/strict';
import { renderDashboardPage } from '../src/ui/dashboardPage.js';

export function testDashboardV2Page() {
  const html = renderDashboardPage('https://ai-visibility-edge.radilov-k.workers.dev');
  assert(html.includes('AI Visibility Edge'));
  assert(html.includes('data-tab="workflow"'));
  assert(html.includes('data-tab="questions"'));
  assert(html.includes('/api/pipeline/'));
  assert(html.includes('/api/questions'));
  assert(html.includes('Авто-генерирай'));
  assert(!html.includes('id="info-modules"'));
}
