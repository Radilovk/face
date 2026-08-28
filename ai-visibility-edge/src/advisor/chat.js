import { geminiChat, geminiConfigured, geminiModel, parseAdvisorActions } from './geminiClient.js';
import { buildAdvisorContext, ADVISOR_SYSTEM_PROMPT } from './context.js';

export async function advisorStatus(env) {
  return {
    configured: geminiConfigured(env),
    model: geminiModel(env),
    hint: geminiConfigured(env)
      ? null
      : 'Добавете GEMINI_API_KEY в Worker secrets и redeploy (aiv-deploy).',
  };
}

/**
 * @param {object} env
 * @param {{ domain: string, message: string, history?: Array<{role:string, content:string}> }} input
 */
export async function advisorChat(env, input) {
  if (!geminiConfigured(env)) {
    return { error: 'gemini_not_configured', hint: 'GEMINI_API_KEY липсва в Worker.' };
  }

  const domain = input.domain?.replace(/^www\./, '').toLowerCase();
  const message = String(input.message ?? '').trim();
  if (!domain) return { error: 'domain_required' };
  if (!message) return { error: 'message_required' };

  const context = await buildAdvisorContext(env, domain);
  const history = sanitizeHistory(input.history);

  const contextBlock = JSON.stringify(context, null, 2);
  const firstUser = history.length === 0;

  const messages = [];
  if (firstUser) {
    messages.push({
      role: 'user',
      content: `Контекст за сайт ${domain}:\n\`\`\`json\n${contextBlock}\n\`\`\`\n\nВъпрос на оператора:\n${message}`,
    });
  } else {
    messages.push({
      role: 'user',
      content: `Контекст (актуален):\n\`\`\`json\n${contextBlock}\n\`\`\``,
    });
    messages.push({ role: 'model', content: 'Разбрах контекста. Готов съм да помогна.' });
    for (const h of history) {
      messages.push({ role: h.role === 'model' ? 'model' : 'user', content: h.content });
    }
    messages.push({ role: 'user', content: message });
  }

  const { text } = await geminiChat({
    apiKey: env.GEMINI_API_KEY,
    model: geminiModel(env),
    systemInstruction: ADVISOR_SYSTEM_PROMPT,
    messages,
  });

  const { reply, actions } = parseAdvisorActions(text);

  return {
    domain,
    model: geminiModel(env),
    reply,
    actions,
    context_summary: {
      score: context.strategy?.score ?? null,
      verdict: context.strategy?.verdict?.headline ?? null,
      runs: context.pipeline?.stats?.runs ?? context.strategy?.stats?.runCount ?? 0,
    },
    generated_at: new Date().toISOString(),
  };
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .slice(-8)
    .filter((h) => h && (h.role === 'user' || h.role === 'model') && h.content)
    .map((h) => ({
      role: h.role,
      content: String(h.content).slice(0, 4000),
    }));
}
