import { fetchDomainStrategy } from '../diagnose/strategy.js';
import { getApplyPlan } from '../api/apply.js';
import { getSitePipeline } from '../api/pipeline.js';
import { advisorContextTtlSec } from '../config/economy.js';
import { buildSiteBrief } from '../diagnose/siteBrief.js';

function advisorContextKey(domain) {
  return `aiv/advisor/context/${domain.replace(/^www\./, '').toLowerCase()}`;
}

export async function buildAdvisorContext(env, domain) {
  const normalized = domain.replace(/^www\./, '').toLowerCase();
  const ttl = advisorContextTtlSec(env);

  if (env.CACHE && ttl > 0) {
    const cached = await env.CACHE.get(advisorContextKey(normalized), 'json');
    if (cached?.domain && cached?.generated_at) {
      return { ...cached, cache_hit: true };
    }
  }

  const context = await buildAdvisorContextFresh(env, normalized);

  if (env.CACHE && ttl > 0) {
    await env.CACHE.put(advisorContextKey(normalized), JSON.stringify(context), {
      expirationTtl: ttl,
    });
  }

  return context;
}

/** Invalidate cached advisor context (e.g. after pipeline run). */
export async function invalidateAdvisorContext(env, domain) {
  if (!env.CACHE || !domain) return;
  const normalized = domain.replace(/^www\./, '').toLowerCase();
  await env.CACHE.delete(advisorContextKey(normalized));
}

async function buildAdvisorContextFresh(env, normalized) {
  const [strategy, apply, pipeline] = await Promise.all([
    fetchDomainStrategy(env, normalized).catch(() => null),
    env.DB ? getApplyPlan(env, normalized).catch(() => null) : null,
    env.DB ? getSitePipeline(env, normalized).catch(() => null) : null,
  ]);

  return {
    domain: normalized,
    brand: strategy?.brand ?? apply?.brand ?? normalized,
    generated_at: new Date().toISOString(),
    strategy: strategy
      ? {
          score: strategy.score,
          verdict: strategy.verdict,
          pillars: strategy.pillars,
          plan_week: strategy.plan?.this_week?.slice(0, 6),
          plan_month: strategy.plan?.this_month?.slice(0, 4),
          stats: strategy.stats,
          probe: strategy.probe,
        }
      : null,
    site_brief: strategy?.probe
      ? buildSiteBrief({
          probe: strategy.probe,
          brand: strategy.brand,
          verticalLabel: null,
        })
      : null,
    apply: apply && !apply.error
      ? {
          summary: apply.summary,
          fix_count: apply.fixes?.length ?? 0,
          fixes: apply.fixes?.slice(0, 8).map((f) => ({
            id: f.id,
            title: f.title,
            type: f.type,
            priority: f.priority,
          })),
        }
      : null,
    pipeline: pipeline && !pipeline.error
      ? {
          stats: pipeline.stats,
          steps: pipeline.steps?.map((s) => ({ id: s.id, status: s.status, title: s.title })),
        }
      : null,
  };
}

export const ADVISOR_SYSTEM_PROMPT = `Ти си Gemini съветник в платформата AI Visibility Edge.

Роля: помагаш на оператора да реши КАКВО да направи след анализа на сайт — не общ SEO съвет, а конкретни стъпки спрямо данните от системата.

Получаваш JSON контекст: probe, site_brief, score, вердикт, pillars, pipeline статус, apply fixes.

Правила:
- Отговаряй на български, ясно и кратко (2–5 абзаца max).
- Казвай КАКВО първо, КАКВО второ — с обосновка от данните.
- Различавай: (а) технически fixes — JSON-LD, robots, redirect; (б) съдържание — текст, FAQ; (в) измерване — pipeline, SOV.
- Edge: технически fixes (JSON-LD, robots) → auto activate + CNAME; marketing copy → AI draft + human publish.
- Не измисляй данни — ако липсват runs, кажи „пусни анализ“.

Когато препоръчваш действие в платформата, добави блок (само ако има смисъл):
\`\`\`actions
[{"action":"run_analysis","label":"Стартирай пълен анализ","reason":"няма runs"}]
\`\`\`

Позволени action codes:
- run_auto_optimizer — пълен автономен цикъл (measure + edge + content draft)
- run_analysis — пълен pipeline (одит, въпроси, measure)
- generate_apply — alias за run_auto_optimizer
- refresh_strategy — обнови вердикт и score
- open_report — отвори HTML отчет
- generate_questions — авто-генерирай BG въпроси

Човешки gates (НЕ автоматизирай): dns_cname, cms_publish, strategic_review.

Без markdown заглавия с # — използвай обикновен текст.`;
