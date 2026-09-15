/** Minimal Cloudflare API v4 client for Custom Hostnames (Cloudflare for SaaS). */

function cfCredentials(env) {
  const token = env.CF_API_TOKEN ?? env.CLOUDFLARE_API_TOKEN;
  const accountId = env.CF_ACCOUNT_ID ?? env.CLOUDFLARE_ACCOUNT_ID;
  const zoneId = env.SAAS_ZONE_ID ?? env.CF_SAAS_ZONE_ID;
  return { token, accountId, zoneId };
}

export function cloudflareConfigured(env) {
  const { token, zoneId } = cfCredentials(env);
  return Boolean(token && zoneId);
}

async function cfRequest(env, path, { method = 'GET', body } = {}) {
  const { token } = cfCredentials(env);
  if (!token) return { error: 'cf_token_missing' };

  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    return {
      error: 'cloudflare_api_error',
      status: res.status,
      messages: data.errors ?? data.messages ?? [],
    };
  }
  return { ok: true, result: data.result };
}

/** Create or fetch Custom Hostname for tenant apex. */
export async function provisionCustomHostname(env, hostname) {
  const { zoneId } = cfCredentials(env);
  if (!zoneId) return { error: 'saas_zone_missing', hint: 'Set SAAS_ZONE_ID Worker secret' };

  const host = String(hostname).toLowerCase().replace(/^www\./, '');

  const existing = await cfRequest(
    env,
    `/zones/${zoneId}/custom_hostnames?hostname=${encodeURIComponent(host)}`,
  );
  if (existing.error) return existing;
  const found = Array.isArray(existing.result) ? existing.result[0] : null;
  if (found) {
    return { ok: true, hostname: host, cf_hostname_id: found.id, status: found.status, ssl: found.ssl };
  }

  const created = await cfRequest(env, `/zones/${zoneId}/custom_hostnames`, {
    method: 'POST',
    body: {
      hostname: host,
      ssl: { method: 'http', type: 'dv', settings: { min_tls_version: '1.2' } },
    },
  });
  if (created.error) return created;

  return {
    ok: true,
    hostname: host,
    cf_hostname_id: created.result.id,
    status: created.result.status,
    ssl: created.result.ssl,
    created: true,
  };
}

export async function getCustomHostnameStatus(env, cfHostnameId) {
  const { zoneId } = cfCredentials(env);
  if (!zoneId || !cfHostnameId) return { error: 'missing_id_or_zone' };

  const res = await cfRequest(env, `/zones/${zoneId}/custom_hostnames/${cfHostnameId}`);
  if (res.error) return res;

  const ssl = res.result.ssl ?? {};
  return {
    ok: true,
    hostname: res.result.hostname,
    status: res.result.status,
    ssl_status: ssl.status,
    validation_records: ssl.validation_records ?? [],
    active: ssl.status === 'active' || res.result.status === 'active',
  };
}
