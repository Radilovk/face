/**
 * HTMLRewriter — JSON-LD + canonical (Block 4.1). Same HTML for all visitors.
 */
export async function injectHtmlEnhancements(response, edgeConfig, requestUrl) {
  const edge = edgeConfig?.edge ?? {};
  if (!edge.enabled) return response;

  const ct = response.headers.get('content-type') ?? '';
  if (!ct.includes('text/html')) return response;

  const injectJsonLd = edge.inject_jsonld && edgeConfig.jsonld;
  const injectCanonical = edge.inject_canonical && requestUrl;

  if (!injectJsonLd && !injectCanonical) {
    return withEdgeHeader(response);
  }

  const script = injectJsonLd
    ? `<script type="application/ld+json">${JSON.stringify(edgeConfig.jsonld)}</script>`
    : '';
  const canonical = injectCanonical
    ? `<link rel="canonical" href="${edgeConfig.edge?.canonical_url ?? requestUrl.origin + requestUrl.pathname}">`
    : '';

  const rewriter = new HTMLRewriter().on('head', {
    element(el) {
      if (script) el.append(script, { html: true });
      if (canonical) el.append(canonical, { html: true });
    },
  });

  return withEdgeHeader(rewriter.transform(response));
}

function withEdgeHeader(response) {
  const headers = new Headers(response.headers);
  headers.set('X-AIV-Edge', '1');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
