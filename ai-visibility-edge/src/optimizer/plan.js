/**
 * Rule-based optimization plan — deterministic, zero LLM cost.
 * Human gates only where automation is impossible or risky.
 */

export const HUMAN_GATES = {
  dns_cname: {
    id: 'dns_cname',
    title: 'CNAME / DNS',
    why: 'Само вие имате достъп до DNS/registrar — Edge не може да насочи домейна автоматично.',
  },
  cms_publish: {
    id: 'cms_publish',
    title: 'Публикуване на съдържание',
    why: 'AI генерира draft — публикуването в CMS изисква човешка проверка на факти и тон.',
  },
  strategic_review: {
    id: 'strategic_review',
    title: 'Стратегическа преценка',
    why: 'Чувствителна ниша или висок риск — прегледайте преди автоматични промени.',
  },
};

export function buildOptimizationPlan(ctx, env = {}) {
  if (ctx.error) return { error: ctx.error, domain: ctx.domain };

  const auto = [];
  const human = [];
  const insights = [];

  const stats = ctx.stats ?? {};
  const edge = ctx.edge ?? {};
  const autoEdge = env.AUTO_EDGE_ACTIVATE !== '0' && env.AUTO_EDGE_ACTIVATE !== 'false';
  const sensitiveVertical = /peptide|research|pharma|medical/i.test(ctx.tenant?.vertical_name ?? '');

  if (stats.runCount === 0) {
    auto.push({
      action: 'run_pipeline',
      priority: 1,
      reason: 'Няма AI runs — пълен pipeline (одит → site-aware въпроси → measure → reprocess).',
    });
  }

  if (stats.pendingReprocess > 0) {
    auto.push({
      action: 'reprocess',
      priority: 2,
      reason: `${stats.pendingReprocess} runs без observations — verify + classify.`,
    });
  }

  if (stats.questionCount < 5) {
    auto.push({
      action: 'generate_questions',
      priority: 3,
      reason: 'Под 5 въпроса — Gemini генерира от site brief.',
    });
  }

  const displacementRate = ctx.displacement?.displacement_rate ?? 0;
  if (displacementRate >= 0.25 && stats.runCount >= 5) {
    auto.push({
      action: 'refine_questions_displacement',
      priority: 4,
      reason: `Displacement ${Math.round(displacementRate * 100)}% — нови въпроси от gap events.`,
    });
    insights.push(`Конкуренти изместват ${ctx.domain} в ${ctx.displacement?.displaced_count ?? 0} runs.`);
  }

  const thinContent = (ctx.probe?.html_text_chars ?? 0) < 500;
  if (thinContent) {
    auto.push({
      action: 'generate_content',
      priority: 5,
      reason: 'Thin content — Gemini draft за homepage/FAQ (не се публикува автоматично).',
    });
    human.push({
      gate: 'cms_publish',
      priority: 1,
      reason: 'Копирайте генерирания HTML draft в CMS и пуснете повторен одит.',
      artifact_type: 'homepage_html',
    });
  }

  const edgeFixes = edge.fixes ?? [];
  if (edgeFixes.length > 0 && !edge.edge_active && !ctx.tenant?.edge_enabled) {
    if (autoEdge && !sensitiveVertical) {
      auto.push({
        action: 'activate_edge',
        priority: 6,
        reason: `Edge fixes: ${edgeFixes.map((f) => f.id).join(', ')} — автоматичен KV deploy.`,
      });
    } else if (sensitiveVertical) {
      human.push({
        gate: 'strategic_review',
        priority: 2,
        reason: 'Чувствителна вертикал — прегледайте Edge config преди activate.',
      });
    }
  }

  if (edge.status === 'pending_cname' || (ctx.tenant?.edge_enabled && !edge.edge_active)) {
    human.push({
      gate: 'dns_cname',
      priority: 1,
      reason: `Насочете ${ctx.domain} към Worker (Custom Hostname). Без CNAME Edge fixes не са live.`,
      onboarding: true,
    });
  }

  if (edge.edge_active && stats.runCount > 0 && stats.obsCount > 0) {
    auto.push({
      action: 'remeasure',
      priority: 7,
      reason: 'Edge active — remeasure за delta след оптимизация.',
    });
  }

  if (edgeFixes.length === 0 && !thinContent && stats.runCount >= 10) {
    insights.push('Техническите сигнали са OK — фокус: displacement + съдържание + мониторинг.');
  }

  auto.sort((a, b) => a.priority - b.priority);
  human.sort((a, b) => a.priority - b.priority);

  const headline = buildHeadline(ctx, auto, human);

  return {
    domain: ctx.domain,
    headline,
    insights,
    auto_actions: auto,
    human_gates: human,
    automation_level: human.length === 0 ? 'full_auto' : human.length === 1 && human[0].gate === 'dns_cname' ? 'auto_except_dns' : 'hybrid',
    context_summary: {
      score: ctx.strategy?.score,
      runCount: stats.runCount,
      displacement_rate: displacementRate,
      edge_status: edge.status,
      thin_content: thinContent,
    },
    generated_at: new Date().toISOString(),
  };
}

function buildHeadline(ctx, auto, human) {
  if (auto.length === 0 && human.length === 0) {
    return 'Оптимизацията е актуална — продължете мониторинг.';
  }
  if (auto.length > 0 && human.length === 0) {
    return `${auto.length} автоматични действия готови за изпълнение.`;
  }
  const dnsOnly = human.length === 1 && human[0].gate === 'dns_cname';
  if (auto.length > 0 && dnsOnly) {
    return `${auto.length} auto + 1 DNS стъпка (единствената ръчна).`;
  }
  return `${auto.length} auto + ${human.length} точки за човешка преценка.`;
}
