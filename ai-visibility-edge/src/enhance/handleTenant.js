import { getTenantEdgeConfig } from '../config/tenantEdge.js';
import { handleRobotsRequest } from './robots.js';

/**
 * Tenant traffic through Worker (after CNAME). Git config drives edge behavior.
 */
export async function handleTenantRequest(request, env, tenantConfig) {
  const url = new URL(request.url);
  const edgeConfig = getTenantEdgeConfig(url.hostname);

  if (edgeConfig?.edge?.enabled && url.pathname === '/robots.txt') {
    return handleRobotsRequest(request, edgeConfig, (req) => fetchOrigin(req, edgeConfig));
  }

  return fetchOrigin(request, edgeConfig);
}

async function fetchOrigin(request, edgeConfig) {
  const init = {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: 'follow',
  };

  const originHost = edgeConfig?.edge?.origin_host;
  if (originHost) {
    return fetch(request.url, {
      ...init,
      cf: { resolveOverride: originHost },
    });
  }

  return fetch(request, init);
}
