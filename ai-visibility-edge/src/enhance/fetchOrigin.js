/**
 * Fetch origin — fail-open passthrough to real hosting.
 */
export async function fetchOrigin(request, edgeConfig) {
  const originUrl = edgeConfig?.edge?.origin_url;

  if (originUrl) {
    try {
      const incoming = new URL(request.url);
      const base = new URL(originUrl);
      const target = new URL(incoming.pathname + incoming.search, base.origin);
      return fetch(target.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: 'follow',
      });
    } catch {
      /* fall through */
    }
  }

  return fetch(request);
}
