import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

/** In-memory SQLite with D1-compatible prepare/bind/all/first/run API. */
export function createTestDb() {
  const db = new DatabaseSync(':memory:');
  applyMigrations(db);
  return wrapDb(db);
}

function applyMigrations(db) {
  const dir = join(ROOT, 'migrations');
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const file of files) {
    const sql = readFileSync(join(dir, file), 'utf8');
    db.exec(sql);
  }
}

function wrapDb(sqlite) {
  return {
    prepare(sql) {
      const stmt = sqlite.prepare(sql);
      let binds = [];
      return {
        bind(...args) {
          binds = args;
          return this;
        },
        all() {
          const rows = stmt.all(...binds);
          return { results: rows };
        },
        first() {
          return stmt.get(...binds) ?? null;
        },
        run() {
          stmt.run(...binds);
          return { success: true };
        },
      };
    },
    exec(sql) {
      sqlite.exec(sql);
    },
  };
}

export function seedSovFixture(db) {
  const period = '2026-35';
  const runAt = '2026-08-28T12:00:00.000Z';

  db.exec(`
    INSERT INTO verticals (id, name) VALUES ('v1', 'Test vertical');
    INSERT INTO tenants (id, name, apex_host) VALUES ('t1', 'Test', 'example.com');
    INSERT INTO watched_domains (domain, vertical_id, role, tenant_id)
      VALUES ('example.com', 'v1', 'tenant', 't1');
    INSERT INTO questions (id, vertical_id, tenant_id, text, qtype, source)
      VALUES ('q1', 'v1', 't1', 'Q1', 'informational', 'manual'),
             ('q2', 'v1', 't1', 'Q2', 'informational', 'manual'),
             ('q3', 'v1', 't1', 'Q3', 'informational', 'manual');
    INSERT INTO runs (id, question_id, model, run_at, repetition, raw_response, answer_text)
      VALUES ('r1', 'q1', 'openai', '${runAt}', 1, '{}', 'answer'),
             ('r2', 'q2', 'openai', '${runAt}', 1, '{}', 'answer'),
             ('r3', 'q3', 'gemini', '${runAt}', 1, '{}', 'answer');
    INSERT INTO observations (id, run_id, domain, class, verified_at)
      VALUES ('o1', 'r1', 'example.com', 'GROUNDED_VERIFIED', '${runAt}'),
             ('o2', 'r2', 'example.com', 'GROUNDED_WEAK', '${runAt}'),
             ('o3', 'r3', 'other.com', 'GROUNDED_WEAK', '${runAt}');
  `);

  return { period, verticalId: 'v1', domain: 'example.com' };
}
