import { geminiModelId, geminiGenerateUrl, MODEL_REGISTRY } from '../config/models.js';

export function geminiConfigured(env) {
  return Boolean(env.GEMINI_API_KEY);
}

export function geminiModel(env) {
  return geminiModelId(env, 'advisor');
}

/**
 * @param {object} params
 * @param {string} params.apiKey
 * @param {string} [params.model]
 * @param {string} params.systemInstruction
 * @param {Array<{role: 'user'|'model', content: string}>} params.messages
 */
export async function geminiChat({ apiKey, model, systemInstruction, messages }) {
  const modelId = model ?? geminiModelId({}, 'advisor');
  const url = geminiGenerateUrl(modelId, apiKey);

  const contents = messages.map((m) => ({
    role: m.role === 'model' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents,
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 2048,
      },
    }),
  });

  const raw = await res.json();
  if (!res.ok) {
    throw new Error(`Gemini ${res.status}: ${JSON.stringify(raw).slice(0, 300)}`);
  }

  const text =
    raw?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('\n').trim() ?? '';

  if (!text) {
    throw new Error('Gemini returned empty response');
  }

  return { text, raw, model: modelId };
}

/** Extract optional action buttons from ```actions [...] ``` block. */
export function parseAdvisorActions(text) {
  const match = text.match(/```actions\s*([\s\S]*?)```/i);
  if (!match) return { reply: text.trim(), actions: [] };

  let actions = [];
  try {
    const parsed = JSON.parse(match[1].trim());
    actions = Array.isArray(parsed) ? parsed : parsed.actions ?? [];
  } catch {
    /* ignore malformed */
  }

  const reply = text.replace(match[0], '').trim();
  return { reply, actions: normalizeActions(actions) };
}

const ALLOWED_ACTIONS = new Set([
  'run_analysis',
  'generate_apply',
  'refresh_strategy',
  'open_report',
  'generate_questions',
]);

function normalizeActions(actions) {
  return actions
    .filter((a) => a && ALLOWED_ACTIONS.has(a.action))
    .slice(0, 4)
    .map((a) => ({
      action: a.action,
      label: String(a.label ?? a.action).slice(0, 80),
      reason: a.reason ? String(a.reason).slice(0, 200) : undefined,
    }));
}

export { MODEL_REGISTRY };
