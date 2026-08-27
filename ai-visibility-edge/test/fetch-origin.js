import assert from 'node:assert/strict';
import { fetchOrigin } from '../src/enhance/fetchOrigin.js';

export async function testOriginNotConfigured() {
  const req = new Request('https://www.biocode-bg.com/');
  const res = await fetchOrigin(req, { edge: { origin_host: null } });
  assert.equal(res.status, 503);
  assert.equal(res.headers.get('X-AIV-Error'), 'origin_not_configured');
  const html = await res.text();
  assert(html.includes('origin_host'));
  assert(html.includes('522'));
}

export async function testOriginResolveOverride() {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response('ok', { status: 200 });
  };

  const req = new Request('https://www.biocode-bg.com/catalog?q=1');
  const res = await fetchOrigin(req, {
    edge: { origin_host: 'origin.biocode-bg.com', origin_host_header: 'www.biocode-bg.com' },
  });

  assert.equal(res.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.cf.resolveOverride, 'origin.biocode-bg.com');
  assert.equal(calls[0].init.headers.get('Host'), 'www.biocode-bg.com');
}
