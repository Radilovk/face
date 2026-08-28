import assert from 'node:assert/strict';
import {
  hoursBetween,
  correlateFromBotHit,
  correlateFromDateModified,
  findLastVerifiedBotHit,
  computeCacheAgeForObservation,
  CORRELATE_WINDOW_HOURS,
} from '../src/citations/correlate.js';
import { computeDistribution, buildCacheIndex } from '../src/cache/index.js';
import { extractDateModified } from '../src/citations/verify.js';
import { createTestDb } from './d1-harness.js';

export function testHoursBetween() {
  const a = '2026-08-28T10:00:00Z';
  const b = '2026-08-28T16:00:00Z';
  assert.equal(hoursBetween(a, b), 6);
  assert.equal(hoursBetween(b, a), null);
}

export function testCorrelateFromBotHit() {
  const r = correlateFromBotHit({
    runAt: '2026-08-28T16:00:00Z',
    lastBotHitAt: '2026-08-28T10:00:00Z',
  });
  assert.equal(r.cache_age_hours, 6);
  assert.equal(r.method, 'bot_hit');

  const empty = correlateFromBotHit({ runAt: '2026-08-28T16:00:00Z', lastBotHitAt: null });
  assert.equal(empty.cache_age_hours, null);
  assert.equal(empty.method, 'no_bot_coverage');
}

export function testCorrelateFromDateModified() {
  const r = correlateFromDateModified({
    runAt: '2026-08-28T16:00:00Z',
    dateModified: '2026-08-27T16:00:00Z',
  });
  assert.equal(r.cache_age_hours, 24);
  assert.equal(r.method, 'date_modified');
}

export function testExtractDateModified() {
  const html = `<html><head>
    <meta property="article:modified_time" content="2026-08-20T12:00:00Z">
  </head></html>`;
  assert.equal(extractDateModified(html), '2026-08-20T12:00:00Z');
}

export function testComputeDistribution() {
  const d = computeDistribution([12, 24, 48, 72]);
  assert.equal(d.count, 4);
  assert.equal(d.coverage, 1);
  assert.equal(d.median, 36);
  assert.equal(d.p25, 21);
  assert.equal(d.p75, 54);
  assert.equal(d.min, 12);
  assert.equal(d.max, 72);

  const sparse = computeDistribution([10, null, null]);
  assert.equal(sparse.count, 1);
  assert(Math.abs(sparse.coverage - 1 / 3) < 0.001);
}

export async function testFindLastVerifiedBotHit() {
  const db = createTestDb();
  db.exec(`
    INSERT INTO tenants (id, name, apex_host) VALUES ('t1', 'Test', 'example.com');
    INSERT INTO bot_hits (id, tenant_id, bot_id, path, verified, verify_flag, hit_at)
    VALUES ('h1', 't1', 'gptbot', '/', 1, 'v', '2026-08-28 08:00:00');
    INSERT INTO bot_hits (id, tenant_id, bot_id, path, verified, verify_flag, hit_at)
    VALUES ('h2', 't1', 'gptbot', '/old', 1, 'v', '2026-08-20 08:00:00');
  `);

  const hit = await findLastVerifiedBotHit(db, 't1', {
    beforeAt: '2026-08-28 12:00:00',
    windowHours: 72,
  });
  assert(hit.includes('2026-08-28'));
}

export async function testComputeCacheAgeTenantBot() {
  const db = createTestDb();
  db.exec(`
    INSERT INTO tenants (id, name, apex_host) VALUES ('t1', 'Test', 'example.com');
    INSERT INTO bot_hits (id, tenant_id, bot_id, path, verified, verify_flag, hit_at)
    VALUES ('h1', 't1', 'gptbot', '/', 1, 'v', '2026-08-28 10:00:00');
  `);

  const result = await computeCacheAgeForObservation(db, {
    domain: 'example.com',
    runAt: '2026-08-28 16:00:00',
    tenantId: 't1',
    tenantDomain: 'example.com',
  });

  assert.equal(result.method, 'bot_hit');
  assert.equal(result.cache_age_hours, 6);
}

export async function testBuildCacheIndexWithData() {
  const db = createTestDb();
  db.exec(`
    INSERT INTO verticals (id, name) VALUES ('v1', 'Test vertical');
    INSERT INTO tenants (id, name, apex_host) VALUES ('t1', 'Test', 'example.com');
    INSERT INTO questions (id, vertical_id, tenant_id, text, qtype) VALUES ('q1', 'v1', 't1', 'Q?', 'brand');
    INSERT INTO runs (id, question_id, model, run_at, repetition, raw_response)
    VALUES ('r1', 'q1', 'openai', datetime('now'), 1, '{}');
    INSERT INTO observations (id, run_id, domain, class, cache_age_hours, verified_at)
    VALUES ('o1', 'r1', 'example.com', 'GROUNDED_STRONG', 12, datetime('now'));
    INSERT INTO observations (id, run_id, domain, class, cache_age_hours, verified_at)
    VALUES ('o2', 'r1', 'other.com', 'GROUNDED_WEAK', 36, datetime('now'));
  `);

  const index = await buildCacheIndex(db, { domain: 'example.com', windowHours: 72 });
  assert.equal(index.observations_total, 2);
  assert.equal(index.cache_age_hours.median, 24);
  assert(index.coverage >= 1);
}

export function testCorrelateWindowConstant() {
  assert.equal(CORRELATE_WINDOW_HOURS, 72);
}
