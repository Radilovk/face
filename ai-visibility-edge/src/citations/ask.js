import { parseModelResponse } from './extract.js';
import {
  openaiModelId,
  geminiModelId,
  geminiGenerateUrl,
  perplexityModelId,
  MODEL_REGISTRY,
} from '../config/models.js';

const DEFAULT_MODELS = ['openai', 'gemini', 'perplexity'];

export async function askQuestion(text, env, options = {}) {
  const models = options.models ?? DEFAULT_MODELS.filter((m) => hasKey(env, m));
  const results = [];

  for (const model of models) {
    try {
      const raw = await callModel(model, text, env);
      const parsed = parseModelResponse(model, raw);
      results.push({ ok: true, ...parsed });
    } catch (err) {
      results.push({ ok: false, model, error: err.message, raw: null });
    }
  }

  return results;
}

function hasKey(env, model) {
  if (model === 'openai') return Boolean(env.OPENAI_API_KEY);
  if (model === 'gemini') return Boolean(env.GEMINI_API_KEY);
  if (model === 'perplexity') return Boolean(env.PERPLEXITY_API_KEY);
  return false;
}

async function callModel(model, text, env) {
  if (model === 'openai') return callOpenAI(text, env);
  if (model === 'gemini') return callGemini(text, env);
  if (model === 'perplexity') return callPerplexity(text, env);
  throw new Error(`Unsupported model: ${model}`);
}

async function callOpenAI(text, env) {
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: openaiModelId(env),
      tools: MODEL_REGISTRY.openai.tools,
      input: text,
    }),
  });
  const raw = await res.json();
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${JSON.stringify(raw).slice(0, 200)}`);
  return raw;
}

async function callPerplexity(text, env) {
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: perplexityModelId(env),
      messages: [{ role: 'user', content: text }],
    }),
  });
  const raw = await res.json();
  if (!res.ok) throw new Error(`Perplexity ${res.status}: ${JSON.stringify(raw).slice(0, 200)}`);
  return raw;
}

async function callGemini(text, env) {
  const url = geminiGenerateUrl(geminiModelId(env, 'citations'), env.GEMINI_API_KEY);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }],
      tools: [MODEL_REGISTRY.gemini.searchTool],
    }),
  });
  const raw = await res.json();
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${JSON.stringify(raw).slice(0, 200)}`);
  return raw;
}

export async function persistRuns(db, questionId, results, repetition = 1) {
  if (!db) return [];
  const ids = [];
  const runAt = new Date().toISOString();

  for (const r of results) {
    if (!r.ok) continue;
    const id = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO runs (id, question_id, model, run_at, repetition, raw_response, answer_text, subquestions_detected)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        questionId,
        r.model,
        runAt,
        repetition,
        JSON.stringify(r.raw),
        r.answerText ?? '',
        r.subquestions_detected ? JSON.stringify(r.subquestions_detected) : null,
      )
      .run();
    ids.push({ id, model: r.model, citations: r.citations?.length ?? 0 });
  }

  return ids;
}
