import { geminiChat, geminiConfigured } from '../advisor/geminiClient.js';
import { generateQuestionDrafts } from '../api/questions.js';
import { buildSiteBrief } from '../diagnose/siteBrief.js';

const QUESTION_SYSTEM = `Ти генерираш въпроси за измерване на AI видимост (AEO/GEO) в България.

Получаваш JSON "site brief" — реални сигнали от одита на сайта (заглавие, текст, JSON-LD, robots, цени).

Задача: 5 въпроса на български, които реален потребител би задал на ChatGPT/Gemini/Perplexity и където този сайт/марка би трябвало да се появи в отговора.

Покрий mix от intent:
- brand (директно за марката/сайта)
- product (покупка, доставка BG)
- informational (как да избера, сравнение)
- comparative (марки, алтернативи)
- situational (конкретен сценарий от niche-а на сайта)

Правила:
- Въпросите трябва да отразяват КАКВО сайтът реално продава/прави (от brief), не generic SEO.
- Използвай български пазар (лв/€, доставка в България) когато е уместно.
- Не повтаряй един и същ intent два пъти.
- Без markdown — само JSON блок:

\`\`\`questions
[{"text":"...","qtype":"brand|product|informational|comparative|situational","intent":"..."}]
\`\`\``;

/**
 * Parse ```questions [...] ``` from Gemini output.
 */
export function parseQuestionsBlock(text) {
  const match = text.match(/```questions\s*([\s\S]*?)```/i);
  if (!match) return [];

  try {
    const parsed = JSON.parse(match[1].trim());
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((q) => q?.text?.trim())
      .slice(0, 8)
      .map((q) => ({
        text: String(q.text).trim().slice(0, 500),
        qtype: normalizeQtype(q.qtype ?? q.intent),
        source: 'auto',
        intent: normalizeQtype(q.intent ?? q.qtype),
      }));
  } catch {
    return [];
  }
}

function normalizeQtype(value) {
  const v = String(value ?? 'informational').toLowerCase();
  if (['brand', 'product', 'informational', 'comparative', 'situational'].includes(v)) return v;
  return 'informational';
}

/**
 * Site-aware question generation — Gemini when configured, else templates.
 */
export async function generateQuestionDraftsSmart({
  domain,
  brand,
  verticalLabel,
  probe,
  env,
}) {
  const fallback = () =>
    generateQuestionDrafts({ domain, brand, verticalLabel });

  if (!probe || !env || !geminiConfigured(env)) {
    return { drafts: fallback(), method: 'template' };
  }

  const brief = buildSiteBrief({ probe, brand, verticalLabel });

  try {
    const { text, model } = await geminiChat({
      apiKey: env.GEMINI_API_KEY,
      model: env.GEMINI_MODEL,
      systemInstruction: QUESTION_SYSTEM,
      messages: [{ role: 'user', content: JSON.stringify(brief, null, 2) }],
    });

    const parsed = parseQuestionsBlock(text);
    if (parsed.length >= 5) {
      return { drafts: parsed.slice(0, 5), method: 'gemini', model, brief };
    }

    if (parsed.length > 0) {
      const extra = fallback().slice(0, 5 - parsed.length);
      return { drafts: [...parsed, ...extra], method: 'gemini+template', model, brief };
    }

    return { drafts: fallback(), method: 'template_fallback', model, brief };
  } catch (err) {
    console.warn('[questions] gemini generation failed:', err.message);
    return { drafts: fallback(), method: 'template_error', error: err.message, brief };
  }
}
