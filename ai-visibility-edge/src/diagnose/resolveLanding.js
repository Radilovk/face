import { extractCanonical, htmlToText } from '../citations/verify.js';

/**
 * Fetch page for probe, following HTTP + client-side redirects (meta refresh, location.replace).
 */
export async function fetchProbePage(startUrl, fetchImpl, options = {}) {
  const maxHops = options.maxHops ?? 3;
  const ua = options.userAgent ?? 'AIVisibilityBot/1.0 (+https://ai-visibility-edge/probe)';
  const chain = [];
  let url = startUrl;

  for (let hop = 0; hop < maxHops; hop++) {
    const res = await fetchImpl(url, {
      redirect: 'follow',
      headers: { 'User-Agent': ua },
    });

    const html = await res.text();
    const finalUrl = res.url || url;
    const text = htmlToText(html);
    chain.push({ url: finalUrl, status: res.status, text_chars: text.length });

    const clientNext = extractClientRedirect(html, finalUrl);
    const thinStub = text.length < 200 && clientNext;
    if (clientNext && clientNext !== finalUrl && (thinStub || hop === 0)) {
      url = clientNext;
      continue;
    }

    const canonical = extractCanonical(html, finalUrl);
    return {
      ok: res.status >= 200 && res.status < 400,
      status: res.status,
      html,
      text,
      finalUrl,
      canonical: canonical ? canonical : finalUrl,
      redirect_chain: chain,
    };
  }

  const last = chain[chain.length - 1];
  return {
    ok: last?.status >= 200 && last?.status < 400,
    status: last?.status ?? 0,
    html: '',
    text: '',
    finalUrl: url,
    canonical: url,
    redirect_chain: chain,
  };
}

/** Meta refresh, location.replace, location.href — common stub → landing patterns. */
export function extractClientRedirect(html, baseUrl) {
  const meta = html.match(
    /<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'][^"']*url=([^"';]+)/i,
  );
  if (meta?.[1]) return resolveMaybeRelative(meta[1].trim(), baseUrl);

  const replace = html.match(/location\.replace\s*\(\s*['"]([^'"]+)['"]/i);
  if (replace?.[1]) return resolveMaybeRelative(replace[1].trim(), baseUrl);

  const href = html.match(/location\.href\s*=\s*['"]([^'"]+)['"]/i);
  if (href?.[1]) return resolveMaybeRelative(href[1].trim(), baseUrl);

  return null;
}

function resolveMaybeRelative(path, baseUrl) {
  try {
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return new URL(path, baseUrl).toString();
  } catch {
    return null;
  }
}
