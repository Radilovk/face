/**
 * Gemini-generated on-site content drafts (human publishes — never auto-live).
 */
import { geminiChat, geminiConfigured } from '../advisor/geminiClient.js';
import { buildHomepageCopy } from '../apply/generate.js';

const CONTENT_SYSTEM = `Ти си AEO/GEO content engineer за български e-commerce / health сайтове.

Получаваш JSON site brief + displacement gaps + brand info.

Генерирай видим HTML за homepage секция, която AI моделите могат да цитират автономно:
- H1 с марката
- 2–4 параграфа с конкретни факти (ниша, доставка BG, ценови диапазон ако е известен)
- FAQ с 3 въпроса/ответа (details/summary или h3+p)
- Без placeholder [скоби] — ако липсва факт, използвай generic но професионален език
- На български
- Без markdown — само HTML в блок:

\`\`\`html
...html...
\`\`\``;

export async function generateSmartContent(env, ctx, options = {}) {
  const { site_brief: brief, tenant, displacement, strategy } = ctx;
  const brand = tenant?.name ?? ctx.domain;

  if (!brief || !geminiConfigured(env)) {
    return {
      method: 'template',
      artifact: buildHomepageCopy({
        domain: ctx.domain,
        brand,
        vertical: tenant?.vertical_name,
      }),
      artifact_format: 'html',
      title: 'Homepage AI-citable section (template)',
    };
  }

  const prompt = {
    brand,
    domain: ctx.domain,
    vertical: tenant?.vertical_name,
    brief,
    score: strategy?.score,
    displacement_events: displacement?.events?.slice(0, 3),
    competitors: displacement?.competitors,
    intent: options.intent ?? 'homepage_faq',
  };

  try {
    const { text, model } = await geminiChat({
      apiKey: env.GEMINI_API_KEY,
      model: env.GEMINI_MODEL,
      systemInstruction: CONTENT_SYSTEM,
      messages: [{ role: 'user', content: JSON.stringify(prompt, null, 2) }],
    });

    const html = parseHtmlBlock(text);
    if (html.length > 200) {
      return {
        method: 'gemini',
        model,
        artifact: html,
        artifact_format: 'html',
        title: 'Homepage + FAQ (AI-generated draft)',
      };
    }
  } catch (err) {
    console.warn('[optimizer] content generation failed:', err.message);
  }

  return {
    method: 'template_fallback',
    artifact: buildHomepageCopy({ domain: ctx.domain, brand, vertical: tenant?.vertical_name }),
    artifact_format: 'html',
    title: 'Homepage AI-citable section (template fallback)',
  };
}

function parseHtmlBlock(text) {
  const match = text.match(/```html\s*([\s\S]*?)```/i);
  if (match) return match[1].trim();
  if (text.includes('<section') || text.includes('<h1')) return text.trim();
  return '';
}

/** Export for tests */
export { parseHtmlBlock };
