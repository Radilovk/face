#!/usr/bin/env node
/**
 * Импорт baseline JSON → D1 (questions + runs)
 * Usage: npm run db:import-baseline -- --local
 */
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { parseModelResponse } from '../src/citations/extract.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BASELINE_ID = process.env.BASELINE_ID || '2026-08-27';
const BASE = join(ROOT, 'baseline', BASELINE_ID);
const local = process.argv.includes('--local');
const flag = local ? '--local' : '--remote';

const TENANT_BY_DOMAIN = {
  'daotslabna.com': 'tenant-daotslabna',
  'biocode-bg.com': 'tenant-biocode',
  'life-protocols.com': 'tenant-life-protocols',
  'biocode-peptides.com': 'tenant-biocode-peptides',
};

const questions = JSON.parse(readFileSync(join(BASE, 'questions.json'), 'utf8')).questions;
const stmts = [];

for (const q of questions) {
  const tid = TENANT_BY_DOMAIN[q.tenant_domain] ?? null;
  stmts.push(
    `INSERT OR IGNORE INTO questions (id, vertical_id, tenant_id, text, qtype, source, intent)
     VALUES (${sql(q.id)}, ${sql(q.vertical_id)}, ${tid ? sql(tid) : 'NULL'}, ${sql(q.text)}, ${sql(q.qtype)}, ${sql(q.source)}, ${sql(q.intent ?? q.qtype)});`,
  );
}

for (const model of ['openai', 'gemini']) {
  const dir = join(BASE, model);
  if (!existsSync(dir)) {
    console.warn(`skip ${model}: no directory`);
    continue;
  }

  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const payload = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    const qid = payload.question_id ?? file.replace('.json', '');
    const raw = payload.raw ?? payload;
    let answerText = '';
    try {
      answerText = parseModelResponse(model, raw).answerText ?? '';
    } catch {
      /* keep empty */
    }

    const runId = `baseline-${model}-${qid}`;
    const runAt = payload.collected_at ?? new Date().toISOString();

    stmts.push(
      `INSERT OR REPLACE INTO runs (id, question_id, model, run_at, repetition, raw_response, answer_text)
       VALUES (${sql(runId)}, ${sql(qid)}, ${sql(model)}, ${sql(runAt)}, 1, ${sql(JSON.stringify(raw))}, ${sql(answerText)});`,
    );
  }
}

const sqlPath = join(BASE, 'import-runs.sql');
writeFileSync(sqlPath, stmts.join('\n') + '\n');

execSync(`npx wrangler d1 migrations apply aiv ${flag}`, { stdio: 'inherit', cwd: ROOT });
execSync(`npx wrangler d1 execute aiv ${flag} --file=${sqlPath}`, { stdio: 'inherit', cwd: ROOT });

console.log(`Imported ${questions.length} questions + runs to D1 (${flag})`);

function sql(value) {
  if (value == null) return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}
