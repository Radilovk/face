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
  assert(html.includes('apiFetch'));
  assert(html.includes('site-stats'));
  assert(html.includes('cache-index-panel'));
  assert(html.includes('onboarding-panel'));
  assert(html.includes('drift-panel'));
  assert(html.includes('loadDriftStatus'));
  assert(html.includes('renderCacheIndex'));
  assert(html.includes('btn-reprocess'));
  assert(html.includes('loadSiteStats'));
  assert(html.includes('info-btn'));
  assert(html.includes('metric-modal'));
  assert(html.includes('interpretMetricNow'));
  assert(html.includes('admin-token'));
  assert(html.includes('Gemini'));
  assert(html.includes('/api/advisor/chat'));
  assert(!html.includes('data-tab="workflow"'));
}
