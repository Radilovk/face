/**
 * Serve or merge robots.txt from git tenant config (Block 4.3).
 * No CMS edits — change config/tenants/{domain}.json + aiv-deploy.
 */

export function renderRobotsTxt(edgeConfig) {
  if (!edgeConfig?.robots_txt) return null;
  return edgeConfig.robots_txt.trim() + '\n';
}

export function robotsResponse(body, { source = 'edge' } = {}) {
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'X-AIV-Robots-Source': source,
    },
  });
}

/**
 * @param {Request} request
 * @param {object} edgeConfig from config/tenants/*.json
 * @param {typeof fetch} fetchImpl
 */
export async function handleRobotsRequest(request, edgeConfig, fetchImpl = fetch) {
  const mode = edgeConfig?.edge?.robots_mode ?? 'serve';

  if (mode === 'passthrough') {
    return fetchImpl(request);
  }

  const managed = renderRobotsTxt(edgeConfig);
  if (!managed) {
    return fetchImpl(request);
  }

  if (mode === 'merge') {
    try {
      const originRes = await fetchImpl(request);
      if (originRes.ok) {
        const originText = await originRes.text();
        const merged = mergeRobots(originText, managed);
        return robotsResponse(merged, { source: 'edge-merge' });
      }
    } catch {
      /* fall through to serve */
    }
  }

  return robotsResponse(managed, { source: 'edge-config' });
}

function mergeRobots(originText, managedText) {
  const marker = '# Managed by AI Visibility Edge';
  if (originText.includes(marker)) {
    return originText.trim() + '\n';
  }
  return originText.trim() + '\n\n' + managedText;
}
