import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  checkAdapterParse,
  checkSchemaDriftFromFixtures,
  ADAPTER_SCHEMA_REGISTRY,
} from '../src/drift/schema.js';
import { checkConfigDrift, checkRunStaleness, checkBotDrift } from '../src/drift/config.js';
import { fetchDriftStatus } from '../src/drift/index.js';
import { parseModelResponse } from '../src/citations/extract.js';
import { createTestDb, seedSovFixture } from './d1-harness.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function readJson(relPath) {
  return JSON.parse(readFileSync(join(ROOT, relPath), 'utf8'));
}

export function testCheckAdapterParseOk() {
  const fixture = readJson('src/citations/adapters/fixtures/openai-2026-08.json');
  const parsed = parseModelResponse('openai', fixture);
  const alerts = checkAdapterParse('openai', parsed);
  assert.equal(alerts.length, 0);
}

export function testCheckAdapterParseEmpty() {
  const alerts = checkAdapterParse('openai', { citations: [], answerText: '', model: 'openai' });
  assert(alerts.some((a) => a.severity === 'critical'));
}

export function testSchemaDriftFromFixtures() {
  const alerts = checkSchemaDriftFromFixtures(readJson, parseModelResponse);
  assert.equal(alerts.length, 0, alerts.map((a) => a.message).join('; '));
}

export async function testConfigDriftExpired() {
  const db = createTestDb();
  db.exec(`
    INSERT INTO platform_config (key, value, verified_at, expires_at)
    VALUES ('test_key', '{}', datetime('now'), datetime('now', '-1 day'));
  `);
  const alerts = await checkConfigDrift(db);
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].kind, 'config');
}

export async function testRunStalenessNoRuns() {
  const db = createTestDb();
  const alerts = await checkRunStaleness(db);
  assert.equal(alerts[0].kind, 'runs');
  assert.equal(alerts[0].severity, 'critical');
}

export async function testRunStalenessRecent() {
  const db = createTestDb();
  seedSovFixture(db);
  const alerts = await checkRunStaleness(db, { maxDays: 8 });
  assert.equal(alerts.length, 0);
}

export async function testBotDriftHighUnverified() {
  const db = createTestDb();
  db.exec(`INSERT INTO tenants (id, name, apex_host) VALUES ('t1', 'T', 'example.com');`);
  for (let i = 0; i < 8; i++) {
    db.exec(`
      INSERT INTO bot_hits (id, tenant_id, bot_id, path, verified, verify_flag, hit_at)
      VALUES ('h${i}', 't1', 'gptbot', '/', ${i < 2 ? 1 : 0}, '${i < 2 ? 'v' : 'u'}', datetime('now'));
    `);
  }
  const alerts = await checkBotDrift(db);
  assert(alerts.length >= 1);
  assert.equal(alerts[0].kind, 'access');
}

export async function testFetchDriftStatusAggregate() {
  const db = createTestDb();
  seedSovFixture(db);
  const status = await fetchDriftStatus(db);
  assert(typeof status.ok === 'boolean');
  assert(Array.isArray(status.alerts));
}

export function testAdapterSchemaRegistry() {
  assert(ADAPTER_SCHEMA_REGISTRY.models.openai.min_citations >= 1);
}
