import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  baselineRunId,
  CANONICAL_BASELINE_ID,
  ensureBaselineDir,
} from '../scripts/baseline-lib.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

export function testBaselineRunIds() {
  assert.equal(
    baselineRunId('2026-09-01', 'openai', 'q001'),
    'baseline-2026-09-01-openai-q001',
  );
  assert.equal(
    baselineRunId(CANONICAL_BASELINE_ID, 'gemini', 'q020'),
    'baseline-2026-08-27-gemini-q020',
  );
}

export function testBaselineImportSqlUsesIgnore() {
  const testId = '2099-01-15';
  const base = join(ROOT, 'baseline', testId);
  mkdirSync(join(base, 'openai'), { recursive: true });

  const questions = {
    questions: [
      {
        id: 'q001',
        vertical_id: 'v1',
        text: 'test?',
        qtype: 'info',
        source: 'test',
        tenant_domain: 'daotslabna.com',
      },
    ],
  };
  writeFileSync(join(base, 'questions.json'), JSON.stringify(questions));
  writeFileSync(
    join(base, 'openai', 'q001.json'),
    JSON.stringify({
      question_id: 'q001',
      model: 'openai',
      collected_at: '2099-01-15T12:00:00.000Z',
      raw: { output: [] },
    }),
  );

  const prevBaseline = process.env.BASELINE_ID;
  process.env.BASELINE_ID = testId;

  try {
    const runId = baselineRunId(testId, 'openai', 'q001');
    assert.match(runId, /^baseline-2099-01-15-openai-q001$/);

    ensureBaselineDir(ROOT, testId);
    const importSrc = readFileSync(join(ROOT, 'scripts/baseline-import-d1.js'), 'utf8');
    assert(importSrc.includes('INSERT OR IGNORE INTO runs'));
    assert(!importSrc.includes('INSERT OR REPLACE INTO runs'));
  } finally {
    if (prevBaseline === undefined) delete process.env.BASELINE_ID;
    else process.env.BASELINE_ID = prevBaseline;
    rmSync(base, { recursive: true, force: true });
  }
}
