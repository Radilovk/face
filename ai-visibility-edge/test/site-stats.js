import assert from 'node:assert/strict';
import { fetchSiteStats } from '../src/api/siteStats.js';
import { createTestDb, seedSovFixture } from './d1-harness.js';

export async function testFetchSiteStats() {
  const db = createTestDb();
  const { domain, verticalId } = seedSovFixture(db);

  // Link tenant to vertical for SOV
  db.exec(`UPDATE watched_domains SET vertical_id = '${verticalId}' WHERE domain = 'example.com'`);

  const stats = await fetchSiteStats({ DB: db }, domain);

  assert.equal(stats.runs, 3);
  assert.equal(stats.observations, 3);
  assert.equal(stats.pending_reprocess, 0);
  assert(stats.layer1_ready);
  assert(stats.sov?.sov != null);
}

export async function testFetchSiteStatsPendingReprocess() {
  const db = createTestDb();
  const { domain } = seedSovFixture(db);

  db.exec(`
    INSERT INTO runs (id, question_id, model, run_at, repetition, raw_response)
      VALUES ('r4', 'q1', 'openai', '2026-08-28T13:00:00.000Z', 1, '{}');
  `);

  const stats = await fetchSiteStats({ DB: db }, domain);
  assert.equal(stats.pending_reprocess, 1);
  assert(stats.needs_reprocess);
}
