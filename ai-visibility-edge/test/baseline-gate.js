import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BASE = join(ROOT, 'baseline/2026-08-27');

export function testBaselineSeedAndClosePilot() {
  const manifestBackup = readFileSync(join(BASE, 'manifest.json'), 'utf8');

  try {
    for (const model of ['openai', 'gemini', 'perplexity']) {
      const dir = join(BASE, model);
      if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
    }

    execSync('node scripts/baseline-seed-fixtures.js -- --limit 5', { cwd: ROOT, stdio: 'pipe' });
    execSync('node scripts/baseline-close.js -- --pilot', { cwd: ROOT, stdio: 'pipe' });

    const manifest = JSON.parse(readFileSync(join(BASE, 'manifest.json'), 'utf8'));
    assert.equal(manifest.block_0_1, 'pilot_closed');
    assert(manifest.models_collected.length >= 2);
    assert.equal(manifest.gate_report.models.openai, 5);
  } finally {
    writeFileSync(join(BASE, 'manifest.json'), manifestBackup);
    for (const model of ['openai', 'gemini', 'perplexity']) {
      const dir = join(BASE, model);
      if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
    }
  }
}
