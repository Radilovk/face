import assert from 'node:assert/strict';
import { summarizeRobots, getRobotsUserAgentBlock } from '../src/diagnose/probe.js';
import { hasAgentmap } from '../src/enhance/agentNative.js';
import { buildSiteFindings } from '../src/diagnose/findings.js';
import { isOriginAgentNativeReady } from '../src/diagnose/originReady.js';

const DAOTSLABNA_ROBOTS = `# AI search optimized
User-agent: *
Content-Signal: search=yes,ai-input=yes,ai-train=no,use=reference
Allow: /
Disallow: /admin.html

User-agent: CCBot
Disallow: /

User-agent: GPTBot
Allow: /
Disallow: /admin.html
`;

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

export async function testDaotslabnaLiveProbeFindings() {
  const { probeDomain } = await import('../src/diagnose/probe.js');
  const p = await probeDomain('daotslabna.com', { brand: 'Да отслабна' });
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
