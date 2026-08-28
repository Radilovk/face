#!/usr/bin/env node
/**
 * Reprocess baseline runs → observations via remote D1 (no deployed Worker required).
 * Usage: CLOUDFLARE_ACCOUNT_ID=... CLOUDFLARE_API_TOKEN=... npm run baseline:reprocess-d1
 */
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPlatformProxy } from 'wrangler';
import { reprocessRuns } from '../src/citations/reprocess.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN;

if (!accountId || !token) {
  console.warn('skip reprocess-d1: missing CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN');
  process.exit(0);
}

const { env, dispose } = await getPlatformProxy({
  configPath: join(root, 'wrangler.toml'),
  remoteBindings: true,
  persist: false,
});

try {
  if (!env.DB) {
    console.error('reprocess-d1: D1 binding missing');
    process.exit(1);
  }

  const summary = await reprocessRuns(env, { limit: 100 });
  console.log('reprocess-d1 ok:', JSON.stringify(summary));

  if ((summary.processed ?? 0) === 0 && !summary.skipped) {
    console.log('note: no unprocessed runs (may already have observations)');
  }
} finally {
  await dispose();
}
