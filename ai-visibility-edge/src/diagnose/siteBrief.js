/**
 * Structured site profile from probe — feeds question generation & strategy (Block 3).
 */

export function extractTitle(html) {
  const m = html?.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim().replace(/\s+/g, ' ') : null;
}

export function extractMetaDescription(html) {
  const m = html?.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  if (m?.[1]) return m[1].trim();
  const rev = html?.match(/content=["']([^"']+)["'][^>]+name=["']description["']/i);
  return rev?.[1]?.trim() ?? null;
}

export function extractFirstH1(html) {
  const m = html?.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!m) return null;
  return m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
}

export function extractJsonLdTypes(html) {
  if (!html) return [];
  const types = new Set();
  for (const m of html.matchAll(/"@type"\s*:\s*"([^"]+)"/gi)) {
    types.add(m[1]);
  }
  return [...types].slice(0, 8);
}

/**
 * @param {object} input
 * @param {object} input.probe — probeDomain() result (optionally with raw_json.html)
 * @param {string} [input.brand]
 * @param {string} [input.verticalLabel]
 */
export function buildSiteBrief({ probe, brand, verticalLabel }) {
  const html = probe?.raw_json?.html ?? '';
  const textSample = probe?.raw_json?.text_sample ?? '';

  const signals = [];
  if ((probe?.jsonld_blocks ?? 0) === 0) signals.push('no_jsonld');
  if ((probe?.html_text_chars ?? 0) < 400) signals.push('thin_content');
  if (probe?.robots_ai_policy === 'disallow_all') signals.push('robots_block');
  if ((probe?.price_tokens ?? 0) > 0) signals.push('has_prices');
  if ((probe?.raw_json?.redirect_chain?.length ?? 1) > 1) signals.push('redirect_chain');
  if (probe?.signals?.noindex) signals.push('noindex');
  if (probe?.signals?.js_shell_suspect) signals.push('js_shell');
  if (probe?.signals?.brand_mentions === 0 && (probe?.html_text_chars ?? 0) > 100) signals.push('brand_absent');
  if (probe?.signals?.sitemap_ok === false) signals.push('no_sitemap');

  return {
    domain: probe?.domain ?? null,
    brand: brand ?? probe?.domain ?? null,
    vertical: verticalLabel ?? null,
    final_url: probe?.raw_json?.final_url ?? null,
    title: probe?.raw_json?.title ?? extractTitle(html),
    meta_description: probe?.raw_json?.meta_description ?? extractMetaDescription(html),
    h1: probe?.raw_json?.h1 ?? extractFirstH1(html),
    jsonld_types: probe?.raw_json?.jsonld_types ?? extractJsonLdTypes(html),
    jsonld_blocks: probe?.jsonld_blocks ?? 0,
    robots_ai_policy: probe?.robots_ai_policy ?? 'unknown',
    blocked_bots: probe?.blocked_bots ?? [],
    html_text_chars: probe?.html_text_chars ?? 0,
    price_tokens: probe?.price_tokens ?? 0,
    text_sample: textSample.slice(0, 800),
    diagnostic_signals: signals,
    probed_at: probe?.probed_at ?? null,
  };
}
