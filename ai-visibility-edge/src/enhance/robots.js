/**
 * Serve robots.txt from edge config (Block 4.3).
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

export async function handleRobotsRequest(request, edgeConfig, fetchOrigin) {
  const mode = edgeConfig?.edge?.robots_mode ?? 'serve';
  if (mode === 'passthrough') return fetchOrigin(request);

  const managed = renderRobotsTxt(edgeConfig);
  if (!managed) return fetchOrigin(request);

  if (mode === 'merge') {
    try {
      const originRes = await fetchOrigin(request);
      if (originRes.ok) {
        const originText = await originRes.text();
        const merged = mergeRobots(originText, managed);
        return robotsResponse(merged, { source: 'edge-merge' });
      }
    } catch {
      /* fall through */
    }
  }

  return robotsResponse(managed, { source: 'edge-config' });
}

function mergeRobots(originText, managedText) {
  const marker = '# Managed by AI Visibility Edge';
  if (originText.includes(marker)) return originText.trim() + '\n';
  return originText.trim() + '\n\n' + managedText;
}
