import assert from 'node:assert/strict';
import { createTestDb } from './d1-harness.js';
import { registerSite, updateSite, fetchSite } from '../src/api/sites.js';
import { updateQuestion, deleteQuestion } from '../src/api/questions.js';
import { isProduction, productionConfigIssues } from '../src/config/production.js';
import { resolveTenantSettings, tenantEligibleForCron } from '../src/config/tenantSettings.js';
import { cloudflareConfigured } from '../src/cloudflare/api.js';
import { requireAdmin } from '../src/middleware/requireAdmin.js';
import { parsePlatformHosts, isPlatformHost } from '../src/config/platform.js';

export function testProductionAuthFailClosed() {
  const env = { ENVIRONMENT: 'production' };
  assert(isProduction(env));
  const issues = productionConfigIssues(env);
  assert(issues.includes('ADMIN_TOKEN'));

  const denied = requireAdmin(new Request('http://x/api/sites', { method: 'POST' }), env);
  assert.equal(denied.status, 503);
}

export async function testTenantSettingsAndCronEligibility() {
  const db = createTestDb();
  const reg = await registerSite(db, {
    domain: 'shop.example.com',
    name: 'Shop',
    vertical_name: 'Retail',
    data_consent: true,
    locale: 'en',
    market_country: 'US',
  });
  assert(reg.ok);

  const settings = resolveTenantSettings(
    { locale: 'en', market_country: 'US', data_consent: 1, cron_enabled: 1, status: 'active' },
    { AUTO_OPTIMIZER: '1' },
  );
  assert.equal(settings.locale, 'en');
  assert.equal(settings.auto_optimizer, true);
  assert(tenantEligibleForCron({ status: 'active', data_consent: 1, cron_enabled: 1 }));
  assert(!tenantEligibleForCron({ status: 'active', data_consent: 0, cron_enabled: 1 }));
}

export async function testSiteUpdateAndQuestionTenantScope() {
  const db = createTestDb();
  await registerSite(db, {
    domain: 'a.com',
    name: 'A',
    vertical_name: 'SaaS',
    data_consent: 1,
  });
  await registerSite(db, {
    domain: 'b.com',
    name: 'B',
    vertical_name: 'SaaS',
    data_consent: 1,
  });

  const siteA = await fetchSite(db, 'a.com');
  assert(siteA.site);

  const upd = await updateSite(db, 'a.com', { status: 'active', cron_enabled: false });
  assert(upd.ok);

  await db
    .prepare(
      `INSERT INTO questions (id, vertical_id, tenant_id, text, qtype, source)
       VALUES ('q-a1', ?, ?, 'test', 'brand', 'manual')`,
    )
    .bind(siteA.site.vertical_id, siteA.site.id)
    .run();

  const tenantB = await db.prepare(`SELECT id FROM tenants WHERE apex_host = 'b.com'`).first();
  const forbidden = await updateQuestion(db, 'q-a1', { text: 'hack' }, { tenantId: tenantB.id });
  assert.equal(forbidden.error, 'forbidden');

  const ok = await updateQuestion(db, 'q-a1', { text: 'ok' }, { tenantId: siteA.site.id });
  assert.equal(ok.updated, true);
}

export function testPlatformHostsEnv() {
  const hosts = parsePlatformHosts({ PLATFORM_HOSTS: 'app.example.com, dashboard.test' });
  assert(hosts.has('app.example.com'));
  assert(isPlatformHost('app.example.com', { PLATFORM_HOSTS: 'app.example.com' }));
}

export function testCloudflareConfigured() {
  assert(!cloudflareConfigured({}));
  assert(cloudflareConfigured({ CF_API_TOKEN: 'x', SAAS_ZONE_ID: 'zone' }));
}

export async function testResolveTenantOriginFallback() {
  const { resolveTenantOrigin } = await import('../src/enhance/tenantOrigin.js');
  const origin = await resolveTenantOrigin({}, 'shop.example.com', { apexHost: 'shop.example.com' });
  assert.equal(origin, 'https://shop.example.com');
}
