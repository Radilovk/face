/**
 * Displacement-aware question refinement — Gemini when available.
 */
import { geminiChat, geminiConfigured } from '../advisor/geminiClient.js';
import { parseQuestionsBlock } from '../questions/generateSmart.js';

const DISPLACEMENT_Q_SYSTEM = `Генерирай 3 BG въпроса за AI visibility measurement, фокусирани върху displacement gaps:
- AI изброява конкуренти, но не цитира tenant домейна
- Въпросите трябва да увеличат шанса tenant да се появи в отговора
- Mix: comparative + situational + product
- JSON блок:

\`\`\`questions
[{"text":"...","qtype":"...","intent":"..."}]
\`\`\``;

export async function generateDisplacementQuestions(env, ctx) {
  const events = ctx.displacement?.events ?? [];
  if (events.length === 0) return { drafts: [], method: 'skip' };

  const payload = {
    domain: ctx.domain,
    brand: ctx.tenant?.name,
    vertical: ctx.tenant?.vertical_name,
    displacement_rate: ctx.displacement?.displacement_rate,
    sample_events: events.slice(0, 3),
    competitors: ctx.displacement?.competitors,
  };

  if (!geminiConfigured(env)) {
    return {
      drafts: events.slice(0, 2).map((e) => ({
        text: `Кои са най-добрите ${ctx.tenant?.vertical_name ?? 'продукти'} в България и защо ${ctx.domain} не се споменава? (${e.question_text?.slice(0, 80) ?? 'категория'})`,
        qtype: 'comparative',
        source: 'auto',
        intent: 'comparative',
      })),
      method: 'template',
    };
  }

  try {
    const { text, model } = await geminiChat({
      apiKey: env.GEMINI_API_KEY,
      model: env.GEMINI_MODEL,
      systemInstruction: DISPLACEMENT_Q_SYSTEM,
      messages: [{ role: 'user', content: JSON.stringify(payload, null, 2) }],
    });

    const parsed = parseQuestionsBlock(text);
    if (parsed.length > 0) {
      return { drafts: parsed.slice(0, 3), method: 'gemini', model };
    }
  } catch (err) {
    console.warn('[optimizer] displacement questions failed:', err.message);
  }

  return { drafts: [], method: 'failed' };
}
