import assert from 'node:assert/strict';
import { renderDashboardPage } from '../src/ui/dashboardPage.js';

export function testDashboardV2Page() {
  const html = renderDashboardPage('https://ai-visibility-edge.radilov-k.workers.dev');
  assert(html.includes('AI Visibility'));
  assert(html.includes('id="verdict"'));
  assert(html.includes('id="pillars"'));
  assert(html.includes('id="plan-week"'));
  assert(html.includes('/api/strategy/'));
  assert(html.includes('1. Анализ'));
  assert(html.includes('edge-panel'));
  assert(html.includes('/api/edge/'));
  assert(html.includes('loadEdgeDecision'));
  assert(html.includes('activateEdge'));
  assert(html.includes('Gemini'));
  assert(html.includes('/api/advisor/chat'));
  assert(!html.includes('data-tab="workflow"'));
}
