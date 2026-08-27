import { readFileSync } from 'node:fs';
import * as openai from './adapters/openai.js';
import * as gemini from './adapters/gemini.js';

const ADAPTERS = {
  openai,
  gemini,
};

export function getAdapter(model) {
  return ADAPTERS[model] ?? null;
}

export function parseModelResponse(model, raw) {
  const adapter = getAdapter(model);
  if (!adapter) throw new Error(`Unknown model adapter: ${model}`);
  return adapter.parse(raw);
}

export function verifyFixtures() {
  const errors = [];
  for (const [name, adapter] of Object.entries(ADAPTERS)) {
    try {
      const fixture = JSON.parse(readFileSync(adapter.FIXTURE, 'utf8'));
      const result = adapter.parse(fixture);
      if (!result.citations?.length && !result.answerText) {
        errors.push(`${name}: empty parse`);
      }
      if (result.model !== name) {
        errors.push(`${name}: model mismatch`);
      }
    } catch (err) {
      errors.push(`${name}: ${err.message}`);
    }
  }
  return errors;
}
