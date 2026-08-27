#!/usr/bin/env node
/**
 * Събира baseline raw отговори за questions.json
 * Usage: npm run baseline:collect [-- --model openai|gemini|all]
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASELINE_DIR = join(__dirname, '../baseline/2026-08-27');
const questions = JSON.parse(readFileSync(join(BASELINE_DIR, 'questions.json'), 'utf8')).questions;

const args = process.argv.slice(2);
const modelArg = args.includes('--model') ? args[args.indexOf('--model') + 1] : 'all';
const limitArg = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : questions.length;

const models =
  modelArg === 'all'
    ? ['openai', 'gemini'].filter((m) => (m === 'openai' ? process.env.OPENAI_API_KEY : process.env.GEMINI_API_KEY))
    : [modelArg];

if (models.length === 0) {
  console.error('No API keys. Set OPENAI_API_KEY and/or GEMINI_API_KEY');
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
      model: 'gpt-4.1-mini',
      tools: [{ type: 'web_search_preview' }],
      input: text,
    }),
  });
  const raw = await res.json();
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${JSON.stringify(raw)}`);
  return raw;
}

async function askGemini(text) {
  const key = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }],
      tools: [{ google_search: {} }],
    }),
  });
  const raw = await res.json();
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${JSON.stringify(raw)}`);
  return raw;
}

const askers = {
  openai: askOpenAI,
  gemini: askGemini,
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
    }
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

console.log('Done. Update manifest.json models_collected manually or via import script.');
