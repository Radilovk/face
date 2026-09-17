import { discoveryLinkHeaderValue } from './agentNative.js';

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
    return withEdgeHeader(response, edgeConfig, requestUrl);
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

  const transformed = rewriter.transform(response);
  const headers = new Headers(transformed.headers);
  headers.set('X-AIV-Edge', '1');
  if (edgeConfig?.edge?.agent_native && requestUrl) {
    const origin = edgeConfig.edge?.origin_url ?? requestUrl.origin;
    headers.set('Link', discoveryLinkHeaderValue(origin));
  }
  return new Response(transformed.body, {
    status: transformed.status,
    statusText: transformed.statusText,
    headers,
  });
}

function withEdgeHeader(response, edgeConfig, requestUrl) {
  const headers = new Headers(response.headers);
  headers.set('X-AIV-Edge', '1');
  if (edgeConfig?.edge?.agent_native && requestUrl) {
    const origin = edgeConfig.edge?.origin_url ?? requestUrl.origin;
    headers.set('Link', discoveryLinkHeaderValue(origin));
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
