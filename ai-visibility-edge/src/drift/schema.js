/** Adapter schema registry — drift baseline (Block 6.3). */
export const ADAPTER_SCHEMA_REGISTRY = {
  updated: '2026-08-28',
  models: {
    openai: { fixture: 'openai-2026-08', min_citations: 1, min_answer_chars: 10 },
    gemini: { fixture: 'gemini-2026-08', min_citations: 1, min_answer_chars: 10 },
    perplexity: { fixture: 'perplexity-2026-08', min_citations: 1, min_answer_chars: 10 },
  },
};

/**
 * Validate parsed adapter output against registry (CI + drift API).
 * @returns {Array<{ kind: string, severity: string, model: string, message: string }>}
 */
export function checkAdapterParse(model, parsed, registry = ADAPTER_SCHEMA_REGISTRY) {
  const spec = registry.models[model];
  if (!spec) {
    return [{ kind: 'schema', severity: 'warning', model, message: `Unknown model ${model}` }];
  }

  const alerts = [];
  const citations = parsed?.citations?.length ?? 0;
  const answerLen = (parsed?.answerText ?? '').length;

  if (citations < spec.min_citations) {
    alerts.push({
      kind: 'schema',
      severity: 'critical',
      model,
      message: `${model}: expected ≥${spec.min_citations} citations, got ${citations}`,
    });
  }

  if (answerLen < spec.min_answer_chars) {
    alerts.push({
      kind: 'schema',
      severity: 'warning',
      model,
      message: `${model}: answer text short (${answerLen} chars)`,
    });
  }

  if (parsed?.model && parsed.model !== model) {
    alerts.push({
      kind: 'schema',
      severity: 'critical',
      model,
      message: `${model}: adapter returned model=${parsed.model}`,
    });
  }

  return alerts;
}

/** Node-only: run fixture files through adapters. */
export function checkSchemaDriftFromFixtures(readJson, parseModelResponse, registry = ADAPTER_SCHEMA_REGISTRY) {
  const alerts = [];
  for (const [model, spec] of Object.entries(registry.models)) {
    const relPath = `src/citations/adapters/fixtures/${spec.fixture}.json`;
    try {
      const fixture = readJson(relPath);
      const parsed = parseModelResponse(model, fixture);
      alerts.push(...checkAdapterParse(model, parsed, registry));
    } catch (err) {
      alerts.push({
        kind: 'schema',
        severity: 'critical',
        model,
        message: `${model}: fixture parse failed — ${err.message}`,
      });
    }
  }
  return alerts;
}
