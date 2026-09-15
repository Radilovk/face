import { resolveTenantByDomain } from './questions.js';
import { resolveWorkerPublicHost } from '../config/workerHost.js';
import {
  cloudflareConfigured,
  getCustomHostnameStatus,
  provisionCustomHostname,
} from '../cloudflare/api.js';

/**
 * Provision Cloudflare Custom Hostname for tenant (Cloudflare for SaaS).
 * Requires CF_API_TOKEN + SAAS_ZONE_ID on Worker.
 */
export async function provisionTenantHostname(env, domain) {
  if (!env.DB) return { error: 'db_not_bound' };
  if (!cloudflareConfigured(env)) {
    return {
      error: 'cloudflare_not_configured',
      hint: 'Задайте CF_API_TOKEN и SAAS_ZONE_ID в Worker secrets.',
      manual_dns: manualDnsHint(env, domain),
    };
  }

  const tenant = await resolveTenantByDomain(env.DB, domain);
  if (!tenant) return { error: 'unknown_domain', domain };

  const cf = await provisionCustomHostname(env, tenant.apex_host);
  if (cf.error) return { ...cf, domain: tenant.apex_host };

  if (cf.cf_hostname_id) {
    await env.DB.prepare(`UPDATE tenants SET cf_hostname_id = ?, edge_status = ? WHERE id = ?`)
      .bind(cf.cf_hostname_id, cf.active ? 'active' : 'pending_cname', tenant.id)
      .run();
  }

  const workerHost = resolveWorkerPublicHost(env);
  return {
    ok: true,
    domain: tenant.apex_host,
    cf_hostname_id: cf.cf_hostname_id,
    status: cf.status,
    ssl: cf.ssl,
    created: Boolean(cf.created),
    worker_host: workerHost,
    dns: workerHost
      ? { type: 'CNAME', name: tenant.apex_host, target: workerHost }
      : null,
    message: cf.created
      ? 'Custom Hostname създаден в Cloudflare — добавете CNAME при DNS.'
      : 'Custom Hostname вече съществува — проверете SSL статуса.',
  };
}

export async function fetchTenantHostnameStatus(env, domain) {
  if (!env.DB) return { error: 'db_not_bound' };

  const tenant = await resolveTenantByDomain(env.DB, domain);
  if (!tenant) return { error: 'unknown_domain', domain };

  if (!tenant.cf_hostname_id) {
    return {
      domain: tenant.apex_host,
      provisioned: false,
      hint: 'POST /api/hostnames/{domain}/provision за автоматично създаване.',
      manual_dns: manualDnsHint(env, tenant.apex_host),
    };
  }

  if (!cloudflareConfigured(env)) {
    return {
      domain: tenant.apex_host,
      cf_hostname_id: tenant.cf_hostname_id,
      provisioned: true,
      cloudflare_api: false,
      edge_status: tenant.edge_status,
    };
  }

  const status = await getCustomHostnameStatus(env, tenant.cf_hostname_id);
  if (status.error) return { ...status, domain: tenant.apex_host };

  if (status.active && tenant.edge_status !== 'active') {
    await env.DB.prepare(`UPDATE tenants SET edge_status = ?, status = 'active' WHERE id = ?`)
      .bind('active', tenant.id)
      .run();
  }

  return {
    domain: tenant.apex_host,
    provisioned: true,
    cf_hostname_id: tenant.cf_hostname_id,
    ssl_status: status.ssl_status,
    active: status.active,
    validation_records: status.validation_records,
    edge_status: status.active ? 'active' : tenant.edge_status,
  };
}

function manualDnsHint(env, domain) {
  const workerHost = resolveWorkerPublicHost(env);
  if (!workerHost) return null;
  return { type: 'CNAME', name: domain, target: workerHost };
}
