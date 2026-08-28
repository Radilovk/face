export const FORMULA_VERSION = 'sov-2026-08';

const INTEGRITY = {
  GROUNDED_VERIFIED: 1.0,
  GROUNDED_WEAK: 0.5,
};

const DEFAULTS = {
  semantic_threshold: 0.35,
  weak_overlap_min: 0.15,
};

export function getThresholds(configJson) {
  if (!configJson) return DEFAULTS;
  try {
    return { ...DEFAULTS, ...JSON.parse(configJson) };
  } catch {
    return DEFAULTS;
  }
}

/**
 * Classify from sync verify result (before async semantic queue).
 */
export function classifyFromVerify(verifyResult, thresholds = DEFAULTS) {
  if (verifyResult.class === 'FABRICATED_URL') {
    return { class: 'FABRICATED_URL', ...pickObs(verifyResult) };
  }

  if (verifyResult.passage_found === false) {
    return { class: 'MISATTRIBUTED', ...pickObs(verifyResult) };
  }

  if (verifyResult.numeric_match === 1) {
    return { class: 'GROUNDED_VERIFIED', ...pickObs(verifyResult) };
  }

  const overlap = verifyResult.overlap ?? 0;

  if (verifyResult.needsSemantic) {
    if (overlap >= thresholds.semantic_threshold) {
      return { class: 'GROUNDED_WEAK', ...pickObs(verifyResult) };
    }
    if (overlap >= thresholds.weak_overlap_min) {
      return { class: 'GROUNDED_WEAK', ...pickObs(verifyResult) };
    }
    return { class: 'MISATTRIBUTED', ...pickObs(verifyResult) };
  }

  if (overlap >= thresholds.semantic_threshold) {
    return { class: 'GROUNDED_WEAK', ...pickObs(verifyResult) };
  }
  if (overlap >= thresholds.weak_overlap_min) {
    return { class: 'GROUNDED_WEAK', ...pickObs(verifyResult) };
  }

  return { class: 'MISATTRIBUTED', ...pickObs(verifyResult) };
}

function pickObs(v) {
  return {
    url: v.url,
    canonical_url: v.canonical_url,
    domain: v.domain,
    cited_passage: v.cited_passage,
    passage_offset: v.passage_offset,
    heading_context: v.heading_context,
    numeric_match: v.numeric_match,
    content_version: v.content_version,
    cache_age_hours: v.cache_age_hours,
  };
}

/**
 * PARAMETRIC_RECALL — domain in prose, not in structured citations.
 */
export function detectParametricRecall(answerText, citationDomains, tenantDomains = []) {
  if (!answerText) return [];

  const cited = new Set(citationDomains.map((d) => d.toLowerCase()));
  const found = [];

  for (const domain of tenantDomains) {
    const d = domain.toLowerCase();
    if (answerText.toLowerCase().includes(d.replace('www.', '')) && !cited.has(d)) {
      found.push({ domain: d, class: 'PARAMETRIC_RECALL' });
    }
  }

  return found;
}

export function integrityMultiplier(className) {
  return INTEGRITY[className] ?? null;
}

export function isSovEligible(className) {
  return className === 'GROUNDED_VERIFIED' || className === 'GROUNDED_WEAK';
}

export function isMisattribution(className) {
  return className === 'MISATTRIBUTED';
}
