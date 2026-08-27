import assert from 'node:assert/strict';
import { renderRobotsTxt, handleRobotsRequest } from '../src/enhance/robots.js';
import biocode from '../config/tenants/biocode-bg.com.json' with { type: 'json' };

export async function testRenderRobotsTxt() {
  const body = renderRobotsTxt(biocode);
  assert(body.includes('GPTBot'));
  assert(body.includes('Allow: /'));
  assert(body.includes('biocode-bg.com/sitemap.xml'));
}

export async function testHandleRobotsServe() {
  const req = new Request('https://biocode-bg.com/robots.txt');
  const res = await handleRobotsRequest(req, biocode, async () => {
    throw new Error('should not fetch origin in serve mode');
  });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('X-AIV-Robots-Source'), 'edge-config');
  const text = await res.text();
  assert(text.includes('GPTBot'));
}

export async function testHandleRobotsMerge() {
  const mergeConfig = {
    ...biocode,
    edge: { ...biocode.edge, robots_mode: 'merge' },
  };
  const req = new Request('https://biocode-bg.com/robots.txt');
  const res = await handleRobotsRequest(req, mergeConfig, async () =>
    new Response('User-agent: *\nDisallow: /admin/\n', { status: 200 }),
  );
  const text = await res.text();
  assert(text.includes('Disallow: /admin/'));
  assert(text.includes('GPTBot'));
  assert.equal(res.headers.get('X-AIV-Robots-Source'), 'edge-merge');
}
