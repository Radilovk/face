import assert from 'node:assert/strict';
import { fetchOrigin, resolveOriginConfig } from '../src/enhance/fetchOrigin.js';
import biocode from '../config/tenants/biocode-bg.com.json' with { type: 'json' };

export async function testOriginNotConfigured() {
  const req = new Request('https://www.biocode-bg.com/');
  const res = await fetchOrigin(req, { edge: {} });
  assert.equal(res.status, 503);
  assert.equal(res.headers.get('X-AIV-Error'), 'origin_not_configured');
  const html = await res.text();
  assert(html.includes('serverless'));
}

export async function testOriginWorkerFetch() {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response('<html>shop</html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
  };

  const req = new Request('https://www.biocode-bg.com/catalog?q=1');
  const res = await fetchOrigin(req, biocode);

  assert.equal(res.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://port.radilov-k.workers.dev/catalog?q=1');
  assert.equal(calls[0].init.headers.get('Host'), 'www.biocode-bg.com');
  assert.equal(calls[0].init.cf, undefined);
}

export function testResolveOriginConfigWorker() {
  const cfg = resolveOriginConfig(biocode);
  assert.equal(cfg.type, 'worker');
  assert.equal(cfg.url, 'https://port.radilov-k.workers.dev');
  assert.equal(cfg.host, 'www.biocode-bg.com');
}
