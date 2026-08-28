import assert from 'node:assert/strict';
import { computeSov, currentPeriod, periodToUtcRange, runAtInPeriod } from '../src/index/sov.js';
import { classifyFromVerify } from '../src/citations/classify.js';
import { createTestDb, seedSovFixture } from './d1-harness.js';

export async function testComputeSovSessionsAndCap() {
  const db = createTestDb();
  const { period, verticalId, domain } = seedSovFixture(db);

  const score = await computeSov(db, { domain, verticalId, model: null, period, persist: false });

  assert.equal(score.sessions, 3, 'sessions = distinct runs in period');
  assert.equal(score.runs_with_citation, 2, 'two runs cite example.com');
  assert(score.frequency <= 1, 'frequency capped at 1');
  assert(score.sov <= 100, 'SOV capped at 100');
  assert.equal(score.observations_count, 2);
  assert(typeof score.share === 'number');
}

export async function testComputeSovPeriodFilter() {
  const db = createTestDb();
  const { verticalId, domain } = seedSovFixture(db);

  db.exec(`
    INSERT INTO runs (id, question_id, model, run_at, repetition, raw_response)
      VALUES ('r-old', 'q1', 'openai', '2020-01-01T00:00:00.000Z', 1, '{}');
    INSERT INTO observations (id, run_id, domain, class, verified_at)
      VALUES ('o-old', 'r-old', 'example.com', 'GROUNDED_VERIFIED', '2020-01-01T00:00:00.000Z');
  `);

  const period = '2026-35';
  const score = await computeSov(db, { domain, verticalId, model: null, period, persist: false });
  assert.equal(score.sessions, 3, 'old run excluded by period filter');
}

export async function testComputeSovPersistOptional() {
  const db = createTestDb();
  const { period, verticalId, domain } = seedSovFixture(db);

  await computeSov(db, { domain, verticalId, model: null, period, persist: false });
  const row = db.prepare(`SELECT COUNT(*) as n FROM sov_scores`).first();
  assert.equal(row.n, 0, 'no insert when persist=false');

  await computeSov(db, { domain, verticalId, model: null, period, persist: true });
  const row2 = db.prepare(`SELECT COUNT(*) as n FROM sov_scores`).first();
  assert.equal(row2.n, 1, 'insert when persist=true');
}

export function testPeriodHelpers() {
  const d = new Date('2026-08-28T12:00:00.000Z');
  const period = currentPeriod(d);
  assert.match(period, /^\d{4}-\d{2}$/);
  assert(runAtInPeriod('2026-08-28T12:00:00.000Z', period));
  assert(!runAtInPeriod('2020-01-01T00:00:00.000Z', period));
  const range = periodToUtcRange(period);
  assert(range.start < range.end);
}

export function testClassifyLowOverlapMisattributed() {
  const result = classifyFromVerify({
    numeric_match: null,
    needsSemantic: false,
    overlap: 0,
    url: 'https://x.com',
    domain: 'x.com',
    passage_found: true,
  });
  assert.equal(result.class, 'MISATTRIBUTED');
}

export function testClassifyPassageNotFound() {
  const result = classifyFromVerify({
    passage_found: false,
    overlap: 0,
    url: 'https://x.com',
  });
  assert.equal(result.class, 'MISATTRIBUTED');
}
