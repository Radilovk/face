import assert from 'node:assert/strict';
import {
  economyEnabled,
  parseMeasureModelsList,
  resolveMeasureModels,
  cronRepetitions,
  cronQuestionsPerTenant,
  measureDedupDays,
  advisorContextTtlSec,
  pickRotatingQuestions,
  isoWeekIndex,
  getEconomyStatus,
} from '../src/config/economy.js';
import { filterModelsByDedup } from '../src/citations/dedup.js';
import { createTestDb } from './d1-harness.js';

export function testEconomyEnabled() {
  assert.equal(economyEnabled({ ECONOMY_MODE: '1' }), true);
  assert.equal(economyEnabled({ ECONOMY_MODE: 'true' }), true);
  assert.equal(economyEnabled({}), false);
}

export function testParseMeasureModelsList() {
  assert.deepEqual(parseMeasureModelsList('gemini'), ['gemini']);
  assert.deepEqual(parseMeasureModelsList('openai,gemini'), ['openai', 'gemini']);
  assert.equal(parseMeasureModelsList('all'), null);
  assert.equal(parseMeasureModelsList(''), null);
}

export function testResolveMeasureModelsCronEconomy() {
  const env = { ECONOMY_MODE: '1', GEMINI_API_KEY: 'x', OPENAI_API_KEY: 'y' };
  assert.deepEqual(resolveMeasureModels(env, 'cron'), ['gemini']);
  assert.equal(resolveMeasureModels(env, 'pipeline'), null);
  assert.deepEqual(resolveMeasureModels({ ...env, MEASURE_MODELS: 'openai,gemini' }, 'pipeline'), [
    'openai',
    'gemini',
  ]);
}

export function testCronEconomyDefaults() {
  const env = { ECONOMY_MODE: '1' };
  assert.equal(cronRepetitions(env), 1);
  assert.equal(cronQuestionsPerTenant(env), 5);
  assert.equal(measureDedupDays(env, 'cron'), 7);
  assert.equal(advisorContextTtlSec(env), 900);
}

export function testLegacyCronDefaultsWithoutEconomy() {
  const env = {};
  assert.equal(cronRepetitions(env), 3);
  assert.equal(measureDedupDays(env, 'cron'), 0);
  assert.equal(advisorContextTtlSec(env), 0);
}

export function testPickRotatingQuestions() {
  const qs = [{ id: 'q001' }, { id: 'q002' }, { id: 'q003' }, { id: 'q004' }, { id: 'q005' }];
  const w0 = pickRotatingQuestions(qs, 2, 100);
  assert.deepEqual(w0.map((q) => q.id), ['q001', 'q002']);
  const w1 = pickRotatingQuestions(qs, 2, 101);
  assert.deepEqual(w1.map((q) => q.id), ['q003', 'q004']);
  const w2 = pickRotatingQuestions(qs, 2, 102);
  assert.deepEqual(w2.map((q) => q.id), ['q005', 'q001']);
}

export function testIsoWeekIndexStable() {
  const a = isoWeekIndex(new Date('2026-08-25T12:00:00Z'));
  const b = isoWeekIndex(new Date('2026-08-27T12:00:00Z'));
  assert.equal(a, b);
}

export async function testMeasureDedupSkipsRecentRun() {
  const db = createTestDb();
  db.exec(`
    INSERT INTO verticals (id, name) VALUES ('v1', 'Test');
    INSERT INTO tenants (id, name, apex_host) VALUES ('t1', 'Test', 'example.com');
    INSERT INTO questions (id, vertical_id, tenant_id, text, qtype, source)
      VALUES ('q-test', 'v1', 't1', 'Q?', 'informational', 'manual');
  `);
  db.prepare(
    `INSERT INTO runs (id, question_id, model, run_at, repetition, raw_response, answer_text)
     VALUES ('r1', 'q-test', 'gemini', datetime('now', '-1 days'), 1, '{}', 'x')`,
  ).run();

  const { models, skipped } = await filterModelsByDedup(db, 'q-test', ['gemini', 'openai'], 7);
  assert.deepEqual(models, ['openai']);
  assert.deepEqual(skipped, ['gemini']);
}

export function testEconomyStatusShape() {
  const status = getEconomyStatus({ ECONOMY_MODE: '1', GEMINI_API_KEY: 'k' });
  assert.equal(status.enabled, true);
  assert.equal(status.cron_repetitions, 1);
  assert.equal(status.cron_questions_per_tenant, 5);
  assert.equal(status.advisor_context_ttl_sec, 900);
}
