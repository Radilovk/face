import assert from 'node:assert/strict';
import { buildSiteFindings, findingsToRecommendations } from '../src/diagnose/findings.js';
import { enrichFindingsWithAutomation, resolveAutomationSpec } from '../src/diagnose/findingsAutomation.js';
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

export function testFindingsAutomationOnEveryFinding() {
  const pack = buildSiteFindings({
    probe: thinProbe,
    brand: 'ShopBG',
    tenant: { apex_host: 'shop.bg', name: 'ShopBG', vertical_name: 'health' },
    edgeActive: false,
    worker_host: 'edge.example.workers.dev',
    observationQuality: {
      total_observations: 20,
      misattributed_count: 4,
      misattribution_rate: 0.2,
      fabricated_count: 1,
      by_model: [{ model: 'openai', runs_with_obs: 5, grounded: 0, misattributed: 2 }],
      negative_samples: [],
      stale_cache: { count: 2, avg_age_hours: 96 },
    },
    displacement: {
      displacement_rate: 0.55,
      displaced_count: 5,
      total_runs: 9,
      events: [],
      by_model: { openai: { total: 4, rate: 0.75 } },
    },
  });

  assert(pack.findings.length > 0);
  for (const f of pack.findings) {
    assert(f.automation, `missing automation for ${f.id}`);
    assert(f.automation.mode, `missing mode for ${f.id}`);
    assert(f.automation.label || f.automation.mode === 'manual', `missing label for ${f.id}`);
    if (f.automation.mode !== 'manual') {
      assert(f.automation.action, `missing action for ${f.id}`);
      assert(f.automation.can_apply_now, `cannot apply ${f.id}`);
    }
  }

  const robots = pack.findings.find((f) => f.id === 'missing_jsonld');
  assert(robots?.automation?.artifact?.content?.includes('application/ld+json'));
  assert(robots?.automation?.manual_form?.id === 'cname');

  const httpErr = pack.findings.find((f) => f.id === 'http_error');
  if (httpErr) {
    assert.equal(httpErr.automation.mode, 'manual');
    assert.equal(httpErr.automation.action, null);
    assert(httpErr.automation.manual_form?.fields?.length >= 2);
  }
}

export function testFindingsHttpErrorManualOnly() {
  const pack = buildSiteFindings({
    probe: { ...thinProbe, http_status: 503 },
    brand: 'ShopBG',
  });
  const err = pack.findings.find((f) => f.id === 'http_error');
  assert(err);
  assert.equal(err.automation.mode, 'manual');
  assert.equal(err.automation.action, null);
  assert(!err.automation.can_apply_now);
  assert.equal(err.automation.manual_form.id, 'hosting');
}

export function testResolveAutomationSpecDynamicIds() {
  const model = resolveAutomationSpec('model_gap_openai');
  assert.equal(model.action, 'run_auto_optimizer');
  const disp = resolveAutomationSpec('displacement_perplexity');
  assert.equal(disp.action, 'displacement_optimize');
}
