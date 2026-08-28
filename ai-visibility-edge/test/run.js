import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withFailOpen } from '../src/middleware/failOpen.js';
import { clearConfigCache, getCachedConfig, setCachedConfig } from '../src/config/loader.js';
import { verifyFixtures } from './adapter-fixtures.js';
import { parseModelResponse } from '../src/citations/extract.js';
import { testVerifyClassify, testVerifyCitationMockFetch } from './verify-classify.js';
import {
  testPassageAutonomy,
  testComputeDiagnosticScore,
  testDisplacementExtract,
  testPerplexityAdapter,
  testReportTemplate,
} from './diagnose.js';
import { testDashboardV2Page } from './dashboard.js';
import { testGenerateQuestions, testStepStatus } from './questions-api.js';
import { testNormalizeApexHost, testSlugId } from './sites-api.js';
import {
  testBuildRecommendationsRobots,
  testBuildRecommendationsCanaryEdge,
  testInfoModulesAndChecklist,
} from './recommendations.js';
import { testStrategyThinContent, testStrategyRobotsBlocked, testStrategyWithMeasurement } from './strategy.js';
import {
  testExtractClientRedirectMeta,
  testExtractClientRedirectLocationReplace,
  testBuildApplyPlanJsonLd,
  testBuildApplyPlanRedirectHint,
} from './apply-probe.js';
import {
  testBuildEdgeDecisionMissingJsonLd,
  testBuildEdgeDecisionRobotsDisallow,
  testBuildEdgeDecisionActive,
  testBuildEdgeDecisionThinContentBlocker,
  testRenderRobotsTxt,
  testIsPlatformHost,
} from './edge.js';
import { testParseAdvisorActions, testParseAdvisorIgnoresInvalidActions } from './advisor.js';
import {
  testFetchSiteStats,
  testFetchSiteStatsPendingReprocess,
} from './site-stats.js';
import {
  testModelRegistryCurrent,
  testGeminiModelOverride,
  testModelsStatus,
  testGeminiGenerateUrl,
} from './models-config.js';
import {
  testMatchKnownBot,
  testVerifyBotCfVerified,
  testVerifyBotFakeGptbotFlagU,
  testVerifyBotGoogleExtendedAsn,
  testScheduleBotLogNoQueryString,
  testFetchBotHitStats,
} from './observe.js';
import {
  testComputeSovSessionsAndCap,
  testComputeSovPeriodFilter,
  testComputeSovPersistOptional,
  testPeriodHelpers,
  testClassifyLowOverlapMisattributed,
  testClassifyPassageNotFound,
} from './sov-d1.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function readJson(relPath) {
  return JSON.parse(readFileSync(join(ROOT, relPath), 'utf8'));
}

async function testFailOpenThrowReturnsOriginal() {
  const body = 'original-body';
  const request = new Request('https://example.com/page', {
    headers: { 'User-Agent': 'Mozilla/5.0 test' },
  });

  globalThis.fetch = async (req) => {
    assert.equal(req.url, request.url);
    return new Response(body, { status: 200 });
  };

  const response = await withFailOpen(
    request,
    {},
    { waitUntil: () => {} },
    async () => {
      throw new Error('boom');
    },
  );

  assert.equal(response.status, 200);
  assert.equal(await response.text(), body);
}

async function testFailOpenSlowHandlerPassthrough() {
  const request = new Request('https://example.com/slow');
  globalThis.fetch = async () => new Response('passthrough', { status: 200 });

  const response = await withFailOpen(
    request,
    {},
    { waitUntil: () => {} },
    () => new Promise((resolve) => setTimeout(() => resolve(new Response('late')), 200)),
    30,
  );

  assert.equal(await response.text(), 'passthrough');
}

function testModuleCacheSkipsD1() {
  clearConfigCache();
  setCachedConfig('biocode-bg.com', { tenantId: 't1' });
  const hit = getCachedConfig('biocode-bg.com');
  assert.equal(hit.tenantId, 't1');
  clearConfigCache();
}

function testBaselineQuestions() {
  const path = join(__dirname, '../baseline/2026-08-27/questions.json');
  const data = JSON.parse(readFileSync(path, 'utf8'));
  assert.equal(data.questions.length, 20);
  const domains = new Set(data.questions.map((q) => q.tenant_domain));
  assert.equal(domains.size, 4);
  assert(domains.has('daotslabna.com'));
  assert(domains.has('biocode-bg.com'));
  assert(domains.has('life-protocols.com'));
  assert(domains.has('biocode-peptides.com'));
  const situational = data.questions.filter((q) => q.situational);
  assert.equal(situational.length, 4);
}

function testAdapterFixtures() {
  const errors = verifyFixtures(readJson, parseModelResponse);
  assert.equal(errors.length, 0, errors.join('; '));

  const openaiFixture = readJson('src/citations/adapters/fixtures/openai-2026-08.json');
  const parsed = parseModelResponse('openai', openaiFixture);
  assert(parsed.citations.length >= 1, 'openai citations');
  assert(parsed.citations[0].url.includes('biocode'), 'openai url');

  const geminiFixture = readJson('src/citations/adapters/fixtures/gemini-2026-08.json');
  const g = parseModelResponse('gemini', geminiFixture);
  assert(g.citations.length >= 1, 'gemini citations');
}

async function run() {
  await testFailOpenThrowReturnsOriginal();
  await testFailOpenSlowHandlerPassthrough();
  testModuleCacheSkipsD1();
  testBaselineQuestions();
  testAdapterFixtures();
  testVerifyClassify();
  await testVerifyCitationMockFetch();
  testPassageAutonomy();
  testComputeDiagnosticScore();
  testDisplacementExtract();
  testPerplexityAdapter();
  testReportTemplate();
  testDashboardV2Page();
  testGenerateQuestions();
  testStepStatus();
  testNormalizeApexHost();
  testSlugId();
  testBuildRecommendationsRobots();
  testBuildRecommendationsCanaryEdge();
  testInfoModulesAndChecklist();
  testBuildEdgeDecisionMissingJsonLd();
  testBuildEdgeDecisionRobotsDisallow();
  testBuildEdgeDecisionActive();
  testBuildEdgeDecisionThinContentBlocker();
  testRenderRobotsTxt();
  testIsPlatformHost();
  testStrategyThinContent();
  testStrategyRobotsBlocked();
  testStrategyWithMeasurement();
  testExtractClientRedirectMeta();
  testExtractClientRedirectLocationReplace();
  testBuildApplyPlanJsonLd();
  testBuildApplyPlanRedirectHint();
  testParseAdvisorActions();
  testParseAdvisorIgnoresInvalidActions();
  testPeriodHelpers();
  testClassifyLowOverlapMisattributed();
  testClassifyPassageNotFound();
  testModelRegistryCurrent();
  testGeminiModelOverride();
  testModelsStatus();
  testGeminiGenerateUrl();
  testMatchKnownBot();
  testVerifyBotCfVerified();
  testVerifyBotFakeGptbotFlagU();
  testVerifyBotGoogleExtendedAsn();
  await testScheduleBotLogNoQueryString();
  await testFetchBotHitStats();
  await testFetchSiteStats();
  await testFetchSiteStatsPendingReprocess();
  await testComputeSovSessionsAndCap();
  await testComputeSovPeriodFilter();
  await testComputeSovPersistOptional();
  console.log('All tests passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
