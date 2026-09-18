import assert from 'node:assert/strict';
import { createTestDb } from './d1-harness.js';
import { registerSite, listSites } from '../src/api/sites.js';
import { fetchPlatformInfo } from '../src/api/platform.js';

export async function testRegisterSiteWithoutVertical() {
  const db = createTestDb();
  const reg = await registerSite(db, {
    domain: 'new-client.com',
    name: 'New Client',
    run_analysis: false,
  });
  assert(reg.ok);
  assert.equal(reg.vertical_id, 'general');
  assert.equal(reg.status, 'active');
  assert.equal(reg.data_consent, true);
}

export async function testListSitesExcludesPilot() {
  const db = createTestDb();
  await registerSite(db, { domain: 'real-client.com', name: 'Real' });
  const clients = await listSites(db, { excludePilot: true });
  assert(!clients.some((s) => s.domain === 'daotslabna.com'));
  assert(clients.some((s) => s.domain === 'real-client.com'));

  const all = await listSites(db, { excludePilot: false });
  assert(all.length >= clients.length);
}

export async function testRegisterSiteDomainExists() {
  const db = createTestDb();
  const first = await registerSite(db, { domain: 'dup.example.com', name: 'Dup' });
  assert(first.ok);
  const dup = await registerSite(db, { domain: 'dup.example.com', name: 'Dup Again' });
  assert.equal(dup.error, 'domain_exists');
  assert.equal(dup.domain, 'dup.example.com');
  assert.equal(dup.tenant_id, first.tenant_id);
}

export async function testPlatformInfo() {
  const db = createTestDb();
  const env = { DB: db, WORKER_PUBLIC_HOST: 'ai-visibility-edge.example.workers.dev' };
  const info = await fetchPlatformInfo(env);
  assert.equal(info.model, 'multi_tenant_saas');
  assert(info.tenants.total >= 1);
  assert(Array.isArray(info.onboarding_flow));
}
