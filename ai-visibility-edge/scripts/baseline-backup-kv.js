#!/usr/bin/env node
/**
 * Fetch previous baseline snapshot from KV before a new weekly collect (audit C1).
 * Reads aiv/baseline/latest and saves manifest (+ optional model files) under baseline-backups/.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const accountId = process.env.CF_ACCOUNT_ID;
const apiToken = process.env.CF_API_TOKEN;
const namespaceId = process.env.KV_NAMESPACE_ID;
const skipModels = process.argv.includes('--manifest-only');

if (!accountId || !apiToken || !namespaceId) {
  console.log('skip backup: missing CF_ACCOUNT_ID / CF_API_TOKEN / KV_NAMESPACE_ID');
  process.exit(0);
}

const latestId = await kvGetText('aiv/baseline/latest');
if (!latestId) {
  console.log('skip backup: no aiv/baseline/latest in KV');
  process.exit(0);
}

const currentId = process.env.BASELINE_ID;
if (currentId && latestId === currentId) {
  console.log(`skip backup: latest already ${latestId}`);
  process.exit(0);
}

const outRoot = join(ROOT, 'baseline-backups', latestId);
mkdirSync(outRoot, { recursive: true });

const manifest = await kvGetJson(`aiv/baseline/${latestId}/manifest`);
if (manifest) {
  writeFileSync(join(outRoot, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`backed up manifest for ${latestId}`);
}

if (!skipModels && manifest?.models_collected?.length) {
  for (const model of manifest.models_collected) {
    const dir = join(outRoot, model);
    mkdirSync(dir, { recursive: true });
    const questions = manifest.question_count ?? 20;
    for (let i = 1; i <= questions; i++) {
      const qid = `q${String(i).padStart(3, '0')}`;
      const data = await kvGetJson(`aiv/baseline/${latestId}/${model}/${qid}`);
      if (data) {
        writeFileSync(join(dir, `${qid}.json`), JSON.stringify(data, null, 2) + '\n');
      }
    }
  }
}

console.log(`backup complete: ${latestId} → baseline-backups/${latestId}`);

async function kvGetText(key) {
  const url = kvUrl(key);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${apiToken}` } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${key}: ${res.status}`);
  return res.text();
}

async function kvGetJson(key) {
  const url = kvUrl(key);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${apiToken}` } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${key}: ${res.status}`);
  return res.json();
}

function kvUrl(key) {
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(key)}`;
}
