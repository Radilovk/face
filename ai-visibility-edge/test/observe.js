import assert from 'node:assert/strict';
import { matchKnownBot } from '../src/observe/botList.js';
import { verifyBotRequest } from '../src/observe/verify.js';
import { scheduleBotLog, fetchBotHitStats } from '../src/observe/botLog.js';
import { createTestDb } from './d1-harness.js';

export function testMatchKnownBot() {
  assert.equal(matchKnownBot('Mozilla/5.0 compatible; GPTBot/1.0')?.id, 'gptbot');
  assert.equal(matchKnownBot('Mozilla/5.0'), null);
  assert.equal(matchKnownBot(''), null);
}

export function testVerifyBotCfVerified() {
  const req = new Request('https://example.com/page', {
    headers: { 'User-Agent': 'GPTBot/1.0' },
  });
  req.cf = { botManagement: { verifiedBot: true }, asn: 99999 };

  const v = verifyBotRequest(req);
  assert.equal(v.bot_id, 'gptbot');
  assert.equal(v.flag, 'v');
  assert.equal(v.verified, true);
}

export function testVerifyBotFakeGptbotFlagU() {
  const req = new Request('https://example.com/page', {
    headers: { 'User-Agent': 'GPTBot/1.0' },
  });
  req.cf = { asn: 64512 };

  const v = verifyBotRequest(req);
  assert.equal(v.flag, 'u');
  assert.equal(v.verified, false);
}

export function testVerifyBotGoogleExtendedAsn() {
  const req = new Request('https://example.com/', {
    headers: { 'User-Agent': 'Google-Extended' },
  });
  req.cf = { asn: 15169 };

  const v = verifyBotRequest(req);
  assert.equal(v.bot_id, 'google-extended');
  assert.equal(v.flag, 'v');
}

export async function testScheduleBotLogNoQueryString() {
  const db = createTestDb();
  db.exec(`
    INSERT INTO tenants (id, name, apex_host) VALUES ('t1', 'Test', 'example.com');
    INSERT INTO tenant_hosts (hostname, tenant_id) VALUES ('example.com', 't1');
  `);

  let inserted = null;
  const env = {
    DB: {
      prepare(sql) {
        return {
          bind(...args) {
            inserted = { sql, args };
            return { run: async () => ({ success: true }) };
          },
        };
      },
    },
  };

  const waits = [];
  const ctx = { waitUntil: (p) => waits.push(p) };

  scheduleBotLog(
    new Request('https://example.com/products?id=secret', {
      headers: { 'User-Agent': 'GPTBot/1.0' },
    }),
    env,
    ctx,
    { tenantId: 't1' },
  );

  assert.equal(waits.length, 1);
  await waits[0];
  assert(inserted);
  assert.equal(inserted.args[3], '/products');
  assert(!String(inserted.args[3]).includes('?'));
}

export async function testFetchBotHitStats() {
  const db = createTestDb();
  db.exec(`
    INSERT INTO tenants (id, name, apex_host) VALUES ('t1', 'Test', 'example.com');
    INSERT INTO bot_hits (id, tenant_id, bot_id, path, verified, verify_flag, hit_at)
    VALUES ('h1', 't1', 'gptbot', '/', 1, 'v', datetime('now'));
    INSERT INTO bot_hits (id, tenant_id, bot_id, path, verified, verify_flag, hit_at)
    VALUES ('h2', 't1', 'gptbot', '/about', 0, 'u', datetime('now'));
  `);

  const stats = await fetchBotHitStats(db, 't1');
  assert.equal(stats.verified_hits, 1);
  assert.equal(stats.unverified_hits, 1);
  assert.equal(stats.by_bot.length, 2);
}
