/**
 * Model registry — single source of truth (review monthly against provider changelogs).
 * @see https://ai.google.dev/gemini-api/docs/changelog
 * @updated 2026-08-28
 */
export const MODEL_REGISTRY = {
  updated: '2026-08-28',
  openai: {
    citations: 'gpt-4.1-mini',
    api: 'responses',
    tools: [{ type: 'web_search_preview' }],
  },
  gemini: {
    /** GA 2026-07-21 — citations + google_search grounding */
    citations: 'gemini-3.6-flash',
    advisor: 'gemini-3.6-flash',
    /** High-volume / low-cost alternative */
    lite: 'gemini-3.5-flash-lite',
    api: 'generativelanguage.googleapis.com/v1beta',
    searchTool: { google_search: {} },
    /** Shut down 2026-06-01 per Google changelog — do not use */
    deprecated: [
      'gemini-2.0-flash',
      'gemini-2.0-flash-001',
      'gemini-2.0-flash-lite',
      'gemini-2.0-flash-lite-001',
    ],
  },
  perplexity: {
    citations: 'sonar',
  },
};

export function openaiModelId(env) {
  return env.OPENAI_MODEL ?? MODEL_REGISTRY.openai.citations;
}

export function geminiModelId(env, purpose = 'citations') {
  if (env.GEMINI_MODEL) return env.GEMINI_MODEL;
  if (purpose === 'advisor') return MODEL_REGISTRY.gemini.advisor;
  if (purpose === 'lite') return MODEL_REGISTRY.gemini.lite;
  return MODEL_REGISTRY.gemini.citations;
}

export function perplexityModelId(env) {
  return env.PERPLEXITY_MODEL ?? MODEL_REGISTRY.perplexity.citations;
}

export function geminiGenerateUrl(modelId, apiKey) {
  const model = modelId ?? MODEL_REGISTRY.gemini.citations;
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
}

export function isDeprecatedGeminiModel(modelId) {
  return MODEL_REGISTRY.gemini.deprecated.includes(modelId);
}

/** Runtime status for dashboard / health. */
export function getModelsStatus(env) {
  const gemini = geminiModelId(env, 'citations');
  const advisor = geminiModelId(env, 'advisor');
  return {
    registry_updated: MODEL_REGISTRY.updated,
    openai: {
      model: openaiModelId(env),
      configured: Boolean(env.OPENAI_API_KEY),
    },
    gemini: {
      model: gemini,
      advisor_model: advisor,
      configured: Boolean(env.GEMINI_API_KEY),
      deprecated_warning: isDeprecatedGeminiModel(gemini)
        ? `${gemini} is shut down — set GEMINI_MODEL=gemini-3.6-flash`
        : null,
    },
    perplexity: {
      model: perplexityModelId(env),
      configured: Boolean(env.PERPLEXITY_API_KEY),
    },
  };
}
