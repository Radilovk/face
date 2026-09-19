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
import {
  testCountPriceTokensEuroPrefix,
  testBrandRecountWhenProbeOmittedBrand,
  testEdgeDecisionSkipsCanonicalOnRichLanding,
  testCountBrandMentionsCaseInsensitive,
} from './probe-accuracy.js';
import {
  testSiteProfileRichLanding,
  testResolveManualGateStaticSite,
  testRichSiteSuppressesHomepageDraft,
  testRoadmapSkipsCnameWithoutEdgeFixes,
  testKasyDeployedMeasurementPhase,
  testKasyStrategyAfterDeploy,
} from './siteProfile.js';
import { testDashboardV2Page } from './dashboard.js';
import {
  testMetricCatalogComplete,
  testInterpretMetricNowRuns,
  testInterpretMetricSov,
  testInterpretMetricPending,
  testMetricInfoClientScript,
  testSanitizeMetricClientFn,
  testPillarMetricId,
} from './metric-info.js';
import {
  testRoadmapHasOrderedSteps,
  testRoadmapCnameManualStep,
  testRoadmapFreshSite,
  testPlanHeadlinePlainLanguage,
} from './roadmap.js';
import {
  testFindingsThinContentWithEvidence,
  testFindingsDisplacementWithExamples,
  testFindingsMisattribution,
  testFindingsToRecommendationsCompat,
  testNoindexCapsScore,
  testDetectNoindex,
  testFindingsAutomationOnEveryFinding,
  testResolveAutomationSpecDynamicIds,
  testFindingsHttpErrorManualOnly,
} from './findings.js';
import {
  testManualTasksFromFindings,
  testManualVsAutoSplit,
  testManualTasksMergeApplyPlan,
} from './manualTasks.js';
import {
  testManualExportTextContainsTasks,
  testManualExportFilenameSafe,
  testManualExportResponseHeaders,
  testManualExportResponse404,
} from './manualExport.js';
import {
  testManualGuideCnameHasWhereHowWhat,
  testManualGuideCmsPublish,
} from './manualGuides.js';
import {
  testAiCatalogHasDisplayName,
  testAuthMdHeading,
  testRobotsContentSignalAndAgentmap,
  testContentSignalParser,
  testServeAgentNativePath,
  testMarkdownNegotiationHeader,
  testEdgeDecisionCloudflareAeoFix,
  testEdgeDecisionIncludesAgentNativePack,
  testFindingsMissingAiCatalog,
} from './agent-native.js';
import {
  testRunAgentNativeSmokeAllPass,
  testRunAgentNativeSmokeGptbotBlocked,
  testContentSignalHelpers,
} from './smoke-aeo.js';
import {
  testDetectPilotPath,
  testDetectContentFirstPath,
  testDetectEdgeProxyPath,
  testBuildClientPlaybook,
} from './client-path.js';
import { testGenerateQuestions, testStepStatus } from './questions-api.js';
import { testNormalizeApexHost, testSlugId } from './sites-api.js';
import {
  testProductionAuthFailClosed,
  testTenantSettingsAndCronEligibility,
  testSiteUpdateAndQuestionTenantScope,
  testPlatformHostsEnv,
  testCloudflareConfigured,
  testResolveTenantOriginFallback,
} from './production-backend.js';
import {
  testRegisterSiteWithoutVertical,
  testListSitesExcludesPilot,
  testRegisterSiteDomainExists,
  testPlatformInfo,
} from './saas-platform.js';
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
import {
  testBuildRobotsTxtIncludesSearchCrawlers,
  testFindMissingSearchCrawlers,
  testBuildLlmsTxt,
  testRenderLlmsTxtFromEdgeConfig,
  testLlmsResponseHeaders,
  testPickSchemaFaqVertical,
  testPickSchemaArticleVertical,
  testPickSchemaHowToVertical,
  testSchemaToJsonLdScript,
  testSubmitIndexNowValidation,
  testIndexNowKeyFile,
  testEdgeDecisionServesLlmsTxt,
  testEdgeDecisionMissingSearchCrawlers,
  testApplyPlanLlmsAndRobots,
  testMatchKnownBotSearchCrawlers,
  testBuildRobotsAllowUsesDomain,
} from './ai-search.js';
import { testParseAdvisorActions, testParseAdvisorIgnoresInvalidActions } from './advisor.js';
import {
  testFetchSiteStats,
  testFetchSiteStatsPendingReprocess,
} from './site-stats.js';
import { testOnboardingStatusSteps } from './onboarding.js';
import {
  testCheckAdapterParseOk,
  testCheckAdapterParseEmpty,
  testSchemaDriftFromFixtures,
  testConfigDriftExpired,
  testRunStalenessNoRuns,
  testRunStalenessRecent,
  testRunStalenessOld,
  testBotDriftHighUnverified,
  testFetchDriftStatusAggregate,
  testAdapterSchemaRegistry,
} from './drift.js';
import { testBaselineSeedAndClosePilot } from './baseline-gate.js';
import { testBaselineRunIds, testBaselineImportSqlUsesIgnore } from './baseline-c1.js';
import {
  testEconomyEnabled,
  testParseMeasureModelsList,
  testResolveMeasureModelsCronEconomy,
  testCronEconomyDefaults,
  testLegacyCronDefaultsWithoutEconomy,
  testPickRotatingQuestions,
  testIsoWeekIndexStable,
  testMeasureDedupSkipsRecentRun,
  testEconomyStatusShape,
} from './economy.js';
import {
  testOptimizerPlanFreshSite,
  testOptimizerPlanNoRunsSkipsEdgeWhenDisabled,
  testOptimizerSensitiveVerticalHumanGate,
  testHumanGatesRegistry,
  testParseHtmlBlockOptimizer,
  testPickRotatingForOptimizerContext,
} from './optimizer.js';
import {
  testExtractTitleAndH1,
  testBuildSiteBrief,
  testParseQuestionsBlock,
  testGenerateQuestionDraftsSmartFallback,
  testParseQuestionsBlockInvalid,
} from './site-brief-questions.js';
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
  testHoursBetween,
  testCorrelateFromBotHit,
  testCorrelateFromDateModified,
  testExtractDateModified,
  testComputeDistribution,
  testFindLastVerifiedBotHit,
  testComputeCacheAgeTenantBot,
  testBuildCacheIndexWithData,
  testCorrelateWindowConstant,
} from './cache-index.js';
import {
  testComputeSovSessionsAndCap,
  testComputeSovPeriodFilter,
  testComputeSovPersistOptional,
  testPeriodHelpers,
  testClassifyLowOverlapMisattributed,
  testClassifyPassageNotFound,
} from './sov-d1.js';
import {
  testClassifyClaimHealth,
  testClassifyClaimNegation,
  testBrandTerms,
  testScanAnswerBrandProximity,
  testScanIgnoresUnrelatedBrands,
  testSplitSentences,
  testRateInsufficientPower,
  testRateSufficientPower,
  testHeadlineCoinFlipOnlyWithPower,
  testScanBrandRiskPersistsAndRates,
  testScanBrandRiskIdempotent,
  testScanForeignBrandNeedsNothingFromIt,
} from './risk.js';
import {
  testBuildAtomShape,
  testValidateAtomPasses,
  testLinterCatchesAnaphora,
  testLinterCatchesMissingFact,
  testLinterRefusesOwnRiskyClaim,
  testLinterLength,
  testFingerprintSurvivesParaphrase,
  testFingerprintDecimalNormalisation,
  testRepresentationNegotiation,
  testSerialisations,
  testIndexLinesOnlyPublished,
  testAtomIdStable,
  testPublishRequiresValidAtom,
  testPublishDetectsFingerprintCollision,
  testPublishHappyPath,
  testAttributionMatchesOwnAtom,
  testAttributionIgnoresCopiesOnOtherDomains,
  testAttributionSkipsDrafts,
  testAttributionIsIdempotent,
  testPerformanceSeparatesWorkingFromSilent,
  testGenerateForAnyDomainWithoutTenant,
  testMatchPassageToAtomDirect,
} from './atoms.js';

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
    30,
    () => new Promise((resolve) => setTimeout(() => resolve(new Response('late')), 200)),
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
  testCheckAdapterParseOk();
  testCheckAdapterParseEmpty();
  testSchemaDriftFromFixtures();
  testAdapterSchemaRegistry();
  testVerifyClassify();
  await testVerifyCitationMockFetch();
  testPassageAutonomy();
  testComputeDiagnosticScore();
  testDisplacementExtract();
  testPerplexityAdapter();
  testReportTemplate();
  testDashboardV2Page();
  testCountPriceTokensEuroPrefix();
  testCountBrandMentionsCaseInsensitive();
  testBrandRecountWhenProbeOmittedBrand();
  testEdgeDecisionSkipsCanonicalOnRichLanding();
  testSiteProfileRichLanding();
  testResolveManualGateStaticSite();
  testRichSiteSuppressesHomepageDraft();
  testRoadmapSkipsCnameWithoutEdgeFixes();
  testKasyDeployedMeasurementPhase();
  testKasyStrategyAfterDeploy();
  testMetricCatalogComplete();
  testInterpretMetricNowRuns();
  testInterpretMetricSov();
  testInterpretMetricPending();
  testMetricInfoClientScript();
  testSanitizeMetricClientFn();
  testPillarMetricId();
  testRoadmapHasOrderedSteps();
  testRoadmapCnameManualStep();
  testRoadmapFreshSite();
  testPlanHeadlinePlainLanguage();
  testFindingsThinContentWithEvidence();
  testFindingsDisplacementWithExamples();
  testFindingsMisattribution();
  testFindingsToRecommendationsCompat();
  testNoindexCapsScore();
  testDetectNoindex();
  testFindingsAutomationOnEveryFinding();
  testResolveAutomationSpecDynamicIds();
  testFindingsHttpErrorManualOnly();
  testManualTasksFromFindings();
  testManualVsAutoSplit();
  testManualTasksMergeApplyPlan();
  testManualExportTextContainsTasks();
  testManualExportFilenameSafe();
  testManualExportResponseHeaders();
  testManualExportResponse404();
  testManualGuideCnameHasWhereHowWhat();
  testManualGuideCmsPublish();
  testAiCatalogHasDisplayName();
  testAuthMdHeading();
  testRobotsContentSignalAndAgentmap();
  testContentSignalParser();
  testServeAgentNativePath();
  testMarkdownNegotiationHeader();
  testEdgeDecisionCloudflareAeoFix();
  testEdgeDecisionIncludesAgentNativePack();
  await testRunAgentNativeSmokeAllPass();
  await testRunAgentNativeSmokeGptbotBlocked();
  testContentSignalHelpers();
  testDetectPilotPath();
  testDetectContentFirstPath();
  testDetectEdgeProxyPath();
  testBuildClientPlaybook();
  testFindingsMissingAiCatalog();
  testGenerateQuestions();
  testStepStatus();
  testNormalizeApexHost();
  testSlugId();
  testProductionAuthFailClosed();
  await testTenantSettingsAndCronEligibility();
  await testSiteUpdateAndQuestionTenantScope();
  testPlatformHostsEnv();
  testCloudflareConfigured();
  await testResolveTenantOriginFallback();
  await testRegisterSiteWithoutVertical();
  await testListSitesExcludesPilot();
  await testRegisterSiteDomainExists();
  await testPlatformInfo();
  testBuildRecommendationsRobots();
  testBuildRecommendationsCanaryEdge();
  testInfoModulesAndChecklist();
  testBuildEdgeDecisionMissingJsonLd();
  testBuildEdgeDecisionRobotsDisallow();
  testBuildEdgeDecisionActive();
  testBuildEdgeDecisionThinContentBlocker();
  testRenderRobotsTxt();
  testIsPlatformHost();
  testBuildRobotsTxtIncludesSearchCrawlers();
  testFindMissingSearchCrawlers();
  testBuildLlmsTxt();
  testRenderLlmsTxtFromEdgeConfig();
  testLlmsResponseHeaders();
  testPickSchemaFaqVertical();
  testPickSchemaArticleVertical();
  testPickSchemaHowToVertical();
  testSchemaToJsonLdScript();
  await testSubmitIndexNowValidation();
  testIndexNowKeyFile();
  testEdgeDecisionServesLlmsTxt();
  testEdgeDecisionMissingSearchCrawlers();
  testApplyPlanLlmsAndRobots();
  testMatchKnownBotSearchCrawlers();
  testBuildRobotsAllowUsesDomain();
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
  testHoursBetween();
  testCorrelateFromBotHit();
  testCorrelateFromDateModified();
  testExtractDateModified();
  testComputeDistribution();
  testCorrelateWindowConstant();
  await testFindLastVerifiedBotHit();
  await testComputeCacheAgeTenantBot();
  await testBuildCacheIndexWithData();
  await testOnboardingStatusSteps();
  await testConfigDriftExpired();
  await testRunStalenessNoRuns();
  await testRunStalenessRecent();
  await testRunStalenessOld();
  await testBotDriftHighUnverified();
  await testFetchDriftStatusAggregate();
  testBaselineRunIds();
  testBaselineImportSqlUsesIgnore();
  testEconomyEnabled();
  testParseMeasureModelsList();
  testResolveMeasureModelsCronEconomy();
  testCronEconomyDefaults();
  testLegacyCronDefaultsWithoutEconomy();
  testPickRotatingQuestions();
  testIsoWeekIndexStable();
  await testMeasureDedupSkipsRecentRun();
  testEconomyStatusShape();
  testOptimizerPlanFreshSite();
  testOptimizerPlanNoRunsSkipsEdgeWhenDisabled();
  testOptimizerSensitiveVerticalHumanGate();
  testHumanGatesRegistry();
  testParseHtmlBlockOptimizer();
  testPickRotatingForOptimizerContext();
  testBaselineSeedAndClosePilot();
  testExtractTitleAndH1();
  testBuildSiteBrief();
  testParseQuestionsBlock();
  testParseQuestionsBlockInvalid();
  await testGenerateQuestionDraftsSmartFallback();
  await testFetchSiteStats();
  await testFetchSiteStatsPendingReprocess();
  await testComputeSovSessionsAndCap();
  await testComputeSovPeriodFilter();
  await testComputeSovPersistOptional();
  testClassifyClaimHealth();
  testClassifyClaimNegation();
  testBrandTerms();
  testScanAnswerBrandProximity();
  testScanIgnoresUnrelatedBrands();
  testSplitSentences();
  testRateInsufficientPower();
  testRateSufficientPower();
  testHeadlineCoinFlipOnlyWithPower();
  await testScanBrandRiskPersistsAndRates();
  await testScanBrandRiskIdempotent();
  await testScanForeignBrandNeedsNothingFromIt();
  testBuildAtomShape();
  testValidateAtomPasses();
  testLinterCatchesAnaphora();
  testLinterCatchesMissingFact();
  testLinterRefusesOwnRiskyClaim();
  testLinterLength();
  testFingerprintSurvivesParaphrase();
  testFingerprintDecimalNormalisation();
  testRepresentationNegotiation();
  testSerialisations();
  testIndexLinesOnlyPublished();
  testAtomIdStable();
  testMatchPassageToAtomDirect();
  await testPublishRequiresValidAtom();
  await testPublishDetectsFingerprintCollision();
  await testPublishHappyPath();
  await testAttributionMatchesOwnAtom();
  await testAttributionIgnoresCopiesOnOtherDomains();
  await testAttributionSkipsDrafts();
  await testAttributionIsIdempotent();
  await testPerformanceSeparatesWorkingFromSilent();
  await testGenerateForAnyDomainWithoutTenant();
  console.log('All tests passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
