#!/usr/bin/env node
/** Изтегля baseline от KV → baseline/2026-08-27/{model}/ */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASELINE_ID = process.env.BASELINE_ID || '2026-08-27';
const OUT_DIR = join(__dirname, '../baseline', BASELINE_ID);

const accountId = process.env.CF_ACCOUNT_ID;
const apiToken = process.env.CF_API_TOKEN;
const namespaceId = process.env.KV_NAMESPACE_ID;

if (!accountId || !apiToken || !namespaceId) {
  console.error('Need CF_ACCOUNT_ID, CF_API_TOKEN, KV_NAMESPACE_ID');
  process.exit(1);
}

const manifestKey = `aiv/baseline/${BASELINE_ID}/manifest`;
const manifest = await kvGet(manifestKey);
if (manifest) {
  writeFileSync(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log('manifest ok');
}

const questions = JSON.parse(
  readFileSync(join(OUT_DIR, 'questions.json'), 'utf8'),
).questions;

for (const model of ['openai', 'gemini']) {
  mkdirSync(join(OUT_DIR, model), { recursive: true });
  for (const q of questions) {
    const key = `aiv/baseline/${BASELINE_ID}/${model}/${q.id}`;
    const data = await kvGet(key);
    if (data) {
      writeFileSync(join(OUT_DIR, model, `${q.id}.json`), JSON.stringify(data, null, 2) + '\n');
      console.log(`fetched ${model}/${q.id}`);
    }
  }
}

async function kvGet(key) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiToken}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${key}: ${res.status}`);
  return res.json();
}
