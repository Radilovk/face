import assert from 'node:assert/strict';
import { summarizeRobots, getRobotsUserAgentBlock, probeDomain } from '../src/diagnose/probe.js';
import { hasAgentmap } from '../src/enhance/agentNative.js';
import { buildSiteFindings } from '../src/diagnose/findings.js';
import { isOriginAgentNativeReady } from '../src/diagnose/originReady.js';

const DAOTSLABNA_ROBOTS = `# AI search optimized
User-agent: *
Content-Signal: search=yes,ai-input=yes,ai-train=no,use=reference
Agentmap: https://daotslabna.com/.well-known/ai-catalog.json
Allow: /
Disallow: /admin.html

User-agent: CCBot
Disallow: /

User-agent: GPTBot
Allow: /
Disallow: /admin.html
`;

const DAOTSLABNA_HTML = `<!DOCTYPE html>
<html lang="bg">
<head>
  <title>Да отслабна — програма за отслабване</title>
  <meta name="description" content="Да отслабна е програма за здравословно отслабване с персонален план, хранене и движение.">
  <script type="application/ld+json">{"@type":"Organization","name":"Да отслабна"}</script>
  <script type="application/ld+json">{"@type":"WebSite","name":"Да отслабна"}</script>
</head>
<body>
  <h1>Да отслабна</h1>
  <p>${'Здравословно отслабване с персонален план. '.repeat(80)}</p>
</body>
</html>`;

function mockDaotslabnaFetch() {
  return async (url, init = {}) => {
    const u = String(url);
    const ua = init.headers?.['User-Agent'] ?? '';
    if (u.includes('/robots.txt')) {
      return new Response(DAOTSLABNA_ROBOTS, { status: 200 });
    }
    if (init.method === 'HEAD' && ua.includes('GPTBot')) {
      return new Response(null, { status: 200 });
    }
    if (u.includes('/.well-known/ai-catalog.json')) {
      return new Response(JSON.stringify({ host: { displayName: 'Да отслабна' }, entries: [{ identifier: 'x' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (u.includes('/auth.md')) {
      return new Response('# auth.md\n\nOAuth steps for agents.', { status: 200 });
    }
    if (u.includes('/.well-known/api-catalog')) {
      return new Response(JSON.stringify({ linkset: [{ rel: 'api-catalog', href: 'https://daotslabna.com/api' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (u.includes('/llms.txt')) {
      return new Response('# Да отслабна\n', { status: 200 });
    }
    if (u.includes('/sitemap.xml')) {
      return new Response('<?xml version="1.0"?><urlset><url><loc>https://daotslabna.com/</loc></url></urlset>', {
        status: 200,
      });
    }
    if (u.includes('daotslabna.com')) {
      return new Response(DAOTSLABNA_HTML, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
    return new Response('not found', { status: 404 });
  };
}

function assertDaotslabnaProbeFindings(p) {
  assert.notEqual(p.robots_ai_policy, 'disallow_all');
  assert.equal(p.signals.agentmap_ok, true);
  assert(isOriginAgentNativeReady(p));
  const f = buildSiteFindings({
    probe: p,
    brand: 'Да отслабна',
    tenant: { is_pilot: true },
    edgeActive: false,
  });
  const ids = f.findings.map((x) => x.id);
  assert(!ids.includes('robots_disallow_all'), 'false critical: ' + ids.join(', '));
  assert(!ids.includes('thin_content'), 'false thin: ' + ids.join(', '));
  assert(!ids.includes('missing_ai_catalog'));
  assert(!ids.includes('edge_activate'));
}

export function testSummarizeRobotsIgnoresCcBotDisallow() {
  assert.notEqual(summarizeRobots(DAOTSLABNA_ROBOTS), 'disallow_all');
  assert.equal(summarizeRobots(DAOTSLABNA_ROBOTS), 'ai_rules_present');
  const star = getRobotsUserAgentBlock(DAOTSLABNA_ROBOTS, '*');
  assert(star.allows.includes('/'));
  assert(!star.disallows.includes('/'));
}

export function testHasAgentmapFullUrl() {
  assert(
    hasAgentmap('Agentmap: https://daotslabna.com/.well-known/ai-catalog.json'),
  );
}

/** Deterministic regression — no network (CI-safe). */
export async function testDaotslabnaFixtureProbeFindings() {
  const p = await probeDomain('daotslabna.com', {
    brand: 'Да отслабна',
    fetch: mockDaotslabnaFetch(),
  });
  assertDaotslabnaProbeFindings(p);
}

/** Optional live check — skipped in CI (network flakiness). */
export async function testDaotslabnaLiveProbeFindings() {
  if (process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true') {
    return;
  }
  const p = await probeDomain('daotslabna.com', { brand: 'Да отслабна' });
  assertDaotslabnaProbeFindings(p);
}
