/**
 * Fetch tenant origin — serverless (Worker URL) or classic (resolveOverride).
 */

const ORIGIN_TIMEOUT_MS = 25_000;

export async function fetchOrigin(request, edgeConfig) {
  const url = new URL(request.url);
  const origin = resolveOriginConfig(edgeConfig);

  if (!origin) {
    return originNotConfiguredResponse(url.hostname);
  }

  try {
    if (origin.type === 'worker') {
      return await fetchWorkerOrigin(request, origin);
    }
    return await fetchResolveOrigin(request, origin);
  } catch (err) {
    return originFetchErrorResponse(url.hostname, origin.label, err);
  }
}

/**
 * @returns {{ type: 'worker'|'resolve', url?: string, host: string, resolveHost?: string, label: string } | null}
 */
export function resolveOriginConfig(edgeConfig) {
  const edge = edgeConfig?.edge ?? {};
  const nested = edge.origin ?? {};

  if (nested.type === 'worker' && nested.url) {
    return {
      type: 'worker',
      url: nested.url,
      host: nested.host_header ?? edge.origin_host_header ?? edgeConfig.domain,
      label: nested.url,
    };
  }

  if (edge.origin_type === 'worker' && edge.origin_worker_url) {
    return {
      type: 'worker',
      url: edge.origin_worker_url,
      host: edge.origin_host_header ?? edgeConfig.domain,
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

async function fetchWorkerOrigin(request, origin) {
  const publicUrl = new URL(request.url);
  const base = new URL(origin.url);
  const targetUrl = new URL(publicUrl.pathname + publicUrl.search, base);

  const headers = new Headers(request.headers);
  headers.set('Host', origin.host);

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';

  return fetch(targetUrl.toString(), {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
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

function originNotConfiguredResponse(hostname) {
  const apex = apexFromHost(hostname);
  const body = `<!DOCTYPE html>
<html lang="bg"><head><meta charset="utf-8"><title>Origin не е конфигуриран</title></head>
<body style="font-family:system-ui;max-width:720px;margin:2rem auto;padding:0 1rem">
<h1>AI Visibility Edge — serverless origin липсва</h1>
<p><strong>${hostname}</strong> минава през ai-visibility-edge, но няма конфигуриран backend Worker
(напр. <code>port</code>).</p>
<p>За Worker-only сайтове няма IP — origin е друг Worker URL.</p>
<h2>Конфигурация (git)</h2>
<pre style="background:#1a2332;padding:1rem;border-radius:8px;overflow:auto">"origin": {
  "type": "worker",
  "url": "https://port.radilov-k.workers.dev",
  "host_header": "www.${apex}"
}</pre>
<p>Merge + aiv-deploy.</p>
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

function apexFromHost(hostname) {
  return String(hostname).replace(/^www\./, '');
}
