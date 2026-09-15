import { handleRobotsRequest } from './robots.js';
import { handleLlmsRequest } from './llms.js';
import { buildIndexNowKeyFile } from '../indexing/indexNow.js';
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

  if (edgeConfig?.edge?.enabled && (url.pathname === '/llms.txt' || url.pathname === '/llms-full.txt')) {
    const mode = edgeConfig.edge.llms_mode ?? 'serve';
    if (mode !== 'passthrough') {
      return handleLlmsRequest(request, edgeConfig, (req) => fetchOrigin(req, edgeConfig));
    }
  }

  if (edgeConfig?.indexnow_key) {
    const keyPath = `/${edgeConfig.indexnow_key}.txt`;
    if (url.pathname === keyPath) {
      return new Response(buildIndexNowKeyFile(edgeConfig.indexnow_key), {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=86400',
          'X-AIV-IndexNow-Key': 'edge',
        },
      });
    }
  }

  const originRes = await fetchOrigin(request, edgeConfig);
  return injectHtmlEnhancements(originRes, edgeConfig, url);
}
