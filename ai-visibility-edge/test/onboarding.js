import assert from 'node:assert/strict';
import { fetchOnboardingStatus } from '../src/api/onboarding.js';
import { createTestDb } from './d1-harness.js';

export async function testOnboardingStatusSteps() {
  const db = createTestDb();
  db.exec(`
    INSERT INTO verticals (id, name) VALUES ('v1', 'Test');
    INSERT INTO tenants (id, name, apex_host, status, edge_enabled, edge_status)
    VALUES ('t1', 'Example', 'example.com', 'staging', 0, 'measurement_only');
    INSERT INTO tenant_hosts (hostname, tenant_id) VALUES ('example.com', 't1');
  `);

  const env = { DB: db, WORKER_PUBLIC_HOST: 'worker.example.dev' };
  const status = await fetchOnboardingStatus(env, 'example.com');

  assert.equal(status.domain, 'example.com');
  assert.equal(status.worker_host, 'worker.example.dev');
  assert.equal(status.steps.length, 5);
  assert.equal(status.steps[0].done, true);
  assert.equal(status.dns.target, 'worker.example.dev');
  assert.equal(status.ready_for_clients, false);
}
