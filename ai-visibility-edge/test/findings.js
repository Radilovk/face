import assert from 'node:assert/strict';
import { buildSiteFindings, findingsToRecommendations } from '../src/diagnose/findings.js';
import { detectNoindexSignals } from '../src/diagnose/probe.js';
import { computeDiagnosticScore } from '../src/diagnose/score.js';

const thinProbe = {
  domain: 'shop.bg',
  http_status: 200,
  html_text_chars: 280,
  jsonld_blocks: 0,
  has_canonical: 0,
  price_tokens: 0,
  robots_ai_policy: 'allow',
  blocked_bots: [],
  signals: {
    noindex: false,
    brand_mentions: 0,
    js_shell_suspect: false,
    sitemap_ok: false,
  },
  raw_json: {
    final_url: 'https://shop.bg/',
    title: 'Welcome',
    h1: 'Home',
    text_sample: 'Кратък текст без марка.',
    text_passage: 'Кратък текст без марка. Това е продукт за здраве.',
  },
};

export function testFindingsThinContentWithEvidence() {
  const pack = buildSiteFindings({
    probe: thinProbe,
    brand: 'ShopBG',
    passage: { score: 40, anaphora_starts: 1, paragraphs: 2, details: [{ preview: 'Това е продукт', anaphora_start: true }] },
  });
  assert(pack.findings.some((f) => f.id === 'thin_content' || f.id === 'thin_content_critical'));
  assert(pack.findings.some((f) => f.id === 'brand_absent'));
  assert(pack.findings.some((f) => f.id === 'missing_jsonld'));
  assert(/критич|предупреж|области/i.test(pack.summary));
}

export function testFindingsDisplacementWithExamples() {
  const pack = buildSiteFindings({
    probe: { ...thinProbe, html_text_chars: 1200, jsonld_blocks: 1, has_canonical: 1, price_tokens: 2 },
    brand: 'ShopBG',
    displacement: {
      displacement_rate: 0.4,
      displaced_count: 4,
      total_runs: 10,
      events: [
        {
          question_text: 'Кой е най-добрият протеин в България',
          model: 'openai',
          competitors_mentioned: ['myprotein.bg'],
        },
      ],
    },
  });
  const disp = pack.findings.find((f) => f.id === 'high_displacement');
  assert(disp);
  assert(disp.evidence.examples?.length >= 1);
}

export function testFindingsMisattribution() {
  const pack = buildSiteFindings({
    observationQuality: {
      total_observations: 20,
      misattributed_count: 4,
      misattribution_rate: 0.2,
      fabricated_count: 0,
      by_model: [],
      negative_samples: [{ class: 'MISATTRIBUTED', url: 'https://shop.bg/wrong', passage: 'грешна цена' }],
      stale_cache: { count: 0 },
    },
  });
  assert(pack.findings.some((f) => f.id === 'misattributed_citations'));
}

export function testFindingsToRecommendationsCompat() {
  const recos = findingsToRecommendations(buildSiteFindings({ probe: thinProbe, brand: 'X' }).findings);
  assert(recos.every((r) => r.title && r.severity));
}

export function testNoindexCapsScore() {
  const probe = {
    http_status: 200,
    html_text_chars: 2000,
    jsonld_blocks: 2,
    has_canonical: 1,
    price_tokens: 3,
    robots_ai_policy: 'allow',
    signals: { noindex: true },
  };
  assert(computeDiagnosticScore(probe, { score: 80 }) <= 15);
}

export function testDetectNoindex() {
  assert(detectNoindexSignals('<meta name="robots" content="noindex,nofollow">'));
  assert(!detectNoindexSignals('<meta name="robots" content="index,follow">'));
}
