import assert from 'node:assert/strict';
import {
  fetchOrigin,
  resolveOriginConfig,
  buildInternalOriginRequest,
} from '../src/enhance/fetchOrigin.js';
import biocode from '../config/tenants/biocode-bg.com.json' with { type: 'json' };

export async function testOriginNotConfigured() {
  const req = new Request('https://www.biocode-bg.com/');
  const res = await fetchOrigin(req, { edge: {} }, {});
  assert.equal(res.status, 503);
  assert.equal(res.headers.get('X-AIV-Error'), 'origin_not_configured');
}

export function testResolveOriginConfigService() {
  const cfg = resolveOriginConfig(biocode);
  assert.equal(cfg.type, 'service');
  assert.equal(cfg.binding, 'PORT');
  assert.equal(cfg.host, 'www.biocode-bg.com');
}

export function testBuildInternalOriginRequestNoPublicHost() {
  const req = new Request('https://www.biocode-bg.com/catalog?q=1', {
    headers: { 'User-Agent': 'test', Host: 'www.biocode-bg.com' },
  });
  const origin = resolveOriginConfig(biocode);
  const internal = buildInternalOriginRequest(req, new URL(req.url), origin);

  assert.equal(internal.headers.get('Host'), null);
  assert.equal(internal.headers.get('X-Forwarded-Host'), 'www.biocode-bg.com');
  assert.equal(internal.headers.get('X-AIV-Host'), 'www.biocode-bg.com');
  assert.equal(internal.headers.get('X-AIV-Internal'), '1');
  assert(internal.url.includes('/catalog?q=1'));
}

export async function testOriginServiceBindingFetch() {
  const calls = [];
  const env = {
    PORT: {
      fetch: async (req) => {
        calls.push(req);
        return new Response('<html>shop</html>', { status: 200 });
      },
    },
  };

  const req = new Request('https://www.biocode-bg.com/');
  const res = await fetchOrigin(req, biocode, env);

  assert.equal(res.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].headers.get('X-Forwarded-Host'), 'www.biocode-bg.com');
  assert.equal(calls[0].headers.get('Host'), null);
}

export async function testOriginServiceMissingBinding() {
  const req = new Request('https://www.biocode-bg.com/');
  const res = await fetchOrigin(req, biocode, {});
  assert.equal(res.status, 502);
  assert.equal(res.headers.get('X-AIV-Error'), 'origin_fetch_failed');
}
