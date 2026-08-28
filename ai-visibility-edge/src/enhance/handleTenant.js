import { getTenantEdgeConfig } from '../config/tenantEdge.js';
import { handleRobotsRequest } from './robots.js';
import { fetchOrigin } from './fetchOrigin.js';

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
