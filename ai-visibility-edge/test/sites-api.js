import assert from 'node:assert/strict';
import { normalizeApexHost, slugId } from '../src/api/sites.js';

export function testNormalizeApexHost() {
  assert.equal(normalizeApexHost('https://www.Example.COM/path'), 'example.com');
  assert.equal(normalizeApexHost('shop.bg'), 'shop.bg');
}

export function testSlugId() {
  assert(slugId('tenant', 'my-shop.com').startsWith('tenant-'));
}
