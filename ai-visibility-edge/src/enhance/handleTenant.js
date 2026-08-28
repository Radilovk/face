import { handleRobotsRequest } from './robots.js';
import { injectHtmlEnhancements } from './inject.js';
import { fetchOrigin } from './fetchOrigin.js';

/**
 * Tenant traffic through Worker (after CNAME). Edge applies optimization — not CMS.
 */
export async function handleTenantRequest(request, env, edgeConfig) {
  const url = new URL(request.url);

  if (edgeConfig?.edge?.enabled && url.pathname === '/robots.txt') {
    const mode = edgeConfig.edge.robots_mode ?? 'serve';
    if (mode !== 'passthrough') {
      return handleRobotsRequest(request, edgeConfig, (req) => fetchOrigin(req, edgeConfig));
    }
  }

  const originRes = await fetchOrigin(request, edgeConfig);
  return injectHtmlEnhancements(originRes, edgeConfig, url);
}
