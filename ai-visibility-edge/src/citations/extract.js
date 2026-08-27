import * as openai from './adapters/openai.js';
import * as gemini from './adapters/gemini.js';
import * as perplexity from './adapters/perplexity.js';

const ADAPTERS = {
  openai,
  gemini,
  perplexity,
};

export function getAdapter(model) {
  return ADAPTERS[model] ?? null;
}

export function parseModelResponse(model, raw) {
  const adapter = getAdapter(model);
  if (!adapter) throw new Error(`Unknown model adapter: ${model}`);
  return adapter.parse(raw);
}

export function listAdapters() {
  return Object.keys(ADAPTERS);
}
