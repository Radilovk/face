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

/**
 * Technical baseline (Layers 2–3 of conveyor): crawlable, readable, identity, schema.
 * When complete, product focus shifts to measurement + positioning (Layers 5–6, SOV).
 */
export function assessTechnicalBaseline(probe, brand) {
  const gaps = [];
  if (!probe) return { complete: false, gaps: ['no_probe'], phase: 'technical' };

  if (probe.signals?.noindex) gaps.push('noindex');
  if (probe.robots_ai_policy === 'disallow_all') gaps.push('robots');
  if ((probe.http_status ?? 0) < 200 || (probe.http_status ?? 0) >= 400) gaps.push('http');
  if (probe.signals?.js_shell_suspect) gaps.push('js_shell');
  if ((probe.html_text_chars ?? 0) < 500) gaps.push('thin_content');
  if ((probe.jsonld_blocks ?? 0) === 0) gaps.push('jsonld');
  if (!probe.signals?.sitemap_ok) gaps.push('sitemap');
  if (brand && effectiveBrandMentions(probe, brand) === 0) gaps.push('brand');

  const soft = [];
  if (!hasPriceSignals(probe)) soft.push('prices');

  return {
    complete: gaps.length === 0,
    gaps,
    soft_gaps: soft,
    phase: gaps.length === 0 ? 'positioning_ready' : 'technical',
  };
}

/**
 * Product phase per MASTER/СТРАТЕГИЯ: measure first, then fight for AI recommendation rank.
 */
export function resolveProductPhase(input = {}) {
  const { probe, brand, runCount = 0, displacement, sov } = input;
  const baseline = assessTechnicalBaseline(probe, brand);

  if (!baseline.complete) {
    return {
      ...baseline,
      product_phase: 'technical',
      focus: 'Поправете crawl/read/schema — без това AI не може да ви цитира.',
    };
  }

  if (runCount === 0) {
    return {
      ...baseline,
      product_phase: 'measurement',
      focus: 'Техническата основа е готова. Пуснете AI измерване — SOV и displacement са истината.',
    };
  }

  const dispRate = displacement?.displacement_rate ?? 0;
  const sovShare = sov?.share ?? sov?.sov ?? null;
  const obs = sov?.total_observations ?? displacement?.total_runs ?? 0;

  if (dispRate >= 0.15 || (sovShare != null && sovShare < 0.1 && obs > 5)) {
    return {
      ...baseline,
      product_phase: 'positioning',
      focus:
        'Битка за позиция: situational въпроси, сравнения с конкуренти, самостоятелни пасажи — не още schema/sitemap.',
    };
  }

  if (sovShare != null && sovShare >= 0.15 && dispRate < 0.1) {
    return {
      ...baseline,
      product_phase: 'dominance',
      focus: 'Силна позиция — мониторинг, remeasure, parametric recall и нови вертикални въпроси.',
    };
  }

  return {
    ...baseline,
    product_phase: 'positioning',
    focus: 'Натрупайте observations и атакувайте displacement — целта е top-of-mind в AI препоръките.',
  };
}
