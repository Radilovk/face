/**
 * Fetch tenant origin without looping back through the Worker (522 fix).
 *
 * Requires edge.origin_host — hostname that resolves to real hosting
 * (e.g. grey-cloud origin.biocode-bg.com A record, or hosting provider hostname).
 */

const ORIGIN_TIMEOUT_MS = 25_000;

export async function fetchOrigin(request, edgeConfig) {
  const url = new URL(request.url);
  const originHost = edgeConfig?.edge?.origin_host;

  if (!originHost) {
    return originNotConfiguredResponse(url.hostname);
  }

  const hostHeader = edgeConfig?.edge?.origin_host_header ?? url.hostname;
  const headers = new Headers(request.headers);
  headers.set('Host', hostHeader);

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';

  try {
    const response = await fetch(request.url, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      redirect: 'follow',
      cf: { resolveOverride: originHost },
      signal: AbortSignal.timeout(ORIGIN_TIMEOUT_MS),
    });
    return response;
  } catch (err) {
    return originFetchErrorResponse(url.hostname, originHost, err);
  }
}

function originNotConfiguredResponse(hostname) {
  const body = `<!DOCTYPE html>
<html lang="bg"><head><meta charset="utf-8"><title>Origin не е конфигуриран</title></head>
<body style="font-family:system-ui;max-width:640px;margin:2rem auto;padding:0 1rem">
<h1>AI Visibility Edge — origin липсва</h1>
<p><strong>${hostname}</strong> сочи към Worker (CNAME), но <code>origin_host</code> не е зададен в
<code>config/tenants/${apexFromHost(hostname)}.json</code>.</p>
<p>Без origin Worker не може да проксира магазина → Cloudflare 522.</p>
<h2>Какво да направите (веднъж)</h2>
<ol>
<li>DNS-only запис <code>origin.${apexFromHost(hostname)}</code> → A към реалния сървър (сиво облаче)</li>
<li>В git: <code>"origin_host": "origin.${apexFromHost(hostname)}"</code></li>
<li>Merge + aiv-deploy</li>
</ol>
<p>Или в Cloudflare → Custom Hostname → Custom origin server за ${hostname}.</p>
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

function originFetchErrorResponse(hostname, originHost, err) {
  const body = `Origin fetch failed for ${hostname} via ${originHost}: ${err?.message ?? err}`;
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
