/**
 * Universal site assessment — rules that apply to every domain, not per-site hacks.
 *
 * Layers:
 * - repo_code: HTML/schema/sitemap in repo or static hosting (GitHub Pages, etc.)
 * - site_content: human-written marketing copy when genuinely thin
 * - dns_optional: CNAME to our Worker — platform monitoring only, never SEO-required
 * - measurement_noise: AI model hallucinations in observations, not site bugs
 */
import { countBrandMentions } from './probe.js';

export function effectiveBrandMentions(probe, brand) {
  if (!brand || !probe) return probe?.signals?.brand_mentions ?? 0;
  const fromProbe = probe.signals?.brand_mentions ?? 0;
  if (fromProbe > 0) return fromProbe;
  const text = probe.raw_json?.text_passage ?? probe.raw_json?.text_sample ?? '';
  return countBrandMentions(text, brand);
}

export function hasPriceSignals(probe) {
  if (!probe) return false;
  if ((probe.price_tokens ?? 0) > 0) return true;
  const types = probe.raw_json?.jsonld_types ?? probe.signals?.jsonld_types ?? [];
  if (types.some((t) => /Offer|Product|PriceSpecification/i.test(t))) return true;
  return false;
}

/** Final URL after redirects has enough signal for AI/crawlers. */
export function isRichLanding(probe, brand) {
  if (!probe) return false;
  const chars = probe.html_text_chars ?? 0;
  return (
    chars >= 500 &&
    effectiveBrandMentions(probe, brand) > 0 &&
    (probe.jsonld_blocks ?? 0) > 0
  );
}

export function inferPublishStack(probe) {
  if (!probe) return 'unknown';
  if ((probe.http_status ?? 0) >= 400) return 'error';
  if (probe.signals?.js_shell_suspect) return 'spa_shell';
  if ((probe.html_text_chars ?? 0) >= 200) return 'static_html';
  return 'unknown';
}

/** Edge/CNAME only when probe shows a fixable technical gap — not for healthy static sites. */
export function shouldRecommendEdge(probe) {
  if (!probe) return false;
  if (probe.robots_ai_policy === 'disallow_all') return true;
  if ((probe.jsonld_blocks ?? 0) === 0) return true;
  if (probe.robots_ai_policy === 'none' || probe.robots_ai_policy === 'fetch_error') return true;
  const chainLen = probe.raw_json?.redirect_chain?.length ?? 1;
  const chars = probe.html_text_chars ?? 0;
  if (chainLen > 1 && chars < 500) return true;
  return false;
}

/** CMS/AI homepage drafts only when content is genuinely missing — not when landing is already rich. */
export function shouldSuggestContentDraft(probe, brand, findingId) {
  if (isRichLanding(probe, brand)) return false;
  return [
    'thin_content',
    'thin_content_critical',
    'brand_absent',
    'no_prices',
    'anaphora_paragraphs',
    'js_shell',
  ].includes(findingId);
}

export function resolveManualGate(gateId, probe) {
  if (!gateId) return gateId;
  const stack = inferPublishStack(probe);
  if (stack === 'static_html') {
    if (gateId === 'cms_publish') return 'site_deploy';
    if (gateId === 'cms_meta') return 'site_deploy';
    if (gateId === 'cms_upload') return 'site_deploy';
    if (gateId === 'cms_ssr') return 'site_deploy';
  }
  return gateId;
}

export function isMeasurementNoiseFinding(id) {
  return id === 'fabricated_urls';
}

export function probeOptionsFromTenant(tenant) {
  return { brand: tenant?.name ?? undefined };
}
