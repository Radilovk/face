#!/usr/bin/env node
/**
 * Seed baseline raw JSON from adapter fixtures (Block 0.1 MVP without live API).
 * Usage: npm run baseline:seed-fixtures [-- --limit 5]
 *
 * Creates baseline/{model}/q00N.json for pilot gate (5×2 minimum).
 * Live collect still required for production baseline history.
 */
import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASELINE_DIR = join(__dirname, '../baseline/2026-08-27');
const questions = JSON.parse(readFileSync(join(BASELINE_DIR, 'questions.json'), 'utf8')).questions;

const args = process.argv.slice(2);
const limit = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : 5;

const MODEL_FIXTURES = {
  openai: join(__dirname, '../src/citations/adapters/fixtures/openai-2026-08.json'),
  gemini: join(__dirname, '../src/citations/adapters/fixtures/gemini-2026-08.json'),
  perplexity: join(__dirname, '../src/citations/adapters/fixtures/perplexity-2026-08.json'),
};

const slice = questions.slice(0, limit);
let written = 0;

for (const [model, fixturePath] of Object.entries(MODEL_FIXTURES)) {
  if (!existsSync(fixturePath)) {
    console.warn(`skip ${model}: fixture missing`);
    continue;
  }
  const raw = JSON.parse(readFileSync(fixturePath, 'utf8'));
  const outDir = join(BASELINE_DIR, model);
  mkdirSync(outDir, { recursive: true });

  for (const q of slice) {
    const outPath = join(outDir, `${q.id}.json`);
    if (existsSync(outPath)) {
      console.log(`skip ${model}/${q.id} (exists)`);
      continue;
    }
    writeFileSync(
      outPath,
      JSON.stringify(
        {
          question_id: q.id,
          model,
          collected_at: new Date().toISOString(),
          question: q.text,
          raw,
          source: 'adapter_fixture_seed',
        },
        null,
        2,
      ),
    );
    written++;
    console.log(`seed ${model}/${q.id}`);
  }
}

updateManifest(Object.keys(MODEL_FIXTURES).filter((m) => existsSync(MODEL_FIXTURES[m])));

function updateManifest(models) {
  const manifestPath = join(BASELINE_DIR, 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const existing = new Set(manifest.models_collected || []);
  for (const m of models) existing.add(m);
  manifest.models_collected = [...existing];
  manifest.fixture_seeded = true;
  manifest.fixture_seeded_at = new Date().toISOString();
  manifest.status = evaluateStatus(manifest, models);
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
}

function evaluateStatus(manifest, models) {
  const minModels = manifest.gates?.minimum_models ?? 2;
  const minQuestions = manifest.gates?.minimum_questions ?? 20;
  const pilotQuestions = Math.min(5, minQuestions);

  const counts = models.map((m) => {
    const dir = join(BASELINE_DIR, m);
    if (!existsSync(dir)) return 0;
    return readdirSync(dir).filter((f) => f.endsWith('.json')).length;
  });

  const hasPilot = counts.filter((c) => c >= pilotQuestions).length >= minModels;
  const hasFull = counts.filter((c) => c >= minQuestions).length >= minModels;

  if (hasFull) return 'collected';
  if (hasPilot) return 'pilot_ready';
  if (manifest.models_collected.length >= minModels) return 'partial';
  return manifest.status ?? 'questions_ready';
}

console.log(`Done. ${written} files written.`);
