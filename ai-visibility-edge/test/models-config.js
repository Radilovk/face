import assert from 'node:assert/strict';
import {
  MODEL_REGISTRY,
  geminiModelId,
  isDeprecatedGeminiModel,
  getModelsStatus,
  geminiGenerateUrl,
} from '../src/config/models.js';

export function testModelRegistryCurrent() {
  assert.equal(MODEL_REGISTRY.updated, '2026-08-28');
  assert.equal(MODEL_REGISTRY.gemini.citations, 'gemini-3.6-flash');
  assert(!isDeprecatedGeminiModel('gemini-3.6-flash'));
  assert(isDeprecatedGeminiModel('gemini-2.0-flash'));
}

export function testGeminiModelOverride() {
  assert.equal(geminiModelId({}, 'citations'), 'gemini-3.6-flash');
  assert.equal(geminiModelId({ GEMINI_MODEL: 'gemini-3.5-flash-lite' }), 'gemini-3.5-flash-lite');
}

export function testModelsStatus() {
  const status = getModelsStatus({ GEMINI_API_KEY: 'x', OPENAI_API_KEY: 'y' });
  assert.equal(status.gemini.model, 'gemini-3.6-flash');
  assert.equal(status.gemini.configured, true);
  assert.equal(status.openai.configured, true);
  assert.equal(status.gemini.deprecated_warning, null);
  const bad = getModelsStatus({ GEMINI_MODEL: 'gemini-2.0-flash' });
  assert(bad.gemini.deprecated_warning);
}

export function testGeminiGenerateUrl() {
  const url = geminiGenerateUrl('gemini-3.6-flash', 'test-key');
  assert(url.includes('gemini-3.6-flash'));
  assert(url.includes('test-key'));
}
