#!/usr/bin/env node
/**
 * Събира baseline raw отговори за questions.json
 * Usage: npm run baseline:collect [-- --model openai|gemini|all]
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  openaiModelId,
  geminiModelId,
  geminiGenerateUrl,
  perplexityModelId,
  MODEL_REGISTRY,
} from '../src/config/models.js';
import { ensureBaselineDir, resolveBaselineId } from './baseline-lib.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BASELINE_ID = resolveBaselineId();
const BASELINE_DIR = ensureBaselineDir(ROOT, BASELINE_ID);
const questions = JSON.parse(readFileSync(join(BASELINE_DIR, 'questions.json'), 'utf8')).questions;

console.log(`baseline collect: ${BASELINE_ID} → ${BASELINE_DIR}`);

const args = process.argv.slice(2);
const modelArg = args.includes('--model') ? args[args.indexOf('--model') + 1] : 'all';
const limitArg = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : questions.length;

const models =
  modelArg === 'all'
    ? ['openai', 'gemini', 'perplexity'].filter((m) => {
        if (m === 'openai') return process.env.OPENAI_API_KEY;
        if (m === 'gemini') return process.env.GEMINI_API_KEY;
        if (m === 'perplexity') return process.env.PERPLEXITY_API_KEY;
        return false;
      })
    : [modelArg];

if (models.length === 0) {
  console.error('No API keys. Set OPENAI_API_KEY and/or GEMINI_API_KEY (Perplexity optional)');
  process.exit(1);
}

async function askOpenAI(text) {
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: openaiModelId(process.env),
      tools: MODEL_REGISTRY.openai.tools,
      input: text,
    }),
  });
  const raw = await res.json();
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${JSON.stringify(raw)}`);
  return raw;
}

async function askGemini(text) {
  const key = process.env.GEMINI_API_KEY;
  const url = geminiGenerateUrl(geminiModelId(process.env, 'citations'), key);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }],
      tools: [MODEL_REGISTRY.gemini.searchTool],
    }),
  });
  const raw = await res.json();
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${JSON.stringify(raw)}`);
  return raw;
}

async function askPerplexity(text) {
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: perplexityModelId(process.env),
      messages: [{ role: 'user', content: text }],
    }),
  });
  const raw = await res.json();
  if (!res.ok) throw new Error(`Perplexity ${res.status}: ${JSON.stringify(raw)}`);
  return raw;
}

const askers = {
  openai: askOpenAI,
  gemini: askGemini,
  perplexity: askPerplexity,
};

for (const model of models) {
  const outDir = join(BASELINE_DIR, model);
  mkdirSync(outDir, { recursive: true });
  const slice = questions.slice(0, limitArg);

  for (const q of slice) {
    const outPath = join(outDir, `${q.id}.json`);
    if (existsSync(outPath)) {
      console.log(`skip ${model}/${q.id} (exists)`);
      continue;
    }
    console.log(`collect ${model}/${q.id}...`);
    try {
      const raw = await askers[model](q.text);
      writeFileSync(
        outPath,
        JSON.stringify(
          {
            question_id: q.id,
            model,
            collected_at: new Date().toISOString(),
            question: q.text,
            raw,
          },
          null,
          2,
        ),
      );
      await sleep(1500);
    } catch (err) {
      console.error(`fail ${model}/${q.id}:`, err.message);
      process.exitCode = 1;
    }
  }
}

updateManifest(models);

function updateManifest(collectedModels) {
  const manifestPath = join(BASELINE_DIR, 'manifest.json');
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const existing = new Set(manifest.models_collected || []);
    for (const m of collectedModels) existing.add(m);
    manifest.models_collected = [...existing];
    manifest.status =
      manifest.models_collected.length >= (manifest.gates?.minimum_models ?? 2)
        ? 'collected'
        : 'partial';
    manifest.last_collected_at = new Date().toISOString();
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  } catch (err) {
    console.warn('manifest update skipped:', err.message);
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

console.log('Done.');
