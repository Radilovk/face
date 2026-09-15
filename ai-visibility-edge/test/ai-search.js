import assert from 'node:assert/strict';
import { buildRobotsTxt, findMissingSearchCrawlers, REQUIRED_SEARCH_TOKENS } from '../src/config/aiCrawlers.js';
import { buildLlmsTxt, renderLlmsTxt, llmsResponse } from '../src/enhance/llms.js';
import { pickSchemaType, schemaToJsonLdScript } from '../src/schema/pickType.js';
import { submitIndexNow, buildIndexNowKeyFile } from '../src/indexing/indexNow.js';
import { buildEdgeDecision } from '../src/edge/decision.js';
import { buildApplyPlan, buildRobotsAllow } from '../src/apply/generate.js';
import { matchKnownBot } from '../src/observe/botList.js';

export function testBuildRobotsTxtIncludesSearchCrawlers() {
  const txt = buildRobotsTxt('example.com');
  assert(txt.includes('OAI-SearchBot'));
  assert(txt.includes('Claude-SearchBot'));
  assert(txt.includes('ChatGPT-User'));
  assert(txt.includes('PerplexityBot'));
  assert(txt.includes('Googlebot'));
  assert(txt.includes('GPTBot'));
  assert(txt.includes('Sitemap: https://example.com/sitemap.xml'));
}

export function testFindMissingSearchCrawlers() {
  const empty = findMissingSearchCrawlers('');
  assert.equal(empty.length, REQUIRED_SEARCH_TOKENS.length);

  const full = buildRobotsTxt('test.com');
  const missing = findMissingSearchCrawlers(full);
  assert.equal(missing.length, 0);
}

export function testBuildLlmsTxt() {
  const txt = buildLlmsTxt({ domain: 'brand.com', brand: 'Brand', vertical: 'SaaS' });
  assert(txt.includes('# Brand'));
  assert(txt.includes('https://brand.com/'));
  assert(txt.includes('## Основни страници'));
}

export function testRenderLlmsTxtFromEdgeConfig() {
  const body = renderLlmsTxt({
    domain: 'x.com',
    brand: 'X',
    llms_txt: '# Custom\n> hello',
  });
  assert.equal(body, '# Custom\n> hello\n');
}

export function testLlmsResponseHeaders() {
  const res = llmsResponse('test');
  assert.equal(res.headers.get('Content-Type'), 'text/plain; charset=utf-8');
  assert.equal(res.headers.get('X-AIV-Llms-Source'), 'edge');
}

export function testPickSchemaFaqVertical() {
  const schema = pickSchemaType('FAQ help', 'Acme', 'acme.com');
  assert.equal(schema['@type'], 'FAQPage');
  assert(Array.isArray(schema.mainEntity));
}

export function testPickSchemaArticleVertical() {
  const schema = pickSchemaType('blog news', 'NewsCo', 'news.co');
  assert.equal(schema['@type'], 'Article');
}

export function testPickSchemaHowToVertical() {
  const schema = pickSchemaType('tutorial guide', 'Guide', 'guide.io');
  assert.equal(schema['@type'], 'HowTo');
}

export function testSchemaToJsonLdScript() {
  const html = schemaToJsonLdScript({ '@type': 'Organization', name: 'Test' });
  assert(html.includes('application/ld+json'));
  assert(html.includes('Organization'));
}

export async function testSubmitIndexNowValidation() {
  const r1 = await submitIndexNow({ host: '', key: '', urlList: [] });
  assert.equal(r1.ok, false);

  let called = false;
  const r2 = await submitIndexNow(
    { host: 'example.com', key: 'abc123', urlList: ['https://example.com/'] },
    {
      fetch: async () => {
        called = true;
        return new Response('', { status: 202 });
      },
    },
  );
  assert(called);
  assert.equal(r2.ok, true);
  assert.equal(r2.submitted, 1);
}

export function testIndexNowKeyFile() {
  assert.equal(buildIndexNowKeyFile('my-key-123'), 'my-key-123');
}

export function testEdgeDecisionServesLlmsTxt() {
  const decision = buildEdgeDecision({
    probe: {
      domain: 'example.com',
      jsonld_blocks: 1,
      robots_ai_policy: 'allow',
      html_text_chars: 1200,
      signals: { llms_txt_ok: false },
    },
    tenant: { apex_host: 'example.com', name: 'Example' },
  });
  assert(decision.fixes.some((f) => f.id === 'serve_llms_txt'));
  assert(decision.edge_config.llms_txt?.includes('# Example'));
  assert(decision.edge_config.edge.llms_mode, 'serve');
}

export function testEdgeDecisionMissingSearchCrawlers() {
  const decision = buildEdgeDecision({
    probe: {
      domain: 'old.com',
      jsonld_blocks: 1,
      robots_ai_policy: 'allow',
      html_text_chars: 900,
      signals: { missing_search_crawlers: ['OAI-SearchBot'], llms_txt_ok: true },
    },
    tenant: { apex_host: 'old.com', name: 'Old' },
  });
  assert(decision.fixes.some((f) => f.id === 'robots_serve'));
  assert(decision.edge_config.robots_txt.includes('OAI-SearchBot'));
}

export function testApplyPlanLlmsAndRobots() {
  const plan = buildApplyPlan({
    probe: {
      domain: 'site.com',
      html_text_chars: 800,
      jsonld_blocks: 1,
      robots_ai_policy: 'allow',
      signals: { llms_txt_ok: false, missing_search_crawlers: ['OAI-SearchBot'] },
    },
    tenant: { apex_host: 'site.com', name: 'Site' },
    strategy: { top_issues: [] },
  });
  assert(plan.fixes.some((f) => f.id === 'llms_txt'));
  assert(plan.fixes.some((f) => f.id === 'robots'));
}

export function testMatchKnownBotSearchCrawlers() {
  assert.equal(matchKnownBot('compatible; OAI-SearchBot/1.0')?.id, 'oai-searchbot');
  assert.equal(matchKnownBot('compatible; Claude-SearchBot/1.0')?.id, 'claude-searchbot');
  assert.equal(matchKnownBot('compatible; ChatGPT-User/1.0')?.id, 'chatgpt-user');
}

export function testBuildRobotsAllowUsesDomain() {
  const txt = buildRobotsAllow('myshop.bg');
  assert(txt.includes('myshop.bg'));
}
