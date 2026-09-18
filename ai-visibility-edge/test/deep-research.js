import assert from 'node:assert/strict';
import { buildDeepResearchReport } from '../src/diagnose/deepResearch.js';
import { prioritizeUrls, detectPageType } from '../src/diagnose/deepAudit.js';

export function testBuildDeepResearchOriginReady() {
  const deepAudit = {
    domain: 'daotslabna.com',
    pages_fetched: 10,
    sitemap_urls_found: 24,
    missing_page_types: ['pricing'],
    aggregate: {
      pages_ok: 10,
      total_text_chars: 8500,
      avg_text_chars: 850,
      pages_with_jsonld: 4,
      pages_with_h1: 9,
      rich_site: true,
      homepage_text_chars: 1200,
    },
    agent_native: {
      score: 7,
      max: 7,
      origin_ready: true,
      smoke_level: 5,
      smoke_label: 'Level 5 Agent-Native',
    },
    pages: [
      { path: '/', page_type: 'homepage', ok: true, text_chars: 1200, h1: 'Да отслабна', jsonld_blocks: 2 },
      { path: '/faq', page_type: 'faq', ok: true, text_chars: 900, h1: 'FAQ' },
    ],
  };
  const probe = {
    domain: 'daotslabna.com',
    http_status: 200,
    html_text_chars: 1200,
    jsonld_blocks: 2,
    robots_ai_policy: 'ai_rules_present',
    signals: { ai_catalog_ok: true, gptbot_blocked: false, sitemap_ok: true },
  };

  const report = buildDeepResearchReport(deepAudit, probe, { brand: 'Да отслабна' });
  assert.equal(report.site_maturity, 'advanced');
  assert(report.strengths.some((s) => s.id === 'origin_agent_native'));
  assert(!report.gaps.some((g) => g.id === 'robots_block'));
  assert(report.strategy.immediate.some((s) => s.action === 'run_measurement'));
  assert(report.executive_summary.includes('Agent-Native'));
}

export function testBuildDeepResearchCriticalGaps() {
  const deepAudit = {
    domain: 'example.com',
    pages_fetched: 3,
    sitemap_urls_found: 0,
    missing_page_types: ['faq', 'pricing', 'about'],
    aggregate: { pages_ok: 2, total_text_chars: 180, rich_site: false, homepage_text_chars: 80 },
    agent_native: { origin_ready: false, score: 1, max: 7 },
    pages: [{ path: '/', ok: true, text_chars: 80, page_type: 'homepage' }],
  };
  const probe = {
    domain: 'example.com',
    http_status: 200,
    html_text_chars: 80,
    robots_ai_policy: 'disallow_all',
    jsonld_blocks: 0,
    signals: { gptbot_blocked: true },
  };

  const report = buildDeepResearchReport(deepAudit, probe);
  assert.equal(report.site_maturity, 'critical');
  assert(report.gaps.some((g) => g.id === 'robots_block'));
  assert(report.gaps.some((g) => g.id === 'missing_faq'));
  assert(report.strategy.immediate.length >= 1);
}

export function testPrioritizeUrlsFaqFirst() {
  const origin = 'https://example.com';
  const urls = [
    'https://example.com/blog/post-1',
    'https://example.com/faq',
    'https://example.com/pricing',
    'https://example.com/',
  ];
  const picked = prioritizeUrls(urls, origin, 4);
  assert(picked.includes('https://example.com/faq'));
  assert(picked.includes('https://example.com/pricing'));
  assert.equal(detectPageType('/faq'), 'faq');
}
