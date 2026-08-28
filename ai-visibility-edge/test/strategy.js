import assert from 'node:assert/strict';
import { buildStrategy } from '../src/diagnose/strategy.js';

export function testStrategyThinContent() {
  const s = buildStrategy({
    probe: {
      domain: 'ai-kasy.online',
      http_status: 200,
      html_text_chars: 39,
      jsonld_blocks: 0,
      robots_ai_policy: 'none',
      has_canonical: 1,
      price_tokens: 0,
    },
    passage: { score: 50, paragraphs: 0 },
    diagnostic_score: 45,
    registered: false,
    runCount: 0,
  });

  assert.equal(s.verdict.level, 'critical');
  assert(s.verdict.headline.includes('празна') || s.verdict.summary.includes('39'));
  assert(s.pillars.find((p) => p.id === 'content')?.level === 'critical');
  assert(s.plan.this_week.some((a) => a.id === 'expand_homepage' || a.id === 'thin_content'));
}

export function testStrategyRobotsBlocked() {
  const s = buildStrategy({
    probe: {
      domain: 'blocked.com',
      http_status: 200,
      robots_ai_policy: 'disallow_all',
      html_text_chars: 5000,
    },
    diagnostic_score: 30,
    registered: true,
    runCount: 0,
  });

  assert.equal(s.verdict.level, 'critical');
  assert(s.verdict.headline.includes('бот'));
}

export function testStrategyWithMeasurement() {
  const s = buildStrategy({
    probe: {
      domain: 'shop.bg',
      http_status: 200,
      html_text_chars: 3000,
      jsonld_blocks: 2,
      robots_ai_policy: 'allow',
      has_canonical: 1,
      price_tokens: 5,
    },
    diagnostic_score: 75,
    displacement: {
      total_runs: 20,
      displaced_count: 8,
      displacement_rate: 0.4,
      tenant_present_count: 5,
      events: [{ competitors_mentioned: ['competitor.bg'] }],
    },
    registered: true,
    questionCount: 10,
    runCount: 20,
  });

  assert.equal(s.verdict.level, 'critical');
  assert(s.verdict.headline.includes('изместват') || s.verdict.summary.includes('40'));
  assert(s.pipeline.steps.some((st) => st.id === 'measure' && st.done));
}
