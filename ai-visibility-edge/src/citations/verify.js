const TRACKING = /[?&](utm_[^=&]+|fbclid|gclid)=[^=&]*/gi;

export async function resolveUrl(inputUrl, fetchImpl = fetch) {
  try {
    const res = await fetchImpl(inputUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': 'AIVisibilityBot/1.0 (+https://ai-visibility-edge/verify)' },
    });
    const finalUrl = stripTracking(res.url || inputUrl);
    return {
      ok: res.status >= 200 && res.status < 400,
      http_status: res.status,
      finalUrl,
      response: res,
    };
  } catch {
    return { ok: false, http_status: 0, finalUrl: inputUrl, response: null };
  }
}

export async function readPageFromResponse(res, baseUrl) {
  if (!res || res.status < 200 || res.status >= 400) {
    return { ok: false, status: res?.status ?? 0, html: '', text: '', canonical: null };
  }

  const html = await res.text();
  const canonical = extractCanonical(html, baseUrl);
  const text = htmlToText(html);

  return {
    ok: true,
    status: res.status,
    html,
    text,
    canonical: canonical ? stripTracking(canonical) : baseUrl,
  };
}

export function stripTracking(url) {
  const u = new URL(url);
  for (const key of [...u.searchParams.keys()]) {
    if (key.startsWith('utm_') || key === 'fbclid' || key === 'gclid') {
      u.searchParams.delete(key);
    }
  }
  u.search = u.search.replace(TRACKING, '').replace(/\?$/, '');
  return u.toString();
}

export function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export async function fetchPage(url, fetchImpl = fetch) {
  const res = await fetchImpl(url, {
    headers: { 'User-Agent': 'AIVisibilityBot/1.0 (+https://ai-visibility-edge/verify)' },
  });
  return readPageFromResponse(res, url);
}

export function extractCanonical(html, baseUrl) {
  const m = html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i);
  if (!m) return null;
  const href = m[0].match(/href=["']([^"']+)["']/i);
  if (!href) return null;
  try {
    return new URL(href[1], baseUrl).toString();
  } catch {
    return null;
  }
}

export function extractContentVersion(html) {
  const m = html.match(/<meta[^>]+name=["']content-version["'][^>]*>/i);
  if (!m) return null;
  const c = m[0].match(/content=["']([^"']+)["']/i);
  return c ? c[1] : null;
}

export function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Extract numbers: price, %, g, mg, ml */
export function extractNumbers(text) {
  if (!text) return [];
  const re = /\d[\d\s.,]*(?:%|€|лв|BGN|EUR|USD|\$|mg|g|ml|kg|мг|г|мл)/gi;
  return [...text.matchAll(re)].map((m) => normalizeNumber(m[0]));
}

function normalizeNumber(s) {
  return s.replace(/\s+/g, '').toLowerCase();
}

export function extractPassageAroundClaim(pageText, supportedText, windowSize = 400) {
  const numbers = extractNumbers(supportedText);
  if (numbers.length > 0) {
    const normalizedPage = normalizeNumber(pageText);
    for (const num of numbers) {
      const idx = normalizedPage.indexOf(normalizeNumber(num));
      if (idx >= 0) {
        const start = Math.max(0, idx - 80);
        const end = Math.min(pageText.length, idx + windowSize);
        return {
          text: pageText.slice(start, end).trim(),
          offset: start,
          heading_context: null,
          found: true,
        };
      }
    }
  }

  if (supportedText?.length > 20) {
    const words = supportedText.split(/\s+/).filter((w) => w.length > 4).slice(0, 3);
    for (const word of words) {
      const idx = pageText.toLowerCase().indexOf(word.toLowerCase());
      if (idx >= 0) {
        const start = Math.max(0, idx - 80);
        const end = Math.min(pageText.length, idx + windowSize);
        return {
          text: pageText.slice(start, end).trim(),
          offset: start,
          heading_context: null,
          found: true,
        };
      }
    }
  }

  return { text: null, offset: null, heading_context: null, found: false };
}

export function numericMatch(supportedText, passageText) {
  const nums = extractNumbers(supportedText);
  if (nums.length === 0) return null;
  const hay = normalizeNumber(passageText);
  return nums.every((n) => hay.includes(normalizeNumber(n)));
}

export function wordOverlapScore(supportedText, passageText) {
  const words = (supportedText ?? '')
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 4);
  if (words.length === 0) return 0;
  const hay = passageText.toLowerCase();
  const hits = words.filter((w) => hay.includes(w)).length;
  return hits / words.length;
}

/**
 * Sync verify one citation against live page (passage-level).
 */
export async function verifyCitation(citation, options = {}) {
  const fetchImpl = options.fetch ?? fetch;
  const url = citation?.url;
  if (!url) {
    return buildResult('FABRICATED_URL', citation, { error: 'missing_url' });
  }

  const resolved = await resolveUrl(url, fetchImpl);
  if (!resolved.ok || !resolved.response) {
    return buildResult('FABRICATED_URL', citation, {
      url,
      http_status: resolved.http_status,
    });
  }

  const page = await readPageFromResponse(resolved.response, resolved.finalUrl);
  if (!page.ok) {
    return buildResult('FABRICATED_URL', citation, {
      url: resolved.finalUrl,
      http_status: page.status,
    });
  }

  const claimText = citation.supportedText || citation.snippet || '';
  const passage = extractPassageAroundClaim(page.text, claimText);

  if (!passage.found) {
    return {
      url,
      canonical_url: page.canonical,
      domain: extractDomain(page.canonical || url),
      cited_passage: null,
      passage_offset: null,
      heading_context: null,
      numeric_match: null,
      overlap: 0,
      content_version: extractContentVersion(page.html),
      cache_age_hours: null,
      http_status: page.status,
      needsSemantic: true,
      passage_found: false,
      supportedText: claimText,
    };
  }

  const numMatch = numericMatch(claimText, passage.text);
  const overlap = wordOverlapScore(claimText, passage.text);
  const contentVersion = extractContentVersion(page.html);

  return {
    url,
    canonical_url: page.canonical,
    domain: extractDomain(page.canonical || url),
    cited_passage: passage.text,
    passage_offset: passage.offset,
    heading_context: passage.heading_context,
    numeric_match: numMatch === null ? null : numMatch ? 1 : 0,
    overlap,
    content_version: contentVersion,
    cache_age_hours: null,
    http_status: page.status,
    needsSemantic: numMatch === false,
    passage_found: true,
    supportedText: claimText,
  };
}

function buildResult(className, citation, extra = {}) {
  return {
    class: className,
    url: citation?.url ?? null,
    domain: extractDomain(citation?.url ?? ''),
    cited_passage: null,
    passage_offset: null,
    heading_context: null,
    numeric_match: null,
    overlap: 0,
    content_version: null,
    ...extra,
  };
}
