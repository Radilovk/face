import { loadEdgeConfig } from '../config/tenantEdge.js';

/**
 * One Worker serves N customer domains — each has its own HTML origin.
 * Host header → tenant → origin_url (KV edge config or https://apex).
 */
export async function resolveTenantOrigin(env, hostname, tenantConfig) {
  const host = String(hostname ?? '').toLowerCase().replace(/^www\./, '');
  const edgeConfig = await loadEdgeConfig(env, host);
  const fromKv = edgeConfig?.edge?.origin_url;
  if (fromKv) return fromKv;

  const apex = tenantConfig?.apexHost ?? host;
  return `https://${apex}`;
}

export async function fetchTenantOrigin(request, env, tenantConfig) {
  const origin = await resolveTenantOrigin(env, new URL(request.url).hostname, tenantConfig);
  const incoming = new URL(request.url);
  const base = new URL(origin);
  const target = new URL(incoming.pathname + incoming.search, base.origin);

  return fetch(target.toString(), {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: 'follow',
  });
}
