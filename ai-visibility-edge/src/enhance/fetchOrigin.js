/**
 * Fetch tenant origin via Service Binding (preferred) or legacy HTTP resolve.
 */

const ORIGIN_TIMEOUT_MS = 25_000;
const INTERNAL_ORIGIN = 'https://aiv-internal.local';

export async function fetchOrigin(request, edgeConfig, env = {}) {
  const url = new URL(request.url);
  const origin = resolveOriginConfig(edgeConfig);

  if (!origin) {
    return originNotConfiguredResponse(url.hostname);
  }

  try {
    if (origin.type === 'service') {
      return await fetchServiceOrigin(request, origin, env);
    }
    if (origin.type === 'worker') {
      return await fetchWorkerOrigin(request, origin);
    }
    return await fetchResolveOrigin(request, origin);
  } catch (err) {
    return originFetchErrorResponse(url.hostname, origin.label, err);
  }
}

/**
 * @returns {object | null}
 */
export function resolveOriginConfig(edgeConfig) {
  const edge = edgeConfig?.edge ?? {};
  const nested = edge.origin ?? {};

  if (nested.type === 'service' && nested.binding) {
    return {
      type: 'service',
      binding: nested.binding,
      host: nested.host_header ?? edge.origin_host_header ?? edgeConfig.domain,
      forwardHeader: nested.forward_header ?? 'X-Forwarded-Host',
      label: `service:${nested.binding}`,
    };
  }

  if (nested.type === 'worker' && nested.url) {
    return {
      type: 'worker',
      url: nested.url,
      host: nested.host_header ?? edge.origin_host_header ?? edgeConfig.domain,
      forwardHeader: nested.forward_header ?? 'X-Forwarded-Host',
      label: nested.url,
    };
  }

  if (edge.origin_type === 'worker' && edge.origin_worker_url) {
    return {
      type: 'worker',
      url: edge.origin_worker_url,
      host: edge.origin_host_header ?? edgeConfig.domain,
      forwardHeader: 'X-Forwarded-Host',
      label: edge.origin_worker_url,
    };
  }

  const resolveHost = nested.resolve_host ?? edge.origin_host;
  if (resolveHost) {
    return {
      type: 'resolve',
      resolveHost,
      host: nested.host_header ?? edge.origin_host_header ?? edgeConfig.domain,
      label: resolveHost,
    };
  }

  return null;
}

async function fetchServiceOrigin(request, origin, env) {
  const service = env[origin.binding];
  if (!service?.fetch) {
    throw new Error(`Service binding "${origin.binding}" is not configured in wrangler.toml`);
  }

  const publicUrl = new URL(request.url);
  const internalRequest = buildInternalOriginRequest(request, publicUrl, origin);

  return service.fetch(internalRequest);
}

async function fetchWorkerOrigin(request, origin) {
  const publicUrl = new URL(request.url);
  const base = new URL(origin.url);
  const targetUrl = new URL(publicUrl.pathname + publicUrl.search, base);

  const internalRequest = buildInternalOriginRequest(request, publicUrl, origin, targetUrl.toString());

  return fetch(internalRequest, {
    redirect: 'follow',
    signal: AbortSignal.timeout(ORIGIN_TIMEOUT_MS),
  });
}

async function fetchResolveOrigin(request, origin) {
  const headers = new Headers(request.headers);
  headers.set('Host', origin.host);
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';

  return fetch(request.url, {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
    redirect: 'follow',
    cf: { resolveOverride: origin.resolveHost },
    signal: AbortSignal.timeout(ORIGIN_TIMEOUT_MS),
  });
}

/**
 * Never set Host to the public tenant domain on outbound fetch — Cloudflare loops to edge.
 * Pass tenant hostname via X-Forwarded-Host / X-AIV-Host for port routing.
 */
export function buildInternalOriginRequest(request, publicUrl, origin, targetUrl = null) {
  const path = publicUrl.pathname + publicUrl.search;
  const url = targetUrl ?? `${INTERNAL_ORIGIN}${path}`;

  const headers = new Headers(request.headers);
  headers.delete('Host');
  headers.set(origin.forwardHeader ?? 'X-Forwarded-Host', origin.host);
  headers.set('X-AIV-Host', origin.host);
  headers.set('X-Forwarded-Proto', publicUrl.protocol.replace(':', ''));
  headers.set('X-AIV-Internal', '1');

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';

  return new Request(url, {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
    redirect: 'manual',
  });
}

function originNotConfiguredResponse(hostname) {
  const body = `<!DOCTYPE html>
<html lang="bg"><head><meta charset="utf-8"><title>Origin не е конфигуриран</title></head>
<body style="font-family:system-ui;max-width:720px;margin:2rem auto;padding:0 1rem">
<h1>AI Visibility Edge — origin липсва</h1>
<p><strong>${hostname}</strong> — конфигурирайте Service Binding към <code>port</code> в wrangler.toml.</p>
<pre style="background:#1a2332;padding:1rem;border-radius:8px">[[services]]
binding = "PORT"
service = "port"</pre>
</body></html>`;

  return new Response(body, {
    status: 503,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-AIV-Error': 'origin_not_configured',
    },
  });
}

function originFetchErrorResponse(hostname, originLabel, err) {
  const body = `Origin fetch failed for ${hostname} via ${originLabel}: ${err?.message ?? err}`;
  return new Response(body, {
    status: 502,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-AIV-Error': 'origin_fetch_failed',
    },
  });
}
