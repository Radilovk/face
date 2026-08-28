#!/usr/bin/env node
/**
 * Validate baseline gates and mark manifest closed (Block 0.1).
 * Usage: npm run baseline:close [-- --pilot]
 *
 * --pilot: close when 5×2 minimum met (MVP gate per §18)
 * default: requires full 20×2 or 20×3 per manifest gates
 */
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASELINE_DIR = join(__dirname, '../baseline/2026-08-27');
const manifestPath = join(BASELINE_DIR, 'manifest.json');
const pilotMode = process.argv.includes('--pilot');

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const minModels = manifest.gates?.minimum_models ?? 2;
const minQuestions = pilotMode ? 5 : (manifest.gates?.minimum_questions ?? 20);
const models = ['openai', 'gemini', 'perplexity'];

const report = { models: {}, errors: [] };

for (const model of models) {
  const dir = join(BASELINE_DIR, model);
  if (!existsSync(dir)) {
    report.models[model] = 0;
    if (model !== 'perplexity') {
      report.errors.push(`Missing directory: baseline/${model}/`);
    }
    continue;
  }
  const count = readdirSync(dir).filter((f) => f.endsWith('.json')).length;
  report.models[model] = count;
  if (model !== 'perplexity' && count < minQuestions) {
    report.errors.push(`${model}: ${count}/${minQuestions} files`);
  }
}

const modelsReady = ['openai', 'gemini'].filter((m) => (report.models[m] ?? 0) >= minQuestions).length;

if (report.errors.length > 0 || modelsReady < minModels) {
  console.error('Baseline gate NOT met:');
  for (const e of report.errors) console.error(' -', e);
  console.error('Models ready:', modelsReady, '/', minModels);
  console.error('Run: npm run baseline:collect -- --limit', minQuestions);
  console.error('  or: npm run baseline:seed-fixtures -- --limit', minQuestions);
  process.exit(1);
}

manifest.status = pilotMode ? 'pilot_closed' : 'closed';
manifest.closed_at = new Date().toISOString();
manifest.models_collected = Object.keys(report.models).filter((m) => report.models[m] > 0);
manifest.gate_report = report;
manifest.block_0_1 = pilotMode ? 'pilot_closed' : 'closed';

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

console.log('Block 0.1 gate CLOSED:', manifest.status);
console.log(JSON.stringify(report.models, null, 2));
