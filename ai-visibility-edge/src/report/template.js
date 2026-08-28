/**
 * Client-facing strategy report — verdict + plan, not raw probe tables.
 */
import { buildStrategy } from '../diagnose/strategy.js';

export function renderReport(data) {
  const strategy = data.strategy ?? buildStrategy({
    probe: data.probe,
    passage: data.passage,
    diagnostic_score: data.diagnostic_score,
    displacement: data.displacement,
    sov: data.sov,
    tenant: data.tenant,
    registered: data.registered ?? true,
    questionCount: data.stats?.questionCount ?? 0,
    runCount: data.stats?.runCount ?? 0,
  });

  const { domain, generated_at = new Date().toISOString(), verdict, pillars, plan } = strategy;
  const score = strategy.score ?? data.diagnostic_score;

  const pillarRows = (pillars ?? [])
    .map(
      (p) => `
    <div class="pillar pillar-${p.level}">
      <span class="pillar-icon">${p.icon}</span>
      <div>
        <strong>${esc(p.label)}</strong>
        <p>${esc(p.status)}</p>
        <small>${esc(p.action)}</small>
      </div>
    </div>`,
    )
    .join('');

  const weekItems = (plan?.this_week ?? [])
    .map(
      (a) => `
    <li class="action priority-${a.priority}">
      <span class="step-num">${a.step}</span>
      <div>
        <strong>${esc(a.title)}</strong>
        <p>${esc(a.detail)}</p>
        <span class="owner">${a.owner === 'you' ? 'Ваша задача' : 'Система'}</span>
      </div>
    </li>`,
    )
    .join('');

  const monthItems = (plan?.this_month ?? [])
    .map(
      (a) => `
    <li class="action priority-${a.priority}">
      <span class="step-num">${a.step}</span>
      <div>
        <strong>${esc(a.title)}</strong>
        <p>${esc(a.detail)}</p>
      </div>
    </li>`,
    )
    .join('');

  const details = data.probe
    ? `
  <details class="tech-details">
    <summary>Технически детайли (за разработчици)</summary>
    <table>
      <tr><th>HTTP</th><td>${data.probe.http_status ?? '—'}</td></tr>
      <tr><th>Текст (chars)</th><td>${data.probe.html_text_chars ?? '—'}</td></tr>
      <tr><th>JSON-LD</th><td>${data.probe.jsonld_blocks ?? 0}</td></tr>
      <tr><th>robots</th><td>${esc(data.probe.robots_ai_policy ?? '—')}</td></tr>
      <tr><th>Canonical</th><td>${data.probe.has_canonical ? 'Да' : 'Не'}</td></tr>
    </table>
    ${
      data.displacement?.total_runs
        ? `<p>Изместване: ${data.displacement.displaced_count}/${data.displacement.total_runs} runs (${Math.round((data.displacement.displacement_rate ?? 0) * 100)}%)</p>`
        : ''
    }
    ${
      data.sov?.total_observations
        ? `<p>SOV: ${((data.sov.share ?? data.sov.sov ?? 0) * 100).toFixed(1)}% (${data.sov.tenant_citations ?? 0} цитата)</p>`
        : ''
    }
  </details>`
    : '';

  return `<!DOCTYPE html>
<html lang="bg">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Стратегия — ${esc(domain)}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1.25rem; color: #1a1a2e; line-height: 1.55; }
    h1 { font-size: 1.4rem; margin: 0 0 .25rem; }
    h2 { font-size: 1.05rem; margin: 2rem 0 .75rem; color: #444; }
    .meta { color: #666; font-size: .875rem; margin-bottom: 1.5rem; }
    .verdict { border-radius: 12px; padding: 1.25rem 1.5rem; margin: 1.5rem 0; }
    .verdict-critical { background: #fef2f2; border-left: 4px solid #dc2626; }
    .verdict-warning { background: #fffbeb; border-left: 4px solid #d97706; }
    .verdict-ok { background: #f0fdf4; border-left: 4px solid #16a34a; }
    .verdict-info, .verdict-unknown { background: #f0f9ff; border-left: 4px solid #0284c7; }
    .verdict h2 { margin: 0 0 .5rem; font-size: 1.15rem; color: inherit; }
    .verdict p { margin: 0; }
    .score { font-size: 2.5rem; font-weight: 700; color: ${scoreColor(score)}; margin: .5rem 0; }
    .score-label { font-size: .8rem; color: #666; }
    .pillars { display: grid; gap: .65rem; margin: 1rem 0; }
    .pillar { display: flex; gap: .75rem; padding: .75rem 1rem; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0; }
    .pillar-critical { border-color: #fecaca; background: #fef2f2; }
    .pillar-warning { border-color: #fde68a; background: #fffbeb; }
    .pillar-ok { border-color: #bbf7d0; background: #f0fdf4; }
    .pillar-icon { font-size: 1.25rem; }
    .pillar p { margin: .15rem 0; font-size: .9rem; }
    .pillar small { color: #64748b; font-size: .8rem; }
    .actions { list-style: none; padding: 0; margin: 0; }
    .action { display: flex; gap: .75rem; padding: .85rem 0; border-bottom: 1px solid #eee; }
    .step-num { flex-shrink: 0; width: 1.75rem; height: 1.75rem; background: #3b82f6; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: .8rem; font-weight: 600; }
    .action p { margin: .25rem 0 0; font-size: .875rem; color: #555; }
    .owner { font-size: .75rem; color: #888; text-transform: uppercase; letter-spacing: .03em; }
    .priority-high .step-num { background: #dc2626; }
    .tech-details { margin-top: 2rem; font-size: .85rem; color: #666; }
    .tech-details table { width: 100%; border-collapse: collapse; margin-top: .5rem; }
    .tech-details th, .tech-details td { text-align: left; padding: .35rem .5rem; border-bottom: 1px solid #eee; }
    footer { margin-top: 3rem; font-size: .8rem; color: #888; border-top: 1px solid #eee; padding-top: 1rem; }
  </style>
</head>
<body>
  <h1>Стратегия за AI видимост</h1>
  <p class="meta">${esc(domain)} · ${esc(String(generated_at).slice(0, 19))} UTC</p>

  <div class="verdict verdict-${verdict?.level ?? 'unknown'}">
    <p class="score">${score ?? '—'}<span class="score-label"> / 100</span></p>
    <h2>${esc(verdict?.headline ?? 'Анализ')}</h2>
    <p>${esc(verdict?.summary ?? '')}</p>
  </div>

  <h2>Къде сте сега</h2>
  <div class="pillars">${pillarRows}</div>

  <h2>Тази седмица</h2>
  <ol class="actions">${weekItems || '<li>Няма спешни задачи — продължете с мониторинга.</li>'}</ol>

  <h2>Този месец</h2>
  <ol class="actions">${monthItems || '<li>Натрупайте данни и повторете измерване.</li>'}</ol>

  ${details}

  <footer>AI Visibility Edge · Стратегия, не SEO одит — фокус върху как AI моделите ви виждат и цитират.</footer>
</body>
</html>`;
}

function scoreColor(score) {
  if (score == null) return '#666';
  if (score >= 70) return '#16a34a';
  if (score >= 40) return '#d97706';
  return '#dc2626';
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
