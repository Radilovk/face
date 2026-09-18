#!/usr/bin/env node
/**
 * Apply Cloudflare AEO settings for one or more domains (pilot apply-cloudflare-aeo port).
 *
 * Env: CF_API_TOKEN, optional AIV_WORKER_URL + ADMIN_TOKEN for API path
 *
 * Usage:
 *   node scripts/apply-cloudflare-aeo.mjs daotslabna.com
 *   node scripts/apply-cloudflare-aeo.mjs --worker https://ai-visibility-edge.example.workers.dev daotslabna.com
 */
import { applyCloudflareAeo } from '../src/cloudflare/security.js';
import { findZoneByHostname, cfCredentials } from '../src/cloudflare/api.js';

const args = process.argv.slice(2);
const workerIdx = args.indexOf('--worker');
const workerUrl = workerIdx >= 0 ? args[workerIdx + 1] : process.env.AIV_WORKER_URL;
const domains = args.filter((a, i) => a !== '--worker' && (workerIdx < 0 || i !== workerIdx + 1));

if (!domains.length) {
  console.error('Usage: node scripts/apply-cloudflare-aeo.mjs [--worker URL] domain [domain…]');
  process.exit(1);
}

const env = {
  CF_API_TOKEN: process.env.CF_API_TOKEN ?? process.env.CLOUDFLARE_API_TOKEN,
  CF_ACCOUNT_ID: process.env.CF_ACCOUNT_ID ?? process.env.CLOUDFLARE_ACCOUNT_ID,
};

async function viaApi(domain) {
  const token = process.env.ADMIN_TOKEN;
  if (!workerUrl || !token) throw new Error('Set AIV_WORKER_URL + ADMIN_TOKEN for API path');
  const res = await fetch(`${workerUrl.replace(/\/$/, '')}/api/cloudflare/${encodeURIComponent(domain)}/apply-aeo`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ run_smoke: true }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

async function viaDirect(domain) {
  if (!cfCredentials(env).token) throw new Error('Missing CF_API_TOKEN');
  const zone = await findZoneByHostname(env, domain);
  if (zone.error) throw new Error(zone.error + (zone.hint ? ': ' + zone.hint : ''));
  return applyCloudflareAeo(env, { zoneId: zone.zone.id, domain });
}

async function main() {
  for (const domain of domains) {
    console.log('\n===', domain, '===');
    try {
      const result = workerUrl && process.env.ADMIN_TOKEN ? await viaApi(domain) : await viaDirect(domain);
      console.log(result.message ?? JSON.stringify(result, null, 2));
      if (result.smoke) {
        console.log('Smoke:', result.smoke.level_label, result.smoke.passed + '/' + result.smoke.total);
      }
    } catch (e) {
      console.error('FAIL:', e.message);
      process.exitCode = 1;
    }
  }
}

main();
