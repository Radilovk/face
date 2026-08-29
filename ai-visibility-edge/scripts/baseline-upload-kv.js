#!/usr/bin/env node
/**
 * Качва baseline raw JSON в Cloudflare KV (face namespace / KV_NAMESPACE_ID).
 * Env: CF_ACCOUNT_ID, CF_API_TOKEN, KV_NAMESPACE_ID
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASELINE_ID = process.env.BASELINE_ID || '2026-08-27';
const BASELINE_DIR = join(__dirname, '../baseline', BASELINE_ID);

const accountId = process.env.CF_ACCOUNT_ID;
const apiToken = process.env.CF_API_TOKEN;
const namespaceId = process.env.KV_NAMESPACE_ID;

if (!accountId || !apiToken || !namespaceId) {
  console.error('Missing CF_ACCOUNT_ID, CF_API_TOKEN, or KV_NAMESPACE_ID');
  process.exit(1);
}

const models = ['openai', 'gemini', 'perplexity'];
let uploaded = 0;
let failed = 0;

for (const model of models) {
  const dir = join(BASELINE_DIR, model);
  let files;
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  } catch {
    continue;
  }

  for (const file of files) {
    const path = join(dir, file);
    const body = readFileSync(path);
    const key = `aiv/baseline/${BASELINE_ID}/${model}/${file.replace('.json', '')}`;

    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(key)}`;

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body,
    });

    if (res.ok) {
      uploaded++;
      console.log(`kv put ${key} (${body.length} bytes)`);
    } else {
      failed++;
      const err = await res.text();
      console.error(`kv fail ${key}: ${res.status} ${err}`);
    }

    await sleep(200);
  }
}

// Manifest pointer in KV
const manifestPath = join(BASELINE_DIR, 'manifest.json');
try {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.models_collected = models.filter((m) => {
    try {
      return statSync(join(BASELINE_DIR, m)).isDirectory();
    } catch {
      return false;
    }
  });
  manifest.last_kv_upload = new Date().toISOString();
  manifest.kv_namespace_id = namespaceId;

  const manifestKey = `aiv/baseline/${BASELINE_ID}/manifest`;
  await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(manifestKey)}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(manifest, null, 2),
    },
  );
  console.log(`kv put ${manifestKey}`);
} catch (err) {
  console.warn('manifest upload skipped:', err.message);
}

console.log(`Done: ${uploaded} uploaded, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
