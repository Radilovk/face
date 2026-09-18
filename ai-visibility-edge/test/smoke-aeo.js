import assert from 'node:assert/strict';
import { runAgentNativeSmoke } from '../src/diagnose/smoke.js';
import { contentSignalOk, hasAgentmap } from '../src/enhance/agentNative.js';

function mockFetch(handlers) {
  return async (url, init = {}) => {
    const key = `${init.method ?? 'GET'} ${url} ${init.headers?.['User-Agent'] ?? ''} ${init.headers?.Accept ?? ''}`;
    for (const [pattern, fn] of handlers) {
      if (pattern.test(key) || pattern.test(String(url))) {
        return fn(url, init);
      }
    }
    return new Response('not found', { status: 404 });
  };
}

export async function testRunAgentNativeSmokeAllPass() {
  const robots = [
    'Content-Signal: search=yes, ai-input=yes, ai-train=no',
    'Agentmap: /.well-known/ai-catalog.json',
    'User-agent: *',
    'Allow: /',
  ].join('\n');

  const fetchImpl = mockFetch([
    [/HEAD.*GPTBot/, () => new Response(null, { status: 200 })],
    [/robots\.txt/, () => new Response(robots, { status: 200 })],
    [
      /ai-catalog\.json/,
      () =>
        new Response(JSON.stringify({ host: { displayName: 'Test' }, entries: [{ identifier: 'x' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    ],
    [/auth\.md/, () => new Response('# auth.md\n\nsteps', { status: 200 })],
    [
      /api-catalog/,
      () =>
        new Response(JSON.stringify({ linkset: [{ rel: 'api-catalog', href: 'https://x/y' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    ],
    [/llms\.txt/, () => new Response('# llms\n', { status: 200 })],
    [/text\/markdown/, () => new Response('# md', { status: 200, headers: { 'Content-Type': 'text/markdown' } })],
  ]);

  const result = await runAgentNativeSmoke('example.com', { fetch: fetchImpl });
  assert.equal(result.ok, true);
  assert.equal(result.level, 5);
  assert.equal(result.failed, 0);
}

export async function testRunAgentNativeSmokeGptbotBlocked() {
  const fetchImpl = mockFetch([
    [/HEAD.*GPTBot/, () => new Response(null, { status: 403 })],
    [/robots\.txt/, () => new Response('User-agent: *\nAllow: /', { status: 200 })],
  ]);

  const result = await runAgentNativeSmoke('blocked.com', { fetch: fetchImpl });
  assert.equal(result.ok, false);
  const gpt = result.checks.find((c) => c.id === 'gptbot_homepage');
  assert.equal(gpt.pass, false);
}

export function testContentSignalHelpers() {
  const text = 'Content-Signal: search=yes, ai-input=yes, ai-train=no\nAgentmap: /.well-known/ai-catalog.json';
  assert(contentSignalOk('search=yes, ai-input=yes, ai-train=no'));
  assert(hasAgentmap(text));
}
