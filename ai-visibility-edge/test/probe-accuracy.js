import assert from 'node:assert/strict';
import { countPriceTokens, countBrandMentions } from '../src/diagnose/probe.js';
import { buildSiteFindings } from '../src/diagnose/findings.js';
import { buildEdgeDecision } from '../src/edge/decision.js';

export function testCountPriceTokensEuroPrefix() {
  const text = 'Plus €6.99/mo or €49.99/year. Free €0 forever.';
  const n = countPriceTokens(text);
  assert(n >= 3, 'expected €6.99, €49.99, €0');
}

export function testBrandRecountWhenProbeOmittedBrand() {
  const probe = {
    domain: 'ai-kasy.online',
    http_status: 200,
    html_text_chars: 2300,
    jsonld_blocks: 1,
    has_canonical: 1,
    price_tokens: 3,
    robots_ai_policy: 'allow',
    blocked_bots: [],
    signals: { brand_mentions: 0, sitemap_ok: true },
    raw_json: {
      final_url: 'https://ai-kasy.online/frontend/landing.html',
      redirect_chain: [
        { url: 'https://ai-kasy.online/' },
        { url: 'https://ai-kasy.online/frontend/landing.html' },
      ],
      text_sample: 'KASY — AI Secretary. Speak. KASY listens.',
      text_passage: 'KASY — AI Secretary. KASY Plus €6.99/mo. KASY is your voice secretary.',
      jsonld_types: ['Organization', 'WebSite', 'SoftwareApplication', 'Offer'],
      title: 'KASY — AI Secretary',
    },
  };
  const pack = buildSiteFindings({
    probe,
    brand: 'KASY',
    tenant: { apex_host: 'ai-kasy.online', name: 'KASY' },
    edgeActive: false,
  });
  assert(!pack.findings.some((f) => f.id === 'brand_absent'), 'KASY appears in text');
  assert(!pack.findings.some((f) => f.id === 'no_prices'), 'prices + Offer schema');
  assert(!pack.findings.some((f) => f.id === 'edge_activate'), 'healthy landing redirect should not push edge');
}

export function testEdgeDecisionSkipsCanonicalOnRichLanding() {
  const probe = {
    domain: 'ai-kasy.online',
    html_text_chars: 2300,
    jsonld_blocks: 1,
    robots_ai_policy: 'allow',
    raw_json: {
      redirect_chain: [
        { url: 'https://ai-kasy.online/' },
        { url: 'https://ai-kasy.online/frontend/landing.html' },
      ],
    },
  };
  const decision = buildEdgeDecision({
    probe,
    tenant: { apex_host: 'ai-kasy.online', name: 'KASY' },
    edgeActive: false,
  });
  assert(!decision.fixes.some((f) => f.id === 'canonical_root'));
}

export function testCountBrandMentionsCaseInsensitive() {
  assert(countBrandMentions('KASY and kasy plus', 'KASY') >= 2);
}
