#!/usr/bin/env node
/**
 * Cloudflare platform setup — verify token, discover zone/worker, provision Custom Hostnames.
 *
 * Requires env:
 *   CF_API_TOKEN or CLOUDFLARE_API_TOKEN (Account API token, full or scoped)
 *   CF_ACCOUNT_ID or CLOUDFLARE_ACCOUNT_ID (optional — discovered from verify)
 *   SAAS_ZONE_ID (optional — auto-pick first active zone if unset)
 *
 * Usage:
 *   node scripts/cf-platform-setup.mjs verify
 *   node scripts/cf-platform-setup.mjs provision daotslabna.com life-protocols.com biocode-bg.com
 *   node scripts/cf-platform-setup.mjs deploy-secrets   # needs wrangler + same token env
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');

const token = process.env.CF_API_TOKEN ?? process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CF_ACCOUNT_ID ?? process.env.CLOUDFLARE_ACCOUNT_ID;
const saasZoneId = process.env.SAAS_ZONE_ID ?? process.env.CF_SAAS_ZONE_ID;

async function cf(path, { method = 'GET', body } = {}) {
  if (!token) throw new Error('Missing CF_API_TOKEN / CLOUDFLARE_API_TOKEN');
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    const msg = (data.errors ?? []).map((e) => e.message).join('; ') || res.statusText;
    throw new Error(`Cloudflare API ${path}: ${msg}`);
  }
  return data.result;
}

async function cmdVerify() {
  const verify = await cf('/user/tokens/verify');
  console.log('Token valid:', verify.status === 'active' ? 'yes' : verify.status);
  if (verify.expires_on) console.log('Expires:', verify.expires_on);

  let acct = accountId;
  if (!acct) {
    const accounts = await cf('/accounts?per_page=50');
    acct = accounts[0]?.id;
    console.log('Accounts:', accounts.map((a) => `${a.name} (${a.id})`).join(', ') || 'none');
  }
  if (acct) console.log('Using account_id:', acct);

  const zones = await cf('/zones?per_page=50&status=active');
  console.log('\nActive zones (pick SAAS_ZONE_ID for Custom Hostnames):');
  for (const z of zones) {
    console.log(`  ${z.name}  zone_id=${z.id}  plan=${z.plan?.name ?? '?'}`);
  }

  if (acct) {
    const workers = await cf(`/accounts/${acct}/workers/scripts`);
    const names = (workers ?? []).map((w) => w.id ?? w).filter(Boolean);
    console.log('\nWorkers:', names.length ? names.join(', ') : '(list via dashboard if empty)');
  }

  const suggestedZone = saasZoneId ?? zones[0]?.id;
  if (suggestedZone) {
    console.log('\nSuggested SAAS_ZONE_ID:', suggestedZone);
    const hostnames = await cf(`/zones/${suggestedZone}/custom_hostnames?per_page=20`);
    console.log('Existing Custom Hostnames:', hostnames.length);
    for (const h of hostnames.slice(0, 10)) {
      console.log(`  ${h.hostname}  status=${h.status}  ssl=${h.ssl?.status ?? '?'}`);
    }
  }

  console.log('\nNext: export SAAS_ZONE_ID=... then:');
  console.log('  node scripts/cf-platform-setup.mjs provision daotslabna.com ...');
}

async function provisionHostname(zoneId, hostname) {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  const existing = await cf(
    `/zones/${zoneId}/custom_hostnames?hostname=${encodeURIComponent(host)}`,
  );
  if (existing?.[0]) {
    console.log(`  ✓ ${host} exists (${existing[0].status}, ssl=${existing[0].ssl?.status})`);
    return existing[0];
  }
  const created = await cf(`/zones/${zoneId}/custom_hostnames`, {
    method: 'POST',
    body: {
      hostname: host,
      ssl: { method: 'http', type: 'dv', settings: { min_tls_version: '1.2' } },
    },
  });
  console.log(`  + ${host} created (${created.status})`);
  return created;
}

async function cmdProvision(hosts) {
  const zones = await cf('/zones?per_page=50&status=active');
  const zoneId = saasZoneId ?? zones[0]?.id;
  if (!zoneId) throw new Error('No zone found — set SAAS_ZONE_ID');

  console.log('Zone:', zoneId);
  console.log('Provisioning Custom Hostnames…');
  for (const h of hosts) {
    await provisionHostname(zoneId, h);
  }
  console.log('\nClient must CNAME each domain → WORKER_PUBLIC_HOST (see dashboard onboarding).');
}

function cmdDeploySecrets() {
  if (!token) throw new Error('Missing CF_API_TOKEN');
  const env = { ...process.env, CLOUDFLARE_API_TOKEN: token };
  if (accountId) env.CLOUDFLARE_ACCOUNT_ID = accountId;

  const toml = readFileSync(join(ROOT, 'wrangler.toml'), 'utf8');
  const kvMatch = toml.match(/id = "([a-f0-9-]{36})"/);
  const d1Match = toml.match(/database_id = "([a-f0-9-]{36})"/);

  console.log('Running wrangler deploy (local CLI uses CF_API_TOKEN env)…');
  const deploy = spawnSync('npx', ['wrangler', 'deploy'], {
    cwd: ROOT,
    env,
    stdio: 'inherit',
  });
  if (deploy.status !== 0) process.exit(deploy.status ?? 1);

  const secrets = ['CF_API_TOKEN', 'CF_ACCOUNT_ID', 'SAAS_ZONE_ID'].filter(
    (k) => process.env[k],
  );
  for (const name of secrets) {
    spawnSync('npx', ['wrangler', 'secret', 'put', name], {
      cwd: ROOT,
      env,
      input: process.env[name],
      stdio: ['pipe', 'inherit', 'inherit'],
    });
  }
  console.log('Worker secrets updated:', secrets.join(', '));
  if (kvMatch) console.log('KV id in toml:', kvMatch[1]);
  if (d1Match) console.log('D1 id in toml:', d1Match[1]);
}

const [command, ...args] = process.argv.slice(2);

try {
  if (command === 'verify') await cmdVerify();
  else if (command === 'provision') await cmdProvision(args.length ? args : ['daotslabna.com', 'life-protocols.com', 'biocode-bg.com']);
  else if (command === 'deploy-secrets') cmdDeploySecrets();
  else {
    console.log(`Usage:
  node scripts/cf-platform-setup.mjs verify
  node scripts/cf-platform-setup.mjs provision [domain ...]
  node scripts/cf-platform-setup.mjs deploy-secrets`);
    process.exit(1);
  }
} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
}
