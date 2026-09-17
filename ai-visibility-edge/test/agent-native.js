import assert from 'node:assert/strict';
import {
  buildAiCatalog,
  buildAuthMd,
  buildAgentNativePack,
  contentSignalOk,
  hasAgentmap,
  parseContentSignal,
  serveAgentNativePath,
  wantsMarkdownResponse,
} from '../src/enhance/agentNative.js';
import { buildRobotsTxt } from '../src/config/aiCrawlers.js';
import { buildEdgeDecision } from '../src/edge/decision.js';
import { buildSiteFindings } from '../src/diagnose/findings.js';

export function testAiCatalogHasDisplayName() {
  const ard = buildAiCatalog({ domain: 'shop.bg', brand: 'Shop', base: 'https://shop.bg' });
  assert.equal(ard.host.displayName, 'Shop');
  assert(ard.entries.every((e) => e.displayName));
  assert(!ard.entries.some((e) => e.title));
}

export function testAuthMdHeading() {
  const md = buildAuthMd({ domain: 'shop.bg', brand: 'Shop', base: 'https://shop.bg' });
  assert(/^#\s+auth\.md/im.test(md));
}

export function testRobotsContentSignalAndAgentmap() {
  const txt = buildRobotsTxt('shop.bg', { agentNative: true });
  assert(txt.includes('Content-Signal: search=yes, ai-input=yes, ai-train=no'));
  assert(txt.includes('Agentmap: /.well-known/ai-catalog.json'));
}

export function testContentSignalParser() {
  const robots = 'Content-Signal: search=yes, ai-input=yes, ai-train=no\nUser-agent: *';
  assert(contentSignalOk(parseContentSignal(robots)));
  assert(hasAgentmap('Agentmap: /.well-known/ai-catalog.json'));
}

export function testServeAgentNativePath() {
  const pack = buildAgentNativePack({
    domain: 'x.com',
    brand: 'X',
    probe: { raw_json: { title: 'T', text_sample: 'hello' } },
  });
  const cfg = { edge: { agent_native: true }, ...pack };
  const res = serveAgentNativePath('/.well-known/ai-catalog.json', cfg);
  assert(res);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
  assert.equal(res.headers.get('Content-Type'), 'application/json; charset=utf-8');
}

export function testMarkdownNegotiationHeader() {
  const req = new Request('https://x.com/', { headers: { Accept: 'text/html, text/markdown' } });
  assert(wantsMarkdownResponse(req));
}

export function testEdgeDecisionIncludesAgentNativePack() {
  const decision = buildEdgeDecision({
    probe: {
      domain: 'new.com',
      jsonld_blocks: 0,
      robots_ai_policy: 'none',
      html_text_chars: 900,
      signals: {
        llms_txt_ok: false,
        ai_catalog_ok: false,
        auth_md_ok: false,
        api_catalog_ok: false,
        content_signal_ok: false,
        agentmap_ok: false,
      },
    },
    tenant: { apex_host: 'new.com', name: 'NewCo' },
  });
  assert(decision.fixes.some((f) => f.id === 'serve_agent_native'));
  assert(decision.edge_config.edge.agent_native);
  assert(decision.edge_config.ai_catalog?.host?.displayName === 'NewCo');
  assert(decision.edge_config.auth_md?.includes('auth.md'));
}

export function testFindingsMissingAiCatalog() {
  const pack = buildSiteFindings({
    probe: {
      domain: 'x.com',
      http_status: 200,
      html_text_chars: 800,
      jsonld_blocks: 1,
      robots_ai_policy: 'allow',
      signals: { ai_catalog_ok: false, auth_md_ok: true, content_signal_ok: true, llms_txt_ok: true },
    },
    brand: 'X',
    tenant: { apex_host: 'x.com' },
    edgeActive: false,
  });
  assert(pack.findings.some((f) => f.id === 'missing_ai_catalog'));
}
