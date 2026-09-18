import { GITHUB_ACTIONS } from './dashboardData.js';
import { buildMetricInfoClientScript } from './metricInfo.js';

function infoBtn(metricId) {
  return `<button type="button" class="info-btn" data-metric="${metricId}" aria-label="Инфо">ⓘ</button>`;
}

export function renderDashboardPage(origin) {
  return `<!DOCTYPE html>
<html lang="bg">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AI Visibility — Стратегия</title>
  <style>${CSS}</style>
</head>
<body>
  <div class="app">
    <header class="topbar">
      <div class="topbar-brand">
        <h1>AI Visibility</h1>
        <p class="sub">Питаме AI дали ви препоръчва → показваме какво да оправите → повечето прави системата</p>
      </div>
      <div class="topbar-meta">
        <select id="site-select" aria-label="Избери сайт"></select>
        <button type="button" class="btn btn-ghost btn-sm" id="btn-add-toggle">+ Сайт</button>
      </div>
    </header>

    <section id="sites-bar" class="sites-bar hidden" aria-label="Вашите сайтове">
      <p class="sites-bar-title">Сайтове (<span id="sites-count">0</span>)</p>
      <ul id="sites-list" class="sites-list"></ul>
    </section>

    <section id="how-it-works" class="how-it-works" aria-label="Как работи">
      <p class="how-it-works-lead"><strong>Как работи (3 стъпки):</strong></p>
      <ol class="how-it-works-steps">
        <li><strong>🤖 Системата</strong> пита ChatGPT/Gemini с въпроси за вашата ниша и мери дали ви цитират.</li>
        <li><strong>📋 Планът</strong> казва какво не е наред — ясно кой прави какво: <span class="plan-legend-you">👤 Вие</span> (DNS, CMS) или <span class="plan-legend-ai">🤖 Системата</span> (анализ, Edge).</li>
        <li><strong>🚀 Стартирай</strong> или <strong>Авто-оптимизация</strong> — натиснете главния бутон; системата прави останалото, освен DNS и публикуване в сайта ви.</li>
      </ol>
    </section>

    <section id="add-panel" class="add-panel">
      <p class="lead" id="add-lead">Нов клиент: въведете домейн и марка — системата прави останалото (AI анализ, план, measure).</p>
      <form id="add-site-form" class="form-grid">
        <label>Домейн <input name="domain" type="text" placeholder="example.com" required></label>
        <label>Марка <input name="name" type="text" placeholder="Example" required></label>
        <label>Вертикал <input name="vertical_name" type="text" placeholder="SaaS / e-commerce"></label>
        <div class="toolbar">
          <button type="submit" class="btn">Добави</button>
          <button type="button" class="btn" id="btn-add-run">Добави + анализ</button>
        </div>
      </form>
      <div id="add-result" class="msg hidden"></div>
    </section>

    <section id="verdict" class="verdict verdict-unknown">
      <div class="verdict-top">
        <span id="score" class="score">${infoBtn('diagnostic_score')}<span id="score-val">—</span></span>
        <div class="verdict-text">
          <h2 id="verdict-headline">Изберете сайт или добавете нов</h2>
          <p id="verdict-summary" class="sub">Системата ще покаже вердикт и какво да направите следващо.</p>
          <p id="last-measured" class="last-measured sub hidden"></p>
        </div>
      </div>
    </section>

    <section id="blocker-banner" class="blocker-banner hidden" aria-live="polite">
      <span class="blocker-icon">🚨</span>
      <div class="blocker-body">
        <strong id="blocker-title">Блокер</strong>
        <p id="blocker-detail" class="sub">…</p>
      </div>
      <button type="button" class="btn btn-sm" id="btn-blocker-fix">Поправи</button>
    </section>

    <section id="journey-bar" class="journey-bar hidden" aria-label="Път на оптимизация">
      <div class="journey-phases" id="journey-phases"></div>
      <p id="journey-focus" class="journey-focus sub">—</p>
    </section>

    <section id="playbook-panel" class="playbook-panel hidden" aria-label="AI playbook за клиента">
      <div class="playbook-head">
        <span id="playbook-path-badge" class="playbook-badge">—</span>
        <span id="playbook-level" class="playbook-level sub">—</span>
      </div>
      <p id="playbook-summary" class="sub">—</p>
      <p id="playbook-ai-rationale" class="playbook-rationale sub hidden"></p>
      <div id="playbook-phases" class="playbook-phases"></div>
    </section>

    <section id="activity-panel" class="activity-panel hidden" aria-live="polite">
      <div class="activity-head">
        <span id="activity-status-icon" class="activity-icon" aria-hidden="true">⏳</span>
        <div class="activity-body">
          <strong id="activity-title">Последна операция</strong>
          <p id="activity-detail" class="sub">—</p>
        </div>
        <div class="activity-actions">
          <button type="button" class="btn btn-sm" id="btn-activity-retry" hidden>Повтори</button>
          <button type="button" class="btn btn-sm btn-ghost" id="btn-activity-dismiss" aria-label="Затвори">×</button>
        </div>
      </div>
      <ul id="activity-metrics" class="activity-metrics hidden"></ul>
      <p id="activity-next" class="activity-next sub hidden"></p>
      <ul id="activity-history" class="activity-history hidden" aria-label="Последни операции"></ul>
    </section>

    <section id="insights-panel" class="insights-panel hidden" aria-label="AI позициониране">
      <h3 class="insights-title">Как AI ви вижда ${infoBtn('sov')}</h3>
      <div class="insights-grid">
        <div class="insight-card" id="insight-sov">
          <span class="insight-label">AI-SOV ${infoBtn('sov')}</span>
          <strong id="insight-sov-val" class="insight-val">—</strong>
          <small id="insight-sov-note" class="sub">дял в отговорите</small>
        </div>
        <div class="insight-card" id="insight-displacement">
          <span class="insight-label">Изместване ${infoBtn('displacement_rate')}</span>
          <strong id="insight-disp-val" class="insight-val">—</strong>
          <small id="insight-disp-note" class="sub">конкуренти вместо вас</small>
        </div>
        <div class="insight-card" id="insight-citations">
          <span class="insight-label">Цитати ${infoBtn('observations')}</span>
          <strong id="insight-cite-val" class="insight-val">—</strong>
          <small id="insight-cite-note" class="sub">качество</small>
        </div>
      </div>
      <div id="displacement-examples" class="displacement-examples hidden">
        <p class="sub insight-examples-title">Примери — AI дава други марки:</p>
        <ul id="displacement-list" class="displacement-list"></ul>
      </div>
    </section>

    <section id="work-hub" class="work-hub" aria-label="Действия и план">
      <div class="command-center">
        <div class="command-primary">
          <button type="button" class="btn btn-lg" id="btn-primary-action">🚀 Стартирай</button>
          <p id="command-hint" class="command-hint sub">Изберете сайт за препоръка какво да направите.</p>
        </div>
        <details class="command-more" id="command-more">
          <summary>Още</summary>
          <div class="command-more-grid">
            <button type="button" class="btn btn-ghost btn-sm" id="btn-auto-optimize">Авто-оптимизация</button>
            <button type="button" class="btn btn-ghost btn-sm" id="btn-reprocess">Провери цитатите</button>
            <a class="btn btn-ghost btn-sm" id="btn-report" href="#" target="_blank" rel="noopener">PDF отчет</a>
          </div>
        </details>
      </div>

      <section id="unified-plan" class="unified-plan hidden" aria-label="План">
        <div class="findings-head">
          <h3 class="findings-subhead">📋 План за <span id="plan-domain">—</span></h3>
          <div class="manual-head-actions">
            <button type="button" class="btn btn-sm btn-ghost" id="btn-export-manual" title="Текстов файл за администратора на сайта">📥 Експорт .txt</button>
            <span id="plan-count-badge" class="advisor-badge">—</span>
          </div>
        </div>
        <p id="plan-summary" class="findings-summary sub hidden">…</p>
        <p id="plan-honesty" class="plan-honesty sub hidden" aria-live="polite">…</p>
        <div class="plan-legend" aria-hidden="false">
          <span class="plan-legend-you">👤 Вие</span> CMS, DNS, публикуване
          <span class="plan-legend-sep">·</span>
          <span class="plan-legend-ai">🤖 Системата</span> анализ, drafts, Edge
        </div>
        <ol id="unified-plan-list" class="unified-plan-list"></ol>
        <details id="plan-done-wrap" class="roadmap-done-wrap hidden">
          <summary id="plan-done-summary">Готови стъпки</summary>
          <ol id="unified-plan-done" class="unified-plan-list unified-plan-list-compact"></ol>
        </details>
      </section>
      <div id="manual-workbench" class="hidden" aria-hidden="true"></div>
      <ul id="manual-task-list" class="hidden" aria-hidden="true"></ul>
      <section id="findings-panel" class="hidden" aria-hidden="true"><ul id="findings-list"></ul></section>
      <ol id="roadmap-steps" class="hidden" aria-hidden="true"></ol>
    </section>

    <div id="pillars" class="hidden" aria-hidden="true"></div>

    <div id="site-stats" class="hidden" aria-hidden="true">
      <strong id="stat-runs">—</strong>
      <strong id="stat-obs">—</strong>
      <strong id="stat-sov">—</strong>
      <strong id="stat-pending">—</strong>
    </div>

    <p id="status-line" class="status-line hidden" aria-hidden="true">…</p>

    <ol id="plan-week" class="hidden" aria-hidden="true"></ol>

    <details class="extra edge-dns-wrap hidden" id="edge-dns-wrap">
      <summary>Edge &amp; DNS (само ако е нужен)</summary>
      <div class="extra-body extra-tech-body">
        <section class="tech-block edge-panel" id="edge-panel">
          <div class="tech-block-head">
            <h4>Edge прокси</h4>
            <span id="edge-status-badge" class="advisor-badge">…</span>
          </div>
          <div id="edge-verdict" class="edge-verdict sub">—</div>
          <ul id="edge-fixes" class="edge-fix-list"></ul>
          <ul id="edge-prereq" class="edge-prereq-list"></ul>
          <div class="edge-actions">
            <button type="button" class="btn btn-sm" id="btn-edge-activate">Приложи Edge</button>
            <button type="button" class="btn btn-sm btn-ghost" id="btn-cf-aeo">CF AEO</button>
            <button type="button" class="btn btn-sm btn-ghost" id="btn-edge-smoke">Smoke test</button>
          </div>
          <div id="edge-smoke-panel" class="edge-smoke-panel hidden">
            <p class="sub"><strong id="edge-smoke-level">—</strong> <span id="edge-smoke-score"></span></p>
            <ul id="edge-smoke-checks" class="edge-smoke-list"></ul>
          </div>
        </section>
        <section id="onboarding-panel" class="tech-block onboarding hidden">
          <h4>CNAME / DNS</h4>
          <ol id="onboarding-steps" class="onboarding-list"></ol>
          <div id="onboarding-dns" class="onboarding-dns-guide">…</div>
        </section>
      </div>
    </details>

    <details class="extra operator-panel">
      <summary>За оператори</summary>
      <div class="extra-body">
        <section id="baseline-banner" class="baseline-banner hidden">
          <strong>Baseline</strong>
          <p id="baseline-msg" class="sub">…</p>
        </section>
        <section id="drift-panel" class="drift-panel hidden">
          <span id="drift-badge" class="advisor-badge">—</span>
          <ul id="drift-alerts" class="drift-list"></ul>
        </section>
        <p class="sub" id="auth-hint">…</p>
        <label class="admin-token-label">ADMIN_TOKEN
          <input type="password" id="admin-token" placeholder="Bearer token" autocomplete="off">
        </label>
        <button type="button" class="btn btn-sm" id="btn-save-token">Запази token</button>
        <span id="advisor-badge" class="advisor-badge hidden" aria-hidden="true">—</span>
        <div id="cache-index-panel" class="hidden" aria-hidden="true">
          <strong id="cache-median">—</strong>
          <strong id="cache-p25">—</strong>
          <strong id="cache-p75">—</strong>
          <strong id="cache-coverage-badge">—</strong>
          <strong id="stat-bot-v">—</strong>
          <strong id="stat-bot-u">—</strong>
          <p id="cache-note">—</p>
        </div>
        <pre id="tech-detail" class="tech-detail-pre">—</pre>
      </div>
    </details>
    <div id="questions-list" class="hidden" aria-hidden="true"></div>
    <button type="button" id="btn-gen-q" class="hidden" aria-hidden="true"></button>

    <footer class="foot">AI Visibility Edge · <code>${esc(origin)}</code></footer>
  </div>
  <div id="metric-modal" class="metric-modal hidden" role="dialog" aria-labelledby="metric-modal-title" aria-modal="true">
    <div class="metric-modal-backdrop" id="metric-modal-backdrop"></div>
    <div class="metric-modal-box">
      <button type="button" class="metric-modal-close" id="metric-modal-close" aria-label="Затвори">×</button>
      <h3 id="metric-modal-title"></h3>
      <dl class="metric-dl">
        <dt>Какво е</dt>
        <dd id="metric-modal-what"></dd>
        <dt>Какво значи сега</dt>
        <dd id="metric-modal-now" class="metric-now"></dd>
        <dt>Защо е важно</dt>
        <dd id="metric-modal-why"></dd>
      </dl>
    </div>
  </div>
  <div id="operation-modal" class="operation-modal hidden" role="dialog" aria-labelledby="operation-modal-title" aria-modal="true" aria-live="polite">
    <div class="operation-modal-backdrop" id="operation-modal-backdrop"></div>
    <div class="operation-modal-box">
      <div class="operation-spinner" aria-hidden="true"></div>
      <h3 id="operation-modal-title">Операция</h3>
      <p id="operation-modal-status" class="operation-status">…</p>
      <ul id="operation-modal-steps" class="operation-steps hidden"></ul>
    </div>
  </div>
  <script>${script(origin)}</script>
</body>
</html>`;
}

function script(origin) {
  return `
    ${buildMetricInfoClientScript()}
    const ORIGIN = ${JSON.stringify(origin)};
    const API = (p) => ORIGIN + p;
    const ADMIN_KEY = 'aiv_admin_token';

    let sites = [];
    let selectedDomain = '';
    let strategy = null;
    let busy = false;
    let adminRequired = false;

    const metricContext = {};

    const $ = (id) => document.getElementById(id);

    function setMetricContext(id, ctx) {
      metricContext[id] = Object.assign({}, metricContext[id] || {}, ctx);
    }

    function openMetricInfo(id) {
      const m = METRIC_CATALOG[id];
      if (!m) return;
      const ctx = metricContext[id] || {};
      const titleEl = $('metric-modal-title');
      const whatEl = $('metric-modal-what');
      const whyEl = $('metric-modal-why');
      const nowEl = $('metric-modal-now');
      const modalEl = $('metric-modal');
      if (!titleEl || !whatEl || !whyEl || !nowEl || !modalEl) return;
      titleEl.textContent = (m.icon ? m.icon + ' ' : '') + m.title;
      whatEl.textContent = m.what;
      whyEl.textContent = m.why;
      nowEl.textContent = interpretMetricNow(id, ctx);
      modalEl.classList.remove('hidden');
    }

    function closeMetricInfo() {
      $('metric-modal')?.classList.add('hidden');
    }

    function showOperationModal(title, status, steps) {
      const modal = $('operation-modal');
      if (!modal) return;
      modal.classList.remove('hidden', 'operation-error', 'operation-done');
      $('operation-modal-title').textContent = title || 'Операция';
      $('operation-modal-status').textContent = status || 'Стартиране…';
      const stepsEl = $('operation-modal-steps');
      if (steps?.length) {
        stepsEl.classList.remove('hidden');
        stepsEl.innerHTML = steps.map((s, i) =>
          '<li class="operation-step" data-step="' + i + '">' + escHtml(s) + '</li>'
        ).join('');
      } else {
        stepsEl.classList.add('hidden');
        stepsEl.innerHTML = '';
      }
      document.body.classList.add('operation-busy');
    }

    function setOperationStatus(status, opts = {}) {
      const el = $('operation-modal-status');
      if (el && status) el.textContent = status;
      const modal = $('operation-modal');
      if (!modal) return;
      if (opts.error) modal.classList.add('operation-error');
      if (opts.done) modal.classList.add('operation-done');
      if (opts.stepIndex != null) {
        $('operation-modal-steps')?.querySelectorAll('.operation-step').forEach((li, i) => {
          li.classList.toggle('done', i < opts.stepIndex);
          li.classList.toggle('active', i === opts.stepIndex);
        });
      }
    }

    function hideOperationModal() {
      $('operation-modal')?.classList.add('hidden');
      document.body.classList.remove('operation-busy');
    }

    let lastActivityRetry = null;
    let lastEdgeDecision = null;
    let optimizerRoadmap = null;
    let lastApplyPlan = null;

    const PRODUCT_PHASES = [
      { id: 'technical', label: 'Техника', hint: 'Може ли AI да прочете сайта' },
      { id: 'measurement', label: 'Измерване', hint: 'Питаме моделите и броим цитати' },
      { id: 'positioning', label: 'Позиция', hint: 'Препоръчват ли ви или конкурент' },
      { id: 'dominance', label: 'Лидерство', hint: 'Следим и подобряваме автоматично' },
    ];
    const PHASE_ORDER = PRODUCT_PHASES.map(p => p.id);
    const OP_HISTORY_KEY = 'aiv_op_history';
    const MAX_OP_HISTORY = 3;

    function normPlanTitle(t) {
      return String(t || '').toLowerCase().replace(/\s+/g, ' ').trim();
    }

    function planSeverityRank(sev) {
      return { critical: 0, warning: 1, info: 2 }[sev] ?? 3;
    }

    function planRoadmapRank(status) {
      return { current: 0, waiting_manual: 1, waiting_auto: 2, blocked: 3, done: 9 }[status] ?? 5;
    }

    function computePlanPending(strategyData, applyPlan, roadmap) {
      const manualTasks = mergeApplyManualTasks(strategyData?.manual_tasks ?? [], applyPlan);
      const autoFindings = (strategyData?.findings ?? []).filter(f => {
        const a = f.automation || {};
        return a.mode === 'auto' && !a.manual_form?.fields?.length;
      });
      const activeRoadmap = (roadmap?.steps ?? []).filter(s => s.status !== 'done');
      return { manualTasks, autoFindings, activeRoadmap };
    }

    function edgeIsNeeded(decision, strategyData) {
      if (decision?.edge_active) return true;
      if (decision && !decision.error) {
        if ((decision.fixes?.length ?? 0) > 0) return true;
        if (decision.status === 'pending_cname') return true;
      }
      return (strategyData?.findings ?? []).some(f => f.automation?.action === 'activate_edge');
    }

    function applyContextualVisibility() {
      const needed = edgeIsNeeded(lastEdgeDecision, strategy);
      $('edge-dns-wrap')?.classList.toggle('hidden', !needed);
    }

    function roadmapActorLabel(step) {
      if (step.status === 'done') return '✓ Готово';
      if (step.status === 'waiting_manual' || step.status === 'manual') return '👤 Вие правите';
      if (step.status === 'waiting_auto') return '🤖 Системата';
      if (step.status === 'current') return '▶ Сега';
      return '📋 Ред';
    }

    function renderJourneyBar(strategyData) {
      const panel = $('journey-bar');
      if (!strategyData?.registered && !strategyData?.probe) {
        panel.classList.add('hidden');
        return;
      }
      panel.classList.remove('hidden');
      const current = strategyData.product_phase || 'technical';
      const currentIdx = Math.max(0, PHASE_ORDER.indexOf(current));
      const baselineDone = Boolean(strategyData.technical_baseline?.complete);
      const hasRuns = (strategyData.stats?.runCount ?? 0) > 0;

      function journeyPhaseState(phaseId, idx) {
        if (phaseId === 'technical' && baselineDone && currentIdx > 0) return 'done';
        if (phaseId === 'measurement' && hasRuns && currentIdx > 1) return 'done';
        if (idx < currentIdx) return 'done';
        if (idx === currentIdx) return 'current';
        return 'future';
      }

      $('journey-phases').innerHTML = PRODUCT_PHASES.map((phase, idx) => {
        const state = journeyPhaseState(phase.id, idx);
        const icon = state === 'done' ? '✓' : state === 'current' ? '●' : '○';
        return '<div class="journey-phase journey-' + state + '" data-phase="' + phase.id + '">' +
          '<span class="journey-icon" aria-hidden="true">' + icon + '</span>' +
          '<span class="journey-label">' + escHtml(phase.label) + '</span>' +
          '<small class="journey-hint">' + escHtml(phase.hint) + '</small></div>';
      }).join('');
      $('journey-focus').textContent = strategyData.phase_focus || strategyData.verdict?.summary || '—';
    }

    function pushOpHistory(entry) {
      if (!selectedDomain) return;
      const all = JSON.parse(sessionStorage.getItem(OP_HISTORY_KEY) || '[]');
      const row = {
        domain: selectedDomain,
        title: entry.title,
        status: entry.status,
        detail: entry.detail || '',
        at: new Date().toISOString(),
      };
      const domainRows = [row, ...all.filter(r => r.domain === selectedDomain)].slice(0, MAX_OP_HISTORY);
      const other = all.filter(r => r.domain !== selectedDomain);
      sessionStorage.setItem(OP_HISTORY_KEY, JSON.stringify([...domainRows, ...other].slice(0, MAX_OP_HISTORY * 4)));
      renderOperationHistory();
    }

    function renderOperationHistory() {
      const el = $('activity-history');
      const list = JSON.parse(sessionStorage.getItem(OP_HISTORY_KEY) || '[]')
        .filter(r => r.domain === selectedDomain)
        .slice(0, MAX_OP_HISTORY);
      if (!el || !selectedDomain || !list.length) {
        el?.classList.add('hidden');
        return;
      }
      el.classList.remove('hidden');
      el.innerHTML = list.map(r => {
        const icon = r.status === 'ok' ? '✓' : r.status === 'error' ? '✕' : '⏳';
        const when = new Date(r.at).toLocaleString('bg-BG', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        return '<li class="activity-history-item activity-history-' + r.status + '">' +
          icon + ' <strong>' + escHtml(r.title) + '</strong> · ' + escHtml(when) +
          '</li>';
      }).join('');
    }

    function snapshotDashboardMetrics() {
      return {
        score: strategy?.score ?? null,
        runs: $('stat-runs')?.textContent?.trim() || '—',
        obs: $('stat-obs')?.textContent?.trim() || '—',
        sov: $('insight-sov-val')?.textContent?.trim() || '—',
        disp: $('insight-disp-val')?.textContent?.trim() || '—',
        phase: strategy?.product_phase ?? null,
      };
    }

    function buildMetricsDelta(before, after, result) {
      const rows = [];
      if (!before || !after) return rows;
      if (before.score !== after.score && after.score != null) {
        rows.push({ label: 'Оценка', value: (before.score ?? '—') + ' → ' + after.score });
      }
      if (before.runs !== after.runs) rows.push({ label: 'AI отговори', value: before.runs + ' → ' + after.runs });
      if (before.obs !== after.obs) rows.push({ label: 'Цитати', value: before.obs + ' → ' + after.obs });
      if (before.sov !== after.sov) rows.push({ label: 'AI-SOV', value: before.sov + ' → ' + after.sov });
      if (before.disp !== after.disp) rows.push({ label: 'Изместване', value: before.disp + ' → ' + after.disp });
      if (result?.pipeline_runs != null) rows.push({ label: 'Нови runs', value: String(result.pipeline_runs) });
      if (result?.observations != null) rows.push({ label: 'Цитати (obs.)', value: String(result.observations) });
      if (result?.executed?.length) rows.push({ label: 'Изпълнено', value: result.executed.join(', ') });
      return rows;
    }

    function pickActivityNextHint() {
      if (!strategy) return 'Прегледайте плана и AI метриките по-горе.';
      const phase = strategy.product_phase;
      if (phase === 'measurement') return 'Следва: пълен AI анализ — натиснете отново главния бутон.';
      if (phase === 'positioning') return 'Следва: situational въпроси и content срещу конкуренти (вижте плана).';
      if (phase === 'technical') return 'Следва: поправете техническите задачи, после remeasure.';
      return strategy.phase_focus || strategy.verdict?.summary || 'Monitor и remeasure след 2–4 седмици.';
    }

    function recordActivity({ title, status, detail, metrics, nextHint, retryFn }) {
      const panel = $('activity-panel');
      if (!panel) return;
      panel.classList.remove('hidden', 'activity-ok', 'activity-error', 'activity-running');
      panel.classList.add('activity-' + (status === 'ok' ? 'ok' : status === 'error' ? 'error' : 'running'));
      $('activity-status-icon').textContent = status === 'ok' ? '✓' : status === 'error' ? '✕' : '⏳';
      $('activity-title').textContent = title;
      $('activity-detail').textContent = detail || '';
      const metricsEl = $('activity-metrics');
      if (metrics?.length) {
        metricsEl.classList.remove('hidden');
        metricsEl.innerHTML = metrics.map((m) =>
          '<li><span class="activity-metric-label">' + escHtml(m.label) + '</span>' +
          '<strong class="activity-metric-val">' + escHtml(m.value) + '</strong></li>'
        ).join('');
      } else {
        metricsEl.classList.add('hidden');
        metricsEl.innerHTML = '';
      }
      const nextEl = $('activity-next');
      if (nextHint) {
        nextEl.classList.remove('hidden');
        nextEl.textContent = '▸ ' + nextHint;
      } else {
        nextEl.classList.add('hidden');
      }
      lastActivityRetry = retryFn || null;
      const retryBtn = $('btn-activity-retry');
      if (retryFn && status === 'error') {
        retryBtn.hidden = false;
        retryBtn.onclick = () => retryFn();
      } else {
        retryBtn.hidden = true;
      }
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      if (status === 'ok' || status === 'error') {
        pushOpHistory({ title, status, detail: detail || '' });
      }
    }

    async function withOperation(title, initialStatus, fn, steps, options = {}) {
      if (busy) return;
      busy = true;
      showOperationModal(title, initialStatus, steps);
      recordActivity({ title, status: 'running', detail: initialStatus });
      const setStatus = (msg, opts) => setOperationStatus(msg, opts);
      const before = options.trackMetrics !== false ? snapshotDashboardMetrics() : null;
      try {
        const result = await fn(setStatus);
        setOperationStatus('Готово ✓', { done: true });
        await new Promise((r) => setTimeout(r, 500));
        if (options.refresh !== false) {
          await loadSiteStats().catch(() => {});
        }
        const after = before ? snapshotDashboardMetrics() : null;
        const metrics = buildMetricsDelta(before, after, result);
        let okDetail = (typeof options.successDetail === 'function' ? options.successDetail(result) : options.successDetail) ||
          'Операцията приключи — данните по-горе са обновени.';
        if (before && after && !metrics.length && options.trackMetrics !== false) {
          okDetail += ' Видимите метрики не се промениха — ако очаквахте промяна, проверете плана или повторете след CMS/DNS.';
        }
        recordActivity({
          title,
          status: 'ok',
          detail: okDetail,
          metrics,
          nextHint: (typeof options.nextHint === 'function' ? options.nextHint(result) : options.nextHint) ||
            pickActivityNextHint(),
          retryFn: options.retry,
        });
        return result;
      } catch (e) {
        setOperationStatus('Грешка: ' + e.message, { error: true });
        recordActivity({
          title,
          status: 'error',
          detail: e.message,
          retryFn: options.retry,
          nextHint: 'Проверете Admin token, мрежа, или натиснете „Повтори“.',
        });
        await new Promise((r) => setTimeout(r, 1800));
        throw e;
      } finally {
        hideOperationModal();
        busy = false;
      }
    }

    async function exportManualRecommendations() {
      if (!selectedDomain) {
        log('Изберете сайт за експорт');
        return;
      }
      return withOperation('Експорт на ръчни препоръки', 'Събиране на задачи и drafts…', async (setStatus) => {
        setStatus('Генериране на текстов файл…');
        const res = await fetch(API('/api/strategy/' + encodeURIComponent(selectedDomain) + '/manual-export'));
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || data.hint || String(res.status));
        }
        const blob = await res.blob();
        const disp = res.headers.get('Content-Disposition') || '';
        const match = disp.match(/filename="([^"]+)"/);
        const filename = match ? match[1] : 'aiv-rachni-preporuki.txt';
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        log('Изтеглен файл: ' + filename);
        setStatus('Файлът е изтеглен: ' + filename, { done: true });
        return { filename };
      }, null, {
        retry: () => exportManualRecommendations(),
        successDetail: (data) => 'Изтеглен файл: ' + (data?.filename || 'aiv-rachni-preporuki.txt'),
        trackMetrics: false,
      });
    }

    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.info-btn');
      if (btn?.dataset?.metric) {
        e.preventDefault();
        e.stopPropagation();
        openMetricInfo(btn.dataset.metric);
        return;
      }
      if (e.target.id === 'metric-modal-backdrop' || e.target.id === 'metric-modal-close') {
        closeMetricInfo();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMetricInfo();
    });

    function getAdminToken() {
      return sessionStorage.getItem(ADMIN_KEY) || '';
    }

    function setAdminToken(value) {
      const v = String(value || '').trim();
      if (v) sessionStorage.setItem(ADMIN_KEY, v);
      else sessionStorage.removeItem(ADMIN_KEY);
    }

    async function apiFetch(path, opts = {}) {
      const headers = { ...(opts.headers || {}) };
      if (opts.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
      const token = getAdminToken();
      if (token) headers['Authorization'] = 'Bearer ' + token;
      return fetch(API(path), { ...opts, headers });
    }

    function authErrorHint(res, data) {
      if (res.status === 401) return data?.hint || 'Нужен ADMIN_TOKEN (🔐 Admin достъп)';
      if (data?.error === 'domain_exists' && data?.domain) {
        return data.domain + ' вече е в системата';
      }
      return data?.error || data?.hint || res.status;
    }

    function siteSelectLabel(s) {
      let label = s.domain;
      if (s.is_pilot) label += ' (pilot)';
      if (s.status && s.status !== 'active') label += ' [' + s.status + ']';
      return label;
    }

    function applySelectedSite(domain, reload) {
      selectedDomain = domain;
      const sel = $('site-select');
      if (sel) sel.value = domain;
      $('sites-list')?.querySelectorAll('.site-chip').forEach(el => {
        const active = el.dataset.domain === domain;
        el.classList.toggle('site-chip-active', active);
        el.setAttribute('aria-current', active ? 'true' : 'false');
      });
      if (reload) {
        renderOperationHistory();
        loadStrategy();
        loadEdgeDecision();
        loadSiteStats();
        loadOnboarding();
      }
    }

    async function loadAuthStatus() {
      try {
        const res = await fetch(API('/api/auth/status'));
        const data = await res.json();
        adminRequired = Boolean(data.admin_required);
        $('auth-hint').textContent = data.hint || '';
        const saved = getAdminToken();
        if (saved) $('admin-token').value = saved;
      } catch {
        $('auth-hint').textContent = 'Auth status offline';
      }
    }

    async function loadBaselineStatus() {
      const banner = $('baseline-banner');
      const msg = $('baseline-msg');
      try {
        const res = await fetch(API('/api/baseline/status'));
        const data = await res.json();
        if (data.ready && (data.block_0_1 === 'closed' || data.block_0_1 === 'pilot_closed')) {
          banner.classList.add('hidden');
          return;
        }
        banner.classList.remove('hidden');
        const models = (data.models_collected || []).join(', ') || '—';
        const gate = data.block_0_1 || data.status || '?';
        msg.textContent = 'Baseline ' + (data.baseline_id || '') + ': ' + gate +
          ', models=[' + models + ']. Action: GitHub aiv-baseline-collect или npm run baseline:seed-fixtures -- --limit 5';
        setMetricContext('baseline_gate', { message: msg.textContent });
      } catch {
        banner.classList.remove('hidden');
        msg.textContent = 'Baseline статус недостъпен — проверете deploy.';
      }
    }

    async function loadDriftStatus() {
      const panel = $('drift-panel');
      try {
        const res = await fetch(API('/api/drift/status'));
        const data = await res.json();
        if (!res.ok) { panel.classList.add('hidden'); return; }
        const badge = $('drift-badge');
        if (data.ok && !data.warning) {
          panel.classList.add('hidden');
          return;
        }
        panel.classList.remove('hidden');
        badge.textContent = data.critical ? data.critical + ' critical' : data.warning + ' warn';
        badge.className = 'advisor-badge ' + (data.critical ? 'warn' : '');
        $('drift-alerts').innerHTML = (data.alerts || []).slice(0, 6).map(a =>
          '<li class="drift-item drift-' + a.severity + '">' +
          '<span class="drift-kind">' + escHtml(a.kind) + '</span> ' +
          escHtml(a.message) + '</li>'
        ).join('') || '<li class="sub">—</li>';
        setMetricContext('drift', {
          critical: data.critical,
          message: (data.alerts || []).slice(0, 2).map(a => a.message).join('; ') || 'Има drift аларми.',
        });
      } catch {
        panel.classList.add('hidden');
      }
    }

    function log(msg) {
      $('status-line').textContent = msg;
    }

    function escHtml(s) {
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    async function loadSites() {
      const res = await fetch(API('/api/sites?include_pilot=1'));
      const data = await res.json();
      sites = data.sites || [];
      const sel = $('site-select');
      const addPanel = $('add-panel');
      const addLead = $('add-lead');
      const sitesBar = $('sites-bar');
      const sitesList = $('sites-list');
      const sitesCount = $('sites-count');
      if (!sites.length) {
        sel.innerHTML = '<option value="">— добавете сайт —</option>';
        selectedDomain = '';
        sitesBar?.classList.add('hidden');
        if (sitesList) sitesList.innerHTML = '';
        addPanel.classList.remove('hidden');
        addLead.textContent = 'Няма регистрирани сайтове. Добавете домейн по-долу — това е единственият вход.';
        $('btn-primary-action').disabled = true;
        $('verdict-headline').textContent = 'Добавете първи сайт';
        $('verdict-summary').textContent = 'Домейн, марка, вертикал — след това „Добави + анализ“.';
        return;
      }
      sitesBar?.classList.remove('hidden');
      if (sitesCount) sitesCount.textContent = String(data.total ?? sites.length);
      if (sitesList) {
        sitesList.innerHTML = sites.map(s =>
          '<li><button type="button" class="site-chip' +
          (s.domain === selectedDomain ? ' site-chip-active' : '') +
          '" data-domain="' + escHtml(s.domain) + '" aria-current="' +
          (s.domain === selectedDomain ? 'true' : 'false') + '">' +
          escHtml(s.domain) +
          (s.is_pilot ? ' <span class="site-badge-pilot">pilot</span>' : '') +
          (s.status && s.status !== 'active'
            ? ' <span class="site-badge-status">' + escHtml(s.status) + '</span>'
            : '') +
          '</button></li>'
        ).join('');
        sitesList.querySelectorAll('.site-chip').forEach(btn => {
          btn.onclick = () => applySelectedSite(btn.dataset.domain, true);
        });
      }
      if (sites.length && addPanel.classList.contains('hidden')) {
        addLead.textContent = 'Нов клиент: въведете домейн и марка — системата прави останалото (AI анализ, план, measure).';
      }
      $('btn-primary-action').disabled = false;
      sel.innerHTML = sites.map(s =>
        '<option value="' + escHtml(s.domain) + '">' + escHtml(siteSelectLabel(s)) + '</option>'
      ).join('');
      if (!selectedDomain || !sites.find(s => s.domain === selectedDomain)) {
        selectedDomain = sites[0].domain;
      }
      sel.value = selectedDomain;
      sitesList?.querySelectorAll('.site-chip').forEach(el => {
        const active = el.dataset.domain === selectedDomain;
        el.classList.toggle('site-chip-active', active);
        el.setAttribute('aria-current', active ? 'true' : 'false');
      });
      sel.onchange = () => applySelectedSite(sel.value, true);
    }

    const GATE_LABELS = {
      dns_cname: 'CNAME / DNS',
      cms_publish: 'Текст в CMS',
      strategic_review: 'Преглед на Edge',
    };

    const ACTION_HINT_LABELS = {
      run_analysis: '→ главният бутон „Пълен анализ“',
      run_auto_optimizer: '→ „Авто-оптимизация“',
      activate_edge: '→ „Edge прокси“',
      reprocess: '→ „Провери цитатите“',
      generate_questions: '→ „Авто-генерирай“ въпроси',
      add_site: '→ „+ Сайт“',
      cname_dns: '→ DNS панел + „Обнови данни“',
      publish_cms: '→ единния план + CMS',
    };

    function htmlRoadmapStep(s, compact) {
      const why = s.why_waiting && !compact
        ? '<p class="roadmap-why">' + escHtml(s.why_waiting) + '</p>'
        : '';
      const instr = (!compact && (s.instructions || []).length)
        ? '<ol class="roadmap-instr">' + s.instructions.map(i => '<li>' + escHtml(i) + '</li>').join('') + '</ol>'
        : '';
      return '<li class="unified-plan-item roadmap-step ' + escHtml(s.status_css) + (compact ? ' unified-plan-compact' : '') + '" data-kind="roadmap">' +
        '<div class="unified-plan-head">' +
        '<span class="unified-kind-badge">' + escHtml(roadmapActorLabel(s)) + '</span>' +
        '<span class="roadmap-icon">' + s.status_icon + '</span>' +
        '<div class="unified-plan-body">' +
        '<strong>' + escHtml(s.title) + '</strong>' +
        '<span class="roadmap-meta">' + escHtml(s.status_label) + '</span>' +
        (compact ? '' : '<p class="roadmap-summary">' + escHtml(s.summary) + '</p>') +
        why + instr +
        '</div></div></li>';
    }

    function htmlManualGuideBlock(guide) {
      if (!guide) return '';
      const fields = (guide.fields || []).length
        ? '<table class="manual-guide-fields"><thead><tr><th>Поле</th><th>Стойност</th></tr></thead><tbody>' +
          guide.fields.map(f =>
            '<tr><td>' + escHtml(f.label) + '</td><td><code class="manual-guide-val">' + escHtml(f.value) + '</code>' +
            (f.note ? ' <span class="sub">' + escHtml(f.note) + '</span>' : '') + '</td></tr>'
          ).join('') + '</tbody></table>'
        : '';
      const steps = (guide.steps || []).length
        ? '<ol class="manual-guide-steps">' + guide.steps.map(s => '<li>' + escHtml(s) + '</li>').join('') + '</ol>'
        : '';
      const after = (guide.after || []).length
        ? '<p class="manual-guide-after"><strong>След това:</strong> ' + escHtml(guide.after.join(' · ')) + '</p>'
        : '';
      return '<details class="manual-guide" open>' +
        '<summary>📍 Къде и как (' + escHtml(guide.title || 'ръчна стъпка') + ')</summary>' +
        '<p class="manual-guide-where"><strong>Къде:</strong> ' + escHtml(guide.where || '') + '</p>' +
        steps + fields + after +
        '</details>';
    }

    function htmlManualTaskCard(t) {
      const sev = t.severity === 'critical' ? 'finding-critical' : (t.severity === 'warning' ? 'finding-warning' : '');
      const guideBlock = t.manual_form?.guide ? htmlManualGuideBlock(t.manual_form.guide) : '';
      const artifactBlock = t.artifact?.content
        ? '<div class="manual-artifact-wrap">' +
          '<div class="manual-artifact-head">' +
          '<span class="sub">' + escHtml(t.artifact.title || 'Draft') + '</span>' +
          '<button type="button" class="btn btn-sm btn-ghost manual-copy" data-task-id="' + escHtml(t.id) + '">Копирай</button>' +
          '</div>' +
          '<textarea class="manual-artifact" data-task-id="' + escHtml(t.id) + '" rows="6">' +
          escHtml(t.artifact.content) + '</textarea></div>'
        : '';
      const genBtn = t.can_generate
        ? '<button type="button" class="btn btn-sm btn-ghost manual-generate" data-finding-id="' + escHtml(t.id) + '" data-intent="' + escHtml(t.intent || '') + '">' +
          escHtml(t.generate_label || 'Генерирай draft') + '</button>'
        : '';
      return '<li class="unified-plan-item manual-task-card ' + sev + (t.severity === 'critical' ? ' manual-task-open' : '') + '" data-kind="manual" data-task-id="' + escHtml(t.id) + '">' +
        '<div class="unified-plan-head">' +
        '<span class="unified-kind-badge plan-legend-you">👤 Вие правите</span>' +
        '<div class="unified-plan-body">' +
        '<strong>' + escHtml(t.title) + '</strong>' +
        (t.instructions ? '<p class="sub">' + escHtml(t.instructions) + '</p>' : '') +
        (t.impact ? '<p class="finding-impact">' + escHtml(t.impact) + '</p>' : '') +
        guideBlock +
        artifactBlock +
        renderManualFormFields(t.manual_form, t.id) +
        '<div class="manual-task-actions">' + genBtn +
        '<button type="button" class="btn btn-sm manual-save" data-finding-id="' + escHtml(t.id) + '">✓ Готово</button></div>' +
        '</div></div></li>';
    }

    function htmlAutoFindingCard(f) {
      const sevClass = 'finding-' + f.severity;
      const auto = f.automation || {};
      const ev = f.evidence || {};
      const evLines = [];
      if (ev.url) evLines.push('URL: ' + ev.url);
      if (ev.text_chars != null) evLines.push('Текст: ' + ev.text_chars + ' символа');
      if (ev.title) evLines.push('Title: ' + ev.title);
      if (ev.blocked_bots?.length) evLines.push('Блокирани: ' + ev.blocked_bots.join(', '));
      const detailsInner = '<p class="finding-impact">' + escHtml(f.impact) + '</p>' +
        (evLines.length ? '<ul class="finding-evidence">' + evLines.map(l => '<li>' + escHtml(l) + '</li>').join('') + '</ul>' : '') +
        (auto.note ? '<p class="finding-note sub">' + escHtml(auto.note) + '</p>' : '');
      const applyBtn = auto.can_apply_now && auto.action
        ? '<button type="button" class="btn btn-sm finding-apply" data-finding-id="' + escHtml(f.id) + '" data-intent="' + escHtml(auto.intent || '') + '">' +
          escHtml(auto.label || 'Приложи автоматично') + '</button>'
        : '';
      return '<li class="unified-plan-item finding-card ' + sevClass + '" data-kind="auto" data-finding-id="' + escHtml(f.id) + '">' +
        '<div class="unified-plan-head">' +
        '<span class="unified-kind-badge plan-legend-ai">🤖 Системата прави</span>' +
        '<div class="unified-plan-body">' +
        '<div class="finding-row"><strong class="finding-title">' + escHtml(f.title) + '</strong>' +
        '<div class="finding-actions">' + applyBtn + '</div></div>' +
        (evLines.length ? '<details class="finding-details"><summary>Защо</summary>' + detailsInner + '</details>' : detailsInner) +
        '</div></div></li>';
    }

    function wireUnifiedPlanEvents(root) {
      if (!root) return;
      root.querySelectorAll('.manual-copy').forEach(btn => {
        btn.onclick = () => {
          const ta = root.querySelector('.manual-artifact[data-task-id="' + btn.dataset.taskId + '"]');
          if (!ta?.value) return;
          navigator.clipboard.writeText(ta.value).then(() => log('Копирано в clipboard')).catch(() => log('Clipboard недостъпен'));
        };
      });
      root.querySelectorAll('.manual-save').forEach(btn => {
        btn.onclick = () => saveManualTask(btn.dataset.findingId, btn.closest('.manual-task-card'));
      });
      root.querySelectorAll('.manual-generate').forEach(btn => {
        btn.onclick = () => applyFindingFix(btn.dataset.findingId, btn.dataset.intent || null);
      });
      root.querySelectorAll('.finding-apply').forEach(btn => {
        btn.onclick = () => applyFindingFix(btn.dataset.findingId, btn.dataset.intent || null);
      });
    }

    function renderUnifiedPlan(strategyData, applyPlan, roadmap) {
      const panel = $('unified-plan');
      if (!strategyData) {
        panel.classList.add('hidden');
        return;
      }
      const manualTasks = mergeApplyManualTasks(strategyData.manual_tasks ?? [], applyPlan);
      const autoFindings = (strategyData.findings ?? []).filter(f => {
        const a = f.automation || {};
        return a.mode === 'auto' && !a.manual_form?.fields?.length;
      });
      const roadmapSteps = roadmap?.steps ?? [];
      const activeRoadmap = roadmapSteps.filter(s => s.status !== 'done');
      const doneRoadmap = roadmapSteps.filter(s => s.status === 'done');

      if (!strategyData.registered && !strategyData.probe) {
        panel.classList.add('hidden');
        return;
      }
      panel.classList.remove('hidden');
      $('plan-domain').textContent = selectedDomain || strategyData.domain || '—';

      const summaryText = strategyData.findings_summary || roadmap?.summary || '';
      const summaryEl = $('plan-summary');
      if (summaryText) {
        summaryEl.textContent = summaryText;
        summaryEl.classList.remove('hidden');
      } else {
        summaryEl.classList.add('hidden');
      }

      const honestyEl = $('plan-honesty');
      const honestyText = roadmap?.honesty_note || '';
      if (honestyText) {
        honestyEl.textContent = honestyText;
        honestyEl.classList.remove('hidden');
      } else {
        honestyEl.classList.add('hidden');
      }

      const critical = manualTasks.filter(t => t.severity === 'critical').length +
        autoFindings.filter(f => f.severity === 'critical').length;
      const warning = manualTasks.filter(t => t.severity === 'warning').length +
        autoFindings.filter(f => f.severity === 'warning').length;
      const badge = $('plan-count-badge');
      const pending = manualTasks.length + autoFindings.length + activeRoadmap.length;
      badge.textContent = pending ? pending + ' активни' : '✓ готов';
      badge.className = 'advisor-badge ' + (critical > 0 ? 'err' : warning > 0 ? 'warn' : 'ok');

      const seenTitles = new Set(
        activeRoadmap.map(s => normPlanTitle(s.title)).filter(Boolean)
      );
      const seenIds = new Set();

      const planEntries = [];

      for (const s of activeRoadmap) {
        planEntries.push({
          sort: planRoadmapRank(s.status),
          html: htmlRoadmapStep(s, false),
        });
      }

      for (const t of manualTasks) {
        const titleKey = normPlanTitle(t.title);
        if (titleKey && seenTitles.has(titleKey)) continue;
        if (t.id && seenIds.has(t.id)) continue;
        if (titleKey) seenTitles.add(titleKey);
        if (t.id) seenIds.add(t.id);
        planEntries.push({
          sort: 10 + planSeverityRank(t.severity),
          html: htmlManualTaskCard(t),
        });
      }

      for (const f of autoFindings) {
        const titleKey = normPlanTitle(f.title);
        if (titleKey && seenTitles.has(titleKey)) continue;
        if (f.id && seenIds.has(f.id)) continue;
        if (titleKey) seenTitles.add(titleKey);
        if (f.id) seenIds.add(f.id);
        planEntries.push({
          sort: 20 + planSeverityRank(f.severity),
          html: htmlAutoFindingCard(f),
        });
      }

      planEntries.sort((a, b) => a.sort - b.sort);
      const activeHtml = planEntries.map(e => e.html).join('');

      $('unified-plan-list').innerHTML = activeHtml ||
        (doneRoadmap.length ? doneRoadmap.map(s => htmlRoadmapStep(s, false)).join('') : '<li class="sub">Няма активни задачи — продължете с главния бутон.</li>');

      const doneWrap = $('plan-done-wrap');
      if (doneRoadmap.length && activeHtml) {
        doneWrap.classList.remove('hidden');
        $('plan-done-summary').textContent = '✅ ' + doneRoadmap.length + ' готови стъпки';
        $('unified-plan-done').innerHTML = doneRoadmap.map(s => htmlRoadmapStep(s, true)).join('');
      } else {
        doneWrap.classList.add('hidden');
        $('unified-plan-done').innerHTML = '';
      }

      wireUnifiedPlanEvents(panel);
    }

    function renderRoadmap(roadmap) {
      optimizerRoadmap = roadmap || null;
      if (strategy) renderUnifiedPlan(strategy, lastApplyPlan, optimizerRoadmap);
    }

    function renderManualWorkbench(strategyData, applyPlan) {
      renderUnifiedPlan(strategyData, applyPlan, optimizerRoadmap);
    }

    function renderFindings(strategyData) {
      renderUnifiedPlan(strategyData, lastApplyPlan, optimizerRoadmap);
    }

    function renderVerdict(v, score) {
      const box = $('verdict');
      box.className = 'verdict verdict-' + (v?.level || 'unknown');
      $('score-val').textContent = score != null ? score : '—';
      setMetricContext('diagnostic_score', { value: score });
      $('verdict-headline').textContent = v?.headline || '—';
      $('verdict-summary').textContent = v?.summary || '';
    }

    function renderBlockers(strategyData) {
      const banner = $('blocker-banner');
      const critical = (strategyData?.findings ?? []).find(f =>
        f.severity === 'critical' && (f.category === 'visibility' || f.id === 'http_error' || f.id === 'meta_noindex'));
      if (!critical) {
        banner.classList.add('hidden');
        return;
      }
      banner.classList.remove('hidden');
      $('blocker-title').textContent = critical.title;
      $('blocker-detail').textContent = critical.impact || critical.fix?.steps?.[0] || '';
      const btn = $('btn-blocker-fix');
      const auto = critical.automation || {};
      if (auto.manual_form) {
        btn.textContent = 'Към ръчна задача';
        btn.onclick = () => {
          const el = document.querySelector('.unified-plan-item.manual-task-card[data-task-id="' + critical.id + '"]') ||
            document.querySelector('.manual-task-card[data-task-id="' + critical.id + '"]');
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el?.classList.add('manual-task-highlight');
        };
      } else if (auto.action === 'activate_edge') {
        btn.textContent = '⚡ Edge прокси';
        btn.onclick = () => activateEdge();
      } else {
        btn.textContent = 'Виж детайли';
        btn.onclick = () => $('unified-plan')?.scrollIntoView({ behavior: 'smooth' });
      }
    }

    function renderInsights(strategyData, statsExtra) {
      const panel = $('insights-panel');
      if (!strategyData?.registered && !strategyData?.probe) {
        panel.classList.add('hidden');
        return;
      }
      panel.classList.remove('hidden');

      const sov = statsExtra?.sov?.sov ?? strategyData?.sov_summary?.sov;
      $('insight-sov-val').textContent = sov != null ? sov.toFixed(1) + '%' : '—';
      const runs = statsExtra?.runs;
      $('insight-sov-note').textContent = sov != null
        ? (runs != null ? runs + ' AI отговора · дял в вертикала' : 'дял в AI отговори')
        : (runs != null && runs > 0 ? runs + ' отговора — SOV след цитати' : 'Пуснете пълен анализ');

      const disp = strategyData?.displacement;
      const dispFinding = (strategyData?.findings ?? []).find(f => f.id === 'high_displacement');
      const dispRate = disp?.displacement_rate ?? (dispFinding?.evidence?.displaced_count != null
        ? dispFinding.evidence.displaced_count / Math.max(dispFinding.evidence.total_runs, 1) : null);
      $('insight-disp-val').textContent = dispRate != null ? Math.round(dispRate * 100) + '%' : '—';
      $('insight-disp-note').textContent = disp
        ? disp.displaced_count + '/' + disp.total_runs + ' пъти без вас'
        : 'Нужно измерване (мин. 5 runs)';

      const mis = (strategyData?.findings ?? []).find(f => f.id === 'misattributed_citations');
      const obs = statsExtra?.observations ?? strategyData?.stats?.runCount;
      const citeTotal = mis?.evidence?.total ?? statsExtra?.observations;
      const citeBad = mis?.evidence?.misattributed ?? 0;
      if (citeTotal) {
        const ok = citeTotal - citeBad;
        $('insight-cite-val').textContent = ok + '/' + citeTotal;
        $('insight-cite-note').textContent = citeBad ? citeBad + ' грешни · ' + Math.round((citeBad / citeTotal) * 100) + '%' : 'верифицирани';
      } else {
        $('insight-cite-val').textContent = '—';
        $('insight-cite-note').textContent = 'Пуснете анализ';
      }

      const exWrap = $('displacement-examples');
      const examples = dispFinding?.evidence?.examples ?? [];
      if (examples.length) {
        exWrap.classList.remove('hidden');
        $('displacement-list').innerHTML = examples.slice(0, 4).map(ex =>
          '<li><span class="disp-q">„' + escHtml(ex.question || '') + '“</span> → ' +
          escHtml((ex.competitors || []).join(', ') || ex.model || '') + '</li>'
        ).join('');
      } else if (dispRate != null && dispRate > 0) {
        exWrap.classList.remove('hidden');
        $('displacement-list').innerHTML = '<li class="sub">Има изместване — вижте секция „Автоматични поправки“.</li>';
      } else if ((disp?.total_runs ?? 0) === 0) {
        exWrap.classList.remove('hidden');
        $('displacement-list').innerHTML = '<li class="sub">Няма измерване — пуснете „Първи анализ“.</li>';
      } else {
        exWrap.classList.add('hidden');
      }

      if (strategyData?.generated_at) {
        const lm = $('last-measured');
        lm.textContent = 'Данни от ' + new Date(strategyData.generated_at).toLocaleString('bg-BG');
        lm.classList.remove('hidden');
      }
      setMetricContext('displacement_rate', { value: dispRate });
    }

    function pickNextStep(strategyData) {
      const critical = (strategyData?.findings ?? []).find(f => f.severity === 'critical');
      if (critical) {
        const auto = critical.automation || {};
        return {
          desc: critical.title + ' — ' + (critical.impact || '').slice(0, 120),
          label: auto.label || 'Поправи блокера',
          action: auto.action === 'activate_edge' ? 'edge' : (auto.manual_form ? 'manual:' + critical.id : 'analyze'),
          findingId: critical.id,
        };
      }
      const pipeline = strategyData?.pipeline;
      if (pipeline?.next_action) {
        return { desc: pipeline.next_action, label: 'Продължи', action: pipeline.current === 'edge' ? 'edge' : 'auto' };
      }
      if ((strategyData?.stats?.runCount ?? 0) === 0) {
        return { desc: 'Няма AI измерване — първи анализ (~2 мин)', label: '🚀 Първи анализ', action: 'analyze' };
      }
      if ((strategyData?.stats?.questionCount ?? 0) < 5) {
        return { desc: 'Добавете поне 5 въпроса за смислено измерване', label: 'Генерирай въпроси', action: 'questions' };
      }
      return { desc: 'Подобрете слабостите и remeasure след CMS промени', label: 'Авто-оптимизация', action: 'auto' };
    }

    function renderCommandCenter(strategyData) {
      const step = pickNextStep(strategyData);
      const btn = $('btn-primary-action');
      const hint = $('command-hint');
      btn.textContent = step.label;
      btn.onclick = () => executeNextStep(step);
      hint.textContent = step.desc;
    }

    function executeNextStep(step) {
      if (step.action === 'analyze') return runFullAnalysis();
      if (step.action === 'auto') return runAutoOptimize();
      if (step.action === 'edge') return activateEdge();
      if (step.action === 'questions') { $('btn-gen-q')?.click(); return; }
      if (step.action?.startsWith('manual:')) {
        const id = step.action.slice(7);
        document.querySelector('.unified-plan-item.manual-task-card[data-task-id="' + id + '"]')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      runFullAnalysis();
    }

    function mergeApplyManualTasks(tasks, applyPlan) {
      const out = [...(tasks || [])];
      const seen = new Set(out.map(t => t.id));
      for (const fix of applyPlan?.fixes ?? []) {
        if (fix.type !== 'manual') continue;
        const id = 'apply_' + fix.id;
        if (seen.has(id) || seen.has(fix.id)) continue;
        seen.add(id);
        out.push({
          id,
          source: 'apply_plan',
          title: fix.title,
          instructions: fix.instructions ?? null,
          artifact: fix.artifact
            ? { format: fix.artifact_format ?? 'text', title: fix.title, content: String(fix.artifact) }
            : null,
          manual_form: {
            id: 'cms_publish',
            title: 'Публикуване / копиране',
            fields: [
              { id: 'applied', type: 'checkbox', label: 'Направих промяната в сайта' },
              { id: 'notes', type: 'textarea', label: 'Бележки', placeholder: '' },
            ],
          },
          severity: fix.priority === 'critical' ? 'critical' : 'warning',
          can_generate: false,
        });
      }
      return out;
    }

    function renderManualFormFields(form, taskId) {
      if (!form?.fields?.length) return '';
      const guideAlready = form.guide ? '' : (form.hint ? '<p class="sub">' + escHtml(form.hint) + '</p>' : '');
      return '<div class="finding-manual manual-task-form" data-finding-id="' + escHtml(taskId) + '">' +
        '<p class="finding-manual-title">' + escHtml(form.title) + '</p>' +
        guideAlready +
        form.fields.map(field => {
          if (field.type === 'checkbox') {
            return '<label class="finding-field"><input type="checkbox" data-field="' + escHtml(field.id) + '"> ' + escHtml(field.label) + '</label>';
          }
          if (field.type === 'textarea') {
            return '<label class="finding-field">' + escHtml(field.label) +
              '<textarea data-field="' + escHtml(field.id) + '" rows="2" placeholder="' + escHtml(field.placeholder || '') + '"></textarea></label>';
          }
          return '<label class="finding-field">' + escHtml(field.label) +
            '<input type="text" data-field="' + escHtml(field.id) + '" placeholder="' + escHtml(field.placeholder || '') + '"></label>';
        }).join('') +
        '</div>';
    }

    async function saveManualTask(findingId, card) {
      if (!selectedDomain || !card) return;
      const manual_input = {};
      card.querySelectorAll('[data-field]').forEach(el => {
        manual_input[el.dataset.field] = el.type === 'checkbox' ? el.checked : el.value;
      });
      const artifactEl = card.querySelector('.manual-artifact');
      const body = {
        finding_id: findingId,
        manual_only: true,
        manual_input,
      };
      if (artifactEl?.value) {
        body.edited_artifact = artifactEl.value;
        body.artifact_title = card.querySelector('.manual-artifact-head span')?.textContent || 'Ръчен draft';
      }
      return withOperation('Запис на ръчна задача', 'Запазване на „Готово“…', async (setStatus) => {
        const res = await apiFetch('/api/findings/' + encodeURIComponent(selectedDomain) + '/apply', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.message || res.status);
        setStatus('Обновяване на плана…');
        await loadStrategy();
        log('Ръчна задача записана: ' + findingId);
        return data;
      }, null, {
        retry: () => saveManualTask(findingId, card),
        successDetail: () => 'Задачата е маркирана като готова — планът е обновен.',
        trackMetrics: false,
      });
    }

    async function applyFindingFix(findingId, intent) {
      if (!selectedDomain || busy) return;
      return withOperation('Автоматична поправка', 'Прилагане…', async (setStatus) => {
        const manualInput = collectManualInput(findingId);
        setStatus('Изпращане към сървъра…');
        const res = await apiFetch('/api/findings/' + encodeURIComponent(selectedDomain) + '/apply', {
          method: 'POST',
          body: JSON.stringify({ finding_id: findingId, intent, manual_input: manualInput }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.message || res.status);
        setStatus('Обновяване на стратегия…');
        await loadStrategy();
        await loadOptimizer();
        log('Поправка OK: ' + findingId);
        return data;
      }, null, {
        retry: () => applyFindingFix(findingId, intent),
        successDetail: (data) => data?.result?.message || data?.action || 'Поправката е приложена.',
      });
    }

    let applyPlanCache = null;

    async function loadApplyPlan() {
      if (!selectedDomain) return null;
      try {
        const res = await fetch(API('/api/apply/' + encodeURIComponent(selectedDomain)));
        const data = await res.json();
        if (!res.ok) return null;
        applyPlanCache = data;
        return data;
      } catch {
        return null;
      }
    }

    function collectManualInput(findingId) {
      const box = document.querySelector('.finding-manual[data-finding-id="' + findingId + '"]') ||
        document.querySelector('.manual-task-card[data-task-id="' + findingId + '"] .manual-task-form');
      if (!box) return null;
      const out = {};
      box.querySelectorAll('[data-field]').forEach(el => {
        const key = el.dataset.field;
        out[key] = el.type === 'checkbox' ? el.checked : el.value;
      });
      return Object.keys(out).length ? out : null;
    }

    async function saveFindingManual(findingId, box) {
      if (!selectedDomain) return;
      const manual_input = {};
      box.querySelectorAll('[data-field]').forEach(el => {
        manual_input[el.dataset.field] = el.type === 'checkbox' ? el.checked : el.value;
      });
      return withOperation('Запис на ръчна стъпка', 'Запазване…', async () => {
        const res = await apiFetch('/api/findings/' + encodeURIComponent(selectedDomain) + '/apply', {
          method: 'POST',
          body: JSON.stringify({ finding_id: findingId, manual_only: true, manual_input }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || res.status);
        log('Ръчна стъпка записана: ' + findingId);
      });
    }

    function renderPillars(pillars) {
      const el = $('pillars');
      if (!pillars?.length) { el.innerHTML = '<p class="sub">Няма данни</p>'; return; }
      const pillarIds = { visibility: 'pillar_visibility', content: 'pillar_content', citation: 'pillar_citation', competition: 'pillar_competition' };
      el.innerHTML = pillars.map(p => {
        const mid = pillarIds[p.id] || ('pillar_' + p.id);
        setMetricContext(mid, { status: p.status, action: p.action });
        return '<div class="pillar pillar-' + p.level + '">' +
        '<span class="pillar-icon">' + p.icon + '</span>' +
        '<div class="pillar-body"><strong>' + escHtml(p.label) + '</strong>' +
        '<p>' + escHtml(p.status) + '</p></div></div>';
      }).join('');
      if (strategy?.displacement?.displacement_rate != null) {
        setMetricContext('displacement_rate', { value: strategy.displacement.displacement_rate });
      }
    }

    async function loadModelsStatus() {
      try {
        const res = await fetch(API('/api/models/status'));
        const data = await res.json();
        window.__aivModels = data;
      } catch { /* optional */ }
    }

    function renderTech(probe, stats) {
      $('tech-detail').textContent = JSON.stringify({ probe, stats, models: window.__aivModels ?? null }, null, 2);
      $('btn-report').href = API('/report/' + encodeURIComponent(selectedDomain));
    }

    function renderEdgeDecision(decision) {
      const badge = $('edge-status-badge');
      const verdictEl = $('edge-verdict');
      const fixesEl = $('edge-fixes');
      const prereqEl = $('edge-prereq');
      const btn = $('btn-edge-activate');

      if (!decision || decision.error) {
        badge.textContent = '—';
        badge.className = 'advisor-badge';
        verdictEl.textContent = decision?.hint || 'Стартирайте анализ за Edge решение.';
        fixesEl.innerHTML = '';
        prereqEl.innerHTML = '';
        btn.disabled = true;
        return;
      }

      const statusLabels = {
        active: 'активен',
        pending_cname: 'чака CNAME',
        measurement_only: 'само измерване',
      };
      badge.textContent = statusLabels[decision.status] || decision.status || '—';
      badge.className = 'advisor-badge ' + (decision.edge_active ? 'ok' : (decision.fixes?.length ? 'warn' : ''));

      const v = decision.verdict || {};
      verdictEl.innerHTML = '<strong>' + escHtml(v.headline || '—') + '</strong><br>' + escHtml(v.summary || '');

      fixesEl.innerHTML = (decision.fixes || []).map(f =>
        '<li class="edge-fix"><span class="edge-fix-layer">' + escHtml(f.layer) + '</span> ' +
        '<strong>' + escHtml(f.title) + '</strong><br><small>' + escHtml(f.detail) + '</small></li>'
      ).join('') || '<li class="sub">Няма pending edge поправки</li>';

      prereqEl.innerHTML = (decision.prerequisites || []).map(p =>
        '<li><strong>' + escHtml(p.title) + '</strong> — ' + escHtml(p.detail) + '</li>'
      ).join('');

      btn.disabled = !decision.fixes?.length || decision.edge_active;
      btn.textContent = decision.edge_active ? 'Edge активен' : 'Приложи Edge прокси';
      setMetricContext('edge_status', {
        message: (v.headline || '') + ' — ' + (decision.fixes?.length || 0) + ' fixes, status=' + (decision.status || ''),
      });
      loadEdgeSmokeQuiet();
    }

    function renderEdgeSmoke(smoke) {
      const panel = $('edge-smoke-panel');
      if (!smoke || smoke.error) {
        panel?.classList.add('hidden');
        return;
      }
      panel?.classList.remove('hidden');
      $('edge-smoke-level').textContent = smoke.level_label || ('Level ' + (smoke.level ?? '?'));
      $('edge-smoke-score').textContent = '(' + (smoke.passed ?? 0) + '/' + (smoke.total ?? 0) + ' checks)';
      const list = $('edge-smoke-checks');
      if (list) {
        list.innerHTML = (smoke.checks || []).map(c =>
          '<li class="edge-smoke-item ' + (c.pass ? 'ok' : 'fail') + '">' +
          (c.pass ? '✓' : '✗') + ' ' + escHtml(c.id) + ': ' + escHtml(c.detail || '') + '</li>'
        ).join('');
      }
    }

    async function loadEdgeSmokeQuiet() {
      if (!selectedDomain) return;
      try {
        const res = await fetch(API('/api/edge/' + encodeURIComponent(selectedDomain) + '/smoke'));
        const data = await res.json();
        if (res.ok) renderEdgeSmoke(data);
      } catch { /* optional panel */ }
    }

    async function loadEdgeDecision() {
      if (!selectedDomain) return;
      try {
        const res = await fetch(API('/api/edge/' + encodeURIComponent(selectedDomain) + '/decision'));
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.hint || res.status);
        renderEdgeDecision(data);
        lastEdgeDecision = data;
        applyContextualVisibility();
      } catch (e) {
        renderEdgeDecision({ error: true, hint: 'Edge: ' + e.message });
        lastEdgeDecision = { error: true };
        applyContextualVisibility();
      }
    }

    async function activateEdge() {
      if (!selectedDomain || busy) return;
      return withOperation('Edge прокси', 'Запис в Cloudflare KV…', async (setStatus) => {
        $('btn-edge-activate').disabled = true;
        try {
          setStatus('Прилагане на Edge правила…');
          const res = await apiFetch('/api/edge/' + encodeURIComponent(selectedDomain) + '/activate', {
            method: 'POST', body: '{}'
          });
          const data = await res.json();
          if (!res.ok) throw new Error(authErrorHint(res, data));
          setStatus('Обновяване на панелите…');
          log(data.message || 'Edge конфигурация записана');
          await loadEdgeDecision();
          await loadStrategy();
          return data;
        } catch (e) {
          await loadEdgeDecision();
          throw e;
        } finally {
          $('btn-edge-activate').disabled = false;
        }
      }, null, {
        retry: () => activateEdge(),
        successDetail: (data) => data?.message || 'Edge прокси правилата са записани.',
      });
    }

    async function loadSiteStats() {
      if (!selectedDomain) return;
      const cachePanel = $('cache-index-panel');
      try {
        const res = await fetch(API('/api/dashboard/site-stats?domain=' + encodeURIComponent(selectedDomain)));
        const data = await res.json();
        if (!res.ok) { cachePanel?.classList.add('hidden'); return; }
        $('stat-runs').textContent = data.runs ?? 0;
        $('stat-obs').textContent = data.observations ?? 0;
        $('stat-sov').textContent = data.sov?.sov != null ? (data.sov.sov.toFixed(1) + '%') : '—';
        $('stat-pending').textContent = data.pending_reprocess ?? 0;
        setMetricContext('runs', { value: data.runs });
        setMetricContext('observations', { value: data.observations, runs: data.runs });
        setMetricContext('sov', { value: data.sov?.sov });
        setMetricContext('pending_reprocess', { value: data.pending_reprocess });
        setMetricContext('questions', { value: data.questions });

        renderCacheIndex(data.cache_index, data.bot_hits);
        renderInsights(strategy, data);
        cachePanel?.classList.remove('hidden');
      } catch {
        cachePanel?.classList.add('hidden');
      }
    }

    function renderCacheIndex(cache, botHits) {
      const badge = $('cache-coverage-badge');
      const note = $('cache-note');
      if (!cache || !cache.cache_age_hours) {
        $('cache-median').textContent = '—';
        $('cache-p25').textContent = '—';
        $('cache-p75').textContent = '—';
        badge.textContent = 'нето данни';
        badge.className = 'advisor-badge';
        note.textContent = cache?.note || 'Нужни цитати + bot hits (tenant) или dateModified (external).';
        setMetricContext('cache_coverage', { value: null });
        setMetricContext('cache_median', { value: null });
      } else {
        const h = cache.cache_age_hours;
        $('cache-median').textContent = h.median != null ? h.median.toFixed(1) : '—';
        $('cache-p25').textContent = h.p25 != null ? h.p25.toFixed(1) : '—';
        $('cache-p75').textContent = h.p75 != null ? h.p75.toFixed(1) : '—';
        const cov = Math.round((cache.coverage ?? 0) * 100);
        badge.textContent = cov + '% покритие';
        badge.className = 'advisor-badge ' + (cov >= 50 ? 'ok' : 'warn');
        note.textContent = (cache.observations_with_age ?? 0) + ' / ' + (cache.observations_total ?? 0) +
          ' цитати с cache age (72h прозорец).';
        setMetricContext('cache_coverage', { value: cov });
        setMetricContext('cache_median', { value: h.median });
        setMetricContext('cache_p25', { value: h.p25 });
        setMetricContext('cache_p75', { value: h.p75 });
      }
      $('stat-bot-v').textContent = botHits?.verified_hits ?? 0;
      $('stat-bot-u').textContent = botHits?.unverified_hits ?? 0;
      setMetricContext('bot_verified', { value: botHits?.verified_hits ?? 0 });
      setMetricContext('bot_fake', { value: botHits?.unverified_hits ?? 0 });
      if ((botHits?.unverified_hits ?? 0) > 0) {
        $('stat-bot-u').parentElement.classList.add('stat-warn');
      } else {
        $('stat-bot-u').parentElement.classList.remove('stat-warn');
      }
    }

    async function loadOnboarding() {
      if (!selectedDomain) return;
      const panel = $('onboarding-panel');
      if (!edgeIsNeeded(lastEdgeDecision, strategy)) {
        panel.classList.add('hidden');
        return;
      }
      try {
        const res = await fetch(API('/api/onboarding/' + encodeURIComponent(selectedDomain)));
        const data = await res.json();
        if (!res.ok) { panel.classList.add('hidden'); return; }
        panel.classList.remove('hidden');
        $('onboarding-steps').innerHTML = (data.steps || []).map(s =>
          '<li class="onb-step ' + (s.done ? 'done' : '') + '">' +
          '<span class="onb-check">' + (s.done ? '✓' : '○') + '</span> ' +
          '<strong>' + escHtml(s.title) + '</strong> — ' + escHtml(s.detail) + '</li>'
        ).join('');
        const dns = data.dns || {};
        const dnsEl = $('onboarding-dns');
        if (dns.guide) {
          dnsEl.innerHTML = htmlManualGuideBlock(dns.guide) +
            '<p class="sub mono">' + escHtml((dns.type || 'CNAME') + ' ' + (dns.name || '') + ' → ' + (dns.target || '')) + '</p>';
        } else {
          dnsEl.textContent = (dns.type || 'CNAME') + ' ' + (dns.name || '') + ' → ' + (dns.target || '');
        }
      } catch {
        panel.classList.add('hidden');
      }
    }

    async function loadStrategy() {
      if (!selectedDomain) return;
      log('Зареждане на стратегия…');
      try {
        const res = await fetch(API('/api/strategy/' + encodeURIComponent(selectedDomain)));
        strategy = await res.json();
        if (!res.ok) throw new Error(strategy.error || res.status);
        renderVerdict(strategy.verdict, strategy.score);
        renderBlockers(strategy);
        renderJourneyBar(strategy);
        renderCommandCenter(strategy);
        lastApplyPlan = await loadApplyPlan();
        renderPillars(strategy.pillars);
        renderInsights(strategy, null);
        renderTech(strategy.probe, strategy.stats);
        log('Обновено ' + new Date().toLocaleTimeString('bg-BG'));
        loadQuestionsQuiet();
        await loadEdgeDecision();
        loadSiteStats();
        await loadOnboarding();
        await loadOptimizer();
        renderUnifiedPlan(strategy, lastApplyPlan, optimizerRoadmap);
        renderOperationHistory();
      } catch (e) {
        log('Грешка: ' + e.message);
      }
    }

    async function runReprocess() {
      if (busy) return;
      return withOperation('Проверка на цитатите', 'Верификация и класификация…', async (setStatus) => {
        setStatus('Обработка на цитатите…');
        const res = await apiFetch('/api/citations/reprocess', { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(authErrorHint(res, data));
        setStatus('Презареждане на метриките…');
        log('Проверка на цитати: ' + (data.observations ?? 0) + ' записа');
        await loadSiteStats();
        await loadStrategy();
        return data;
      }, null, {
        retry: () => runReprocess(),
        successDetail: (data) => 'Обработени ' + (data?.observations ?? 0) + ' цитата — SOV и качеството са преизчислени.',
      });
    }

    async function loadOptimizer() {
      if (!selectedDomain) return;
      try {
        const res = await fetch(API('/api/optimizer/' + encodeURIComponent(selectedDomain) + '/status'));
        const data = await res.json();
        if (!res.ok) return;
        const plan = data.current_plan;
        renderRoadmap(data.roadmap);
        renderPlaybook(data.playbook);
        setMetricContext('optimizer', {
          message: (plan?.headline || data.playbook?.summary || data.roadmap?.summary || ''),
        });
      } catch { /* optional panel */ }
    }

    function renderPlaybook(playbook) {
      const panel = $('playbook-panel');
      if (!playbook || playbook.error) {
        panel?.classList.add('hidden');
        return;
      }
      panel?.classList.remove('hidden');
      const badge = $('playbook-path-badge');
      if (badge) {
        badge.textContent = playbook.path?.label || playbook.path_id || '—';
        badge.className = 'playbook-badge path-' + escHtml(playbook.path_id || 'unknown');
      }
      const levelEl = $('playbook-level');
      if (levelEl) {
        const smoke = playbook.smoke;
        levelEl.textContent = smoke
          ? (smoke.level_label || 'Level ' + smoke.level) + ' · ' + (playbook.ai_source === 'gemini' ? '🤖 AI path' : '📋 rules')
          : (playbook.ai_source === 'gemini' ? '🤖 AI path' : '📋 rules');
      }
      $('playbook-summary').textContent = playbook.summary || playbook.path?.tagline || '—';
      const rationale = $('playbook-ai-rationale');
      if (playbook.ai_rationale) {
        rationale.textContent = playbook.ai_rationale;
        rationale.classList.remove('hidden');
      } else {
        rationale.classList.add('hidden');
      }
      const phasesEl = $('playbook-phases');
      if (phasesEl) {
        phasesEl.innerHTML = (playbook.phases || []).map(ph =>
          '<details class="playbook-phase" open>' +
          '<summary><strong>' + escHtml(ph.title) + '</strong></summary>' +
          '<ol class="playbook-steps">' +
          (ph.steps || []).map(s =>
            '<li class="playbook-step pb-' + escHtml(s.status) + '">' +
            '<span class="pb-status">' + statusIcon(s.status) + '</span> ' +
            escHtml(s.title) + ' — <span class="sub">' + escHtml(s.summary) + '</span>' +
            '</li>'
          ).join('') +
          '</ol></details>'
        ).join('');
      }
    }

    function statusIcon(status) {
      const icons = { done: '✅', current: '▶️', waiting_auto: '⏳', waiting_manual: '👤', blocked: '🔒' };
      return icons[status] || '·';
    }

    function actionLabel(action) {
      const labels = {
        run_pipeline: 'Пълен анализ',
        reprocess: 'Проверка на цитати',
        generate_questions: 'Генериране на въпроси',
        refine_questions_displacement: 'Нови въпроси (конкуренция)',
        generate_content: 'Draft текст',
        activate_edge: 'Edge конфигурация',
        apply_cf_aeo: 'Cloudflare AEO',
        run_smoke: 'Agent-Native smoke',
        remeasure: 'Повторно измерване',
      };
      return labels[action] || action;
    }

    async function runAutoOptimize() {
      if (!selectedDomain || busy) return;
      return withOperation('Авто-оптимизация', 'Gemini план + автоматично изпълнение…', async (setStatus) => {
        $('btn-auto-optimize').disabled = true;
        try {
          setStatus('Генериране и изпълнение на план…');
          const res = await apiFetch('/api/optimizer/' + encodeURIComponent(selectedDomain) + '/run', {
            method: 'POST',
            body: JSON.stringify({ max_actions: 6 })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(authErrorHint(res, data));
          const done = (data.executed || []).map(e => e.action).join(', ');
          setStatus('Обновяване на dashboard…');
          log('Auto OK: ' + (done || 'nothing') + ' | gates: ' + (data.human_gates?.length || 0));
          await loadStrategy();
          await loadEdgeDecision();
          await loadOptimizer();
          await loadOnboarding();
          return data;
        } finally {
          $('btn-auto-optimize').disabled = false;
        }
      }, null, {
        retry: () => runAutoOptimize(),
        successDetail: (data) => {
          const done = (data?.executed || []).map(e => e.action).join(', ');
          const gates = data?.human_gates?.length || 0;
          if (done) return 'Изпълнено автоматично: ' + done + (gates ? ' · ' + gates + ' чакат вас (ръчни задачи).' : '.');
          return gates
            ? 'Няма auto действия — ' + gates + ' стъпки изискват CMS/DNS (вижте ръчните задачи).'
            : 'Планът не намери нови auto действия — проверете плана и метриките.';
        },
      });
    }

    async function runFullAnalysis() {
      if (!selectedDomain || busy) return;
      const steps = ['Одит на сайта', 'Генериране на въпроси', 'AI измерване', 'Обновяване на стратегия'];
      return withOperation('Пълен анализ', steps[0] + '…', async (setStatus) => {
        $('btn-primary-action').disabled = true;
        try {
          setStatus('Pipeline: одит → въпроси → измерване (~2 мин)', { stepIndex: 0 });
          const res = await apiFetch('/api/pipeline/' + encodeURIComponent(selectedDomain) + '/run', {
            method: 'POST',
            body: JSON.stringify({ measure: true, question_limit: 5, repetitions: 1 })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(authErrorHint(res, data));
          setStatus('Презареждане на стратегия…', { stepIndex: 3 });
          await loadStrategy();
          await loadEdgeDecision();
          log('Анализът приключи успешно');
          return data;
        } finally {
          $('btn-primary-action').disabled = false;
        }
      }, steps, {
        retry: () => runFullAnalysis(),
        successDetail: (data) => {
          const runs = data?.pipeline_runs ?? data?.runs;
          const obs = data?.observations;
          const parts = [];
          if (runs != null) parts.push(runs + ' AI измервания');
          if (obs != null) parts.push(obs + ' цитата');
          return parts.length
            ? 'Пълен анализ приключи — ' + parts.join(', ') + '. Вижте AI-SOV и плана по-горе.'
            : 'Пълен анализ приключи — вердиктът и метриките са обновени.';
        },
      });
    }

    async function submitAddSite(thenRun) {
      if (busy) return;
      const fd = new FormData($('add-site-form'));
      const body = {
        domain: fd.get('domain'),
        name: fd.get('name'),
        vertical_name: fd.get('vertical_name') || undefined,
      };
      const box = $('add-result');
      box.classList.remove('hidden');
      try {
        await withOperation(
          'Добавяне на сайт',
          'Регистрация на ' + body.domain + '…',
          async (setStatus) => {
            const res = await apiFetch('/api/sites', {
              method: 'POST', body: JSON.stringify(body)
            });
            const data = await res.json();
            if (!res.ok) {
              if (res.status === 409 && data.error === 'domain_exists' && data.domain) {
                box.textContent = 'ℹ️ ' + data.domain + ' вече е в системата — избран автоматично';
                applySelectedSite(data.domain, false);
                $('add-panel').classList.add('hidden');
                setStatus('Зареждане на списъка…');
                await loadSites();
                if (!thenRun) await loadStrategy();
                return data;
              }
              box.textContent = 'Грешка: ' + authErrorHint(res, data);
              throw new Error(authErrorHint(res, data));
            }
            box.textContent = '✓ ' + data.domain + ' добавен';
            applySelectedSite(data.domain, false);
            $('add-panel').classList.add('hidden');
            setStatus('Зареждане на списъка…');
            await loadSites();
            if (!thenRun) await loadStrategy();
          },
        );
        if (thenRun) await runFullAnalysis();
      } catch { /* withOperation вече показа грешката */ }
    }

    async function loadQuestionsQuiet() {
      if (!selectedDomain) return;
      const el = $('questions-list');
      try {
        const res = await fetch(API('/api/questions?domain=' + encodeURIComponent(selectedDomain)));
        const data = await res.json();
        if (!data.questions?.length) {
          el.innerHTML = '<p class="sub">Няма въпроси — натиснете Авто-генерирай или стартирайте анализ.</p>';
          return;
        }
        el.innerHTML = data.questions.map((q, i) =>
          '<div class="q-item">' +
          '<span class="q-src">' + q.source + '</span> ' +
          '<p class="q-text" contenteditable="true">' + escHtml(q.text) + '</p>' +
          '<button type="button" class="btn-sm save-q" data-id="' + q.id + '">Запази</button></div>'
        ).join('');
        el.querySelectorAll('.save-q').forEach(btn => {
          btn.onclick = async () => {
            const text = btn.closest('.q-item').querySelector('.q-text').textContent.trim();
            await apiFetch('/api/questions/' + btn.dataset.id, {
              method: 'PUT',
              body: JSON.stringify({ text })
            });
            log('Въпрос запазен');
          };
        });
      } catch { el.innerHTML = ''; }
    }

    $('btn-add-toggle').onclick = () => {
      $('add-panel').classList.toggle('hidden');
    };
    $('add-site-form').onsubmit = (e) => { e.preventDefault(); submitAddSite(false); };
    $('btn-add-run').onclick = () => submitAddSite(true);
    $('btn-auto-optimize').onclick = runAutoOptimize;
    $('btn-activity-dismiss').onclick = () => {
      $('activity-panel').classList.add('hidden');
    };
    $('btn-activity-retry').onclick = () => {
      if (lastActivityRetry) lastActivityRetry();
    };
    $('btn-edge-activate').onclick = activateEdge;
    $('btn-cf-aeo').onclick = () => applyCloudflareAeo();
    $('btn-edge-smoke').onclick = () => runEdgeSmoke(true);

    async function applyCloudflareAeo() {
      if (!selectedDomain || busy) return;
      return withOperation('Cloudflare AEO', 'Bot Fight, WAF, DNS-AID…', async (setStatus) => {
        setStatus('Прилагане на CF настройки за ' + selectedDomain + '…');
        const res = await apiFetch('/api/cloudflare/' + encodeURIComponent(selectedDomain) + '/apply-aeo', {
          method: 'POST',
          body: JSON.stringify({ run_smoke: true }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(authErrorHint(res, data));
        setStatus('Обновяване на smoke…');
        if (data.smoke) renderEdgeSmoke(data.smoke);
        else await loadEdgeSmokeQuiet();
        await loadEdgeDecision();
        log(data.message || 'CF AEO приложен');
        return data;
      }, null, {
        retry: () => applyCloudflareAeo(),
        successDetail: (data) => data?.message || 'Cloudflare AEO настройки приложени.',
      });
    }

    async function runEdgeSmoke(showModal) {
      if (!selectedDomain) return;
      const run = async () => {
        const res = await fetch(API('/api/edge/' + encodeURIComponent(selectedDomain) + '/smoke'));
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.hint || res.status);
        renderEdgeSmoke(data);
        log('Smoke: ' + (data.level_label || '') + ' ' + data.passed + '/' + data.total);
        return data;
      };
      if (!showModal) return run();
      if (busy) return;
      return withOperation('Agent-Native smoke', 'Live checks на ' + selectedDomain + '…', run, null, {
        retry: () => runEdgeSmoke(true),
        successDetail: (data) =>
          (data?.level_label || 'Smoke') + ' — ' + (data?.passed ?? 0) + '/' + (data?.total ?? 0) + ' checks pass.',
        trackMetrics: false,
      });
    }
    $('btn-reprocess').onclick = runReprocess;
    $('btn-export-manual').onclick = exportManualRecommendations;
    $('btn-gen-q').onclick = async () => {
      if (!selectedDomain || busy) return;
      return withOperation('Генериране на въпроси', 'Gemini + site brief…', async (setStatus) => {
        setStatus('Създаване на въпроси за измерване…');
        const res = await apiFetch('/api/questions/generate', {
          method: 'POST',
          body: JSON.stringify({ domain: selectedDomain, replace_auto: true })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(authErrorHint(res, data));
        setStatus('Обновяване на списъка…');
        await loadQuestionsQuiet();
        log('Въпросите са генерирани');
        return data;
      }, null, {
        retry: () => $('btn-gen-q').click(),
        successDetail: (data) => {
          const n = data?.count ?? data?.questions?.length;
          return n != null
            ? 'Генерирани ' + n + ' въпроса — стартирайте пълен анализ за измерване.'
            : 'Въпросите са обновени — стартирайте пълен анализ.';
        },
        trackMetrics: false,
      });
    };
    $('btn-save-token').onclick = () => {
      setAdminToken($('admin-token').value);
      log('Admin token запазен за сесията');
    };

    loadAuthStatus();
    loadBaselineStatus();
    loadDriftStatus();
    loadModelsStatus();
    loadSites().then(() => { if (selectedDomain) { loadStrategy(); loadEdgeDecision(); loadSiteStats(); loadOnboarding(); } });
  `;
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const CSS = `
:root {
  --bg:#0a0e14; --surface:#121820; --surface2:#1a2332; --border:#2a3648;
  --text:#e8edf4; --muted:#8fa3bc; --accent:#3b82f6; --ok:#22c55e; --warn:#f59e0b; --err:#ef4444;
}
*{box-sizing:border-box}
body{margin:0;font-family:system-ui,sans-serif;background:var(--bg);color:var(--text);line-height:1.5}
.app{max-width:720px;margin:0 auto;padding:1rem 1.25rem 2.5rem}
.topbar{display:flex;flex-wrap:wrap;justify-content:space-between;gap:1rem;margin-bottom:1rem;align-items:flex-end}
.topbar-brand h1{font-size:1.25rem;margin:0}
.topbar-meta{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap}
#site-select{background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:.45rem .65rem;min-width:180px;max-width:100%}
.sites-bar{margin-bottom:.75rem}
.sites-bar.hidden{display:none}
.sites-bar-title{font-size:.78rem;color:var(--muted);margin:0 0 .35rem;text-transform:uppercase;letter-spacing:.03em}
.sites-list{list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:.4rem}
.site-chip{font:inherit;font-size:.82rem;background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:999px;padding:.35rem .75rem;cursor:pointer;transition:border-color .15s,background .15s}
.site-chip:hover{border-color:var(--accent)}
.site-chip-active{border-color:var(--accent);background:#1e3a5f33;box-shadow:0 0 0 1px #3b82f666}
.site-badge-pilot{font-size:.65rem;background:#6366f133;color:#a5b4fc;border-radius:4px;padding:.05rem .35rem;margin-left:.25rem;text-transform:uppercase;vertical-align:middle}
.site-badge-status{font-size:.65rem;color:var(--muted);margin-left:.15rem}
.pipeline-bar.hidden,.hidden[aria-hidden="true"]{display:none!important}
.alerts-wrap{display:grid;gap:.5rem;margin-bottom:.75rem}
.verdict{border-radius:12px;padding:1rem 1.15rem;margin-bottom:1rem;border-left:4px solid var(--border)}
.verdict-top{display:flex;gap:1rem;align-items:center}
.verdict-text{flex:1;min-width:0}
.verdict h2{font-size:1rem;margin:0 0 .25rem;line-height:1.35}
.last-measured{font-size:.75rem;margin-top:.35rem!important;opacity:.85}
.blocker-banner{display:flex;align-items:flex-start;gap:.75rem;padding:.85rem 1rem;margin-bottom:.75rem;background:#2a1515;border:1px solid var(--err);border-radius:10px}
.blocker-banner.hidden{display:none}
.blocker-icon{font-size:1.25rem;line-height:1}
.blocker-body{flex:1;min-width:0}
.blocker-body strong{display:block;margin-bottom:.2rem}
.activity-panel{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:.85rem 1rem;margin-bottom:.75rem}
.activity-panel.hidden{display:none}
.activity-panel.activity-ok{border-color:var(--ok);background:#102a1818}
.activity-panel.activity-error{border-color:var(--err);background:#2a151518}
.activity-panel.activity-running{border-color:var(--accent);background:#1e3a5f18}
.activity-head{display:flex;align-items:flex-start;gap:.65rem}
.activity-icon{font-size:1.15rem;line-height:1.4;flex-shrink:0}
.activity-body{flex:1;min-width:0}
.activity-body strong{display:block;font-size:.9rem;margin-bottom:.15rem}
.activity-actions{display:flex;gap:.35rem;flex-shrink:0}
.activity-metrics{list-style:none;padding:0;margin:.55rem 0 0;display:flex;flex-wrap:wrap;gap:.45rem .75rem}
.activity-metrics.hidden{display:none}
.activity-metrics li{font-size:.78rem;background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:.25rem .5rem}
.activity-metric-label{color:var(--muted);margin-right:.35rem}
.activity-next{margin:.55rem 0 0;padding-top:.5rem;border-top:1px solid var(--border);font-size:.82rem;color:var(--accent)}
.how-it-works{background:#1e3a5f18;border:1px solid #3b82f633;border-radius:10px;padding:.75rem 1rem;margin-bottom:.75rem;font-size:.88rem;line-height:1.45}
.how-it-works-lead{margin:0 0 .35rem}
.how-it-works-steps{margin:.25rem 0 0;padding-left:1.25rem;color:var(--text)}
.how-it-works-steps li{margin:.25rem 0}
.plan-honesty{margin:.35rem 0 .5rem;padding:.5rem .65rem;border-radius:8px;background:#14532d18;border:1px solid #14532d44;color:var(--text)}
.plan-honesty.hidden{display:none}
.journey-bar{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:.75rem 1rem;margin-bottom:.75rem}
.journey-bar.hidden{display:none}
.playbook-panel{background:#1e3a5f18;border:1px solid #3b82f644;border-radius:10px;padding:.85rem 1rem;margin-bottom:.75rem}
.playbook-panel.hidden{display:none}
.playbook-head{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin-bottom:.35rem}
.playbook-badge{font-size:.78rem;font-weight:600;background:var(--surface2);border:1px solid var(--accent);border-radius:999px;padding:.25rem .65rem}
.playbook-rationale{margin:.35rem 0;padding:.5rem .65rem;background:var(--surface2);border-radius:8px;line-height:1.45}
.playbook-phase{margin:.45rem 0}
.playbook-phase summary{cursor:pointer;font-size:.88rem}
.playbook-steps{margin:.35rem 0 0;padding-left:1.25rem;font-size:.82rem}
.playbook-step{margin:.2rem 0}
.playbook-step.pb-done{opacity:.85}
.playbook-step.pb-waiting_manual{color:var(--warn)}
.journey-phases{display:grid;grid-template-columns:repeat(4,1fr);gap:.35rem;margin-bottom:.55rem}
@media(max-width:560px){.journey-phases{grid-template-columns:repeat(2,1fr)}}
.journey-phase{text-align:center;padding:.45rem .35rem;border-radius:8px;border:1px solid var(--border);background:var(--surface2)}
.journey-phase.journey-done{border-color:#14532d;background:#102a1818}
.journey-phase.journey-current{border-color:var(--accent);background:#1e3a5f22;box-shadow:0 0 0 1px #3b82f644}
.journey-phase.journey-future{opacity:.55}
.journey-icon{display:block;font-size:.85rem;margin-bottom:.15rem}
.journey-label{display:block;font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.02em}
.journey-hint{display:block;font-size:.62rem;color:var(--muted);margin-top:.1rem;line-height:1.2}
.journey-focus{margin:0;font-size:.82rem;color:var(--accent)}
.unified-plan{margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border)}
.unified-plan.hidden{display:none}
.unified-plan-list{list-style:none;padding:0;margin:.65rem 0 0;display:grid;gap:.55rem}
.unified-plan-item{padding:.65rem .85rem;border-radius:8px;background:var(--bg);border:1px solid var(--border)}
.unified-plan-compact{padding:.45rem .65rem;opacity:.85}
.unified-plan-head{display:flex;flex-wrap:wrap;gap:.45rem;align-items:flex-start}
.unified-kind-badge{font-size:.65rem;text-transform:uppercase;letter-spacing:.03em;color:var(--muted);background:var(--surface2);border:1px solid var(--border);border-radius:4px;padding:.12rem .4rem;flex-shrink:0}
.unified-plan-body{flex:1;min-width:0}
.plan-legend{font-size:.78rem;color:var(--muted);margin:.5rem 0 .65rem;padding:.45rem .6rem;background:var(--surface2);border-radius:6px;border:1px solid var(--border)}
.plan-legend-you{color:var(--warn);font-weight:600}
.plan-legend-ai{color:var(--accent);font-weight:600}
.plan-legend-sep{margin:0 .35rem;opacity:.5}
.activity-history{list-style:none;padding:.5rem 0 0;margin:.45rem 0 0;border-top:1px solid var(--border);font-size:.72rem;color:var(--muted)}
.activity-history.hidden{display:none}
.activity-history-item{padding:.2rem 0}
.activity-history-ok{color:var(--ok)}
.activity-history-error{color:var(--err)}
.edge-dns-wrap.hidden{display:none!important}
.operator-panel{margin-top:1rem}
.tech-detail-pre{font-size:.68rem;max-height:200px;overflow:auto;background:var(--bg);padding:.5rem;border-radius:6px;margin-top:.65rem}
.command-center{margin-bottom:1rem;padding-bottom:.85rem;border-bottom:1px solid var(--border)}
.command-primary{display:flex;flex-direction:column;align-items:flex-start;gap:.45rem;margin-bottom:.65rem}
.command-hint{margin:0;max-width:36rem;line-height:1.4}
.command-more summary{cursor:pointer;font-size:.82rem;color:var(--muted);padding:.25rem 0;list-style:none}
.command-more summary::-webkit-details-marker{display:none}
.command-more-grid{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.45rem;padding:.5rem;background:var(--surface2);border-radius:8px;border:1px solid var(--border)}
.insights-panel{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:.85rem 1rem;margin-bottom:.75rem}
.insights-panel.hidden{display:none}
.insights-title{font-size:.9rem;margin:0 0 .65rem;font-weight:600}
.insights-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem}
@media(max-width:560px){.insights-grid{grid-template-columns:1fr}}
.insight-card{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:.65rem .75rem;text-align:center}
.insight-label{font-size:.65rem;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:.2rem}
.insight-val{font-size:1.35rem;color:var(--accent);display:block;line-height:1.2}
.insight-card small{font-size:.7rem;display:block;margin-top:.15rem}
.displacement-examples{margin-top:.65rem;padding-top:.55rem;border-top:1px solid var(--border)}
.insight-examples-title{margin:0 0 .35rem;font-size:.78rem}
.displacement-list{list-style:none;padding:0;margin:0;font-size:.78rem;color:var(--muted)}
.displacement-list li{padding:.25rem 0;border-bottom:1px solid var(--border)}
.disp-q{color:var(--text)}
.next-step-bar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.75rem;padding:.85rem 1rem;margin-bottom:.75rem;background:linear-gradient(135deg,#1e3a5f22,#121820);border:1px solid var(--accent);border-radius:10px}
.next-step-bar.hidden{display:none}
.next-step-label{font-size:.65rem;text-transform:uppercase;color:var(--accent);display:block;margin-bottom:.15rem}
.next-step-text{flex:1;min-width:200px}
.next-step-text p{margin:0;font-size:.875rem}
.manual-task-open{border-color:var(--warn)!important}
.manual-task-highlight{outline:2px solid var(--accent);outline-offset:2px}
.score{position:relative;font-size:2.25rem;font-weight:700;line-height:1;color:var(--accent);flex-shrink:0;min-width:2.75rem;text-align:center}
.work-hub{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:1rem 1.15rem;margin-bottom:1rem}
.work-hub-head{display:flex;justify-content:space-between;align-items:flex-start;gap:.75rem;margin-bottom:.75rem}
.work-hub-title{font-size:1.05rem;margin:0 0 .25rem;font-weight:600}
.action-bar{display:flex;flex-wrap:wrap;gap:.45rem;align-items:center;margin-bottom:1rem;padding-bottom:.85rem;border-bottom:1px solid var(--border)}
.action-more{position:relative}
.action-more summary{list-style:none;cursor:pointer}
.action-more summary::-webkit-details-marker{display:none}
.action-more-menu{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.45rem;padding:.5rem;background:var(--surface2);border-radius:8px;border:1px solid var(--border)}
.roadmap-panel{background:transparent;border:none;padding:0;margin:0}
.roadmap-panel.hidden{display:none}
.roadmap-honesty{margin:0;padding:0;background:none;border:none;font-size:.82rem}
.roadmap-done-wrap{margin-top:.65rem;font-size:.85rem;color:var(--muted)}
.roadmap-done-wrap summary{cursor:pointer;padding:.35rem 0}
.roadmap-list-compact .roadmap-step{padding:.45rem .65rem;opacity:.85}
.roadmap-step-compact .roadmap-summary{display:none}
.findings-panel{margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border)}
.manual-workbench{margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border)}
.manual-workbench.hidden{display:none}
.manual-hint{margin:0 0 .65rem;font-size:.8rem}
.manual-task-list{list-style:none;padding:0;margin:0;display:grid;gap:.65rem}
.manual-task-card{padding:.75rem;border-radius:8px;background:var(--bg);border:1px solid var(--border)}
.manual-task-head{margin-bottom:.35rem;font-size:.9rem}
.manual-artifact-wrap{margin:.5rem 0}
.manual-artifact-head{display:flex;justify-content:space-between;align-items:center;gap:.5rem;margin-bottom:.25rem}
.manual-artifact{width:100%;font-family:ui-monospace,monospace;font-size:.72rem;background:var(--surface2);border:1px solid var(--border);color:var(--text);border-radius:6px;padding:.5rem;resize:vertical}
.manual-task-actions{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.5rem}
.manual-guide{margin:.65rem 0;padding:.65rem .75rem;background:var(--surface2);border:1px solid var(--border);border-radius:8px;font-size:.82rem}
.manual-guide summary{cursor:pointer;font-weight:600;color:var(--accent);margin-bottom:.35rem}
.manual-guide-where{margin:.35rem 0;line-height:1.45}
.manual-guide-steps{margin:.4rem 0 .4rem 1.1rem;padding:0;color:var(--text)}
.manual-guide-steps li{margin:.25rem 0;line-height:1.4}
.manual-guide-fields{width:100%;border-collapse:collapse;margin:.5rem 0;font-size:.78rem}
.manual-guide-fields th,.manual-guide-fields td{border:1px solid var(--border);padding:.35rem .5rem;text-align:left;vertical-align:top}
.manual-guide-fields th{background:var(--bg);color:var(--muted);font-weight:600}
.manual-guide-val{font-family:ui-monospace,monospace;font-size:.75rem;word-break:break-all}
.manual-guide-after{margin:.45rem 0 0;font-size:.78rem;color:var(--muted)}
.onboarding-dns-guide{margin-top:.5rem}
.findings-panel.hidden{display:none}
.findings-head{display:flex;justify-content:space-between;align-items:center;gap:.5rem;margin-bottom:.65rem}
.findings-subhead{font-size:.9rem;margin:0;font-weight:600}
.findings-summary.hidden{display:none}
.finding-row{display:flex;justify-content:space-between;align-items:center;gap:.65rem}
.finding-main{display:flex;align-items:center;gap:.45rem;min-width:0;flex:1}
.finding-title{font-size:.875rem;font-weight:600;line-height:1.3}
.finding-mode{font-size:.85rem;flex-shrink:0}
.finding-details{margin-top:.35rem;font-size:.82rem}
.finding-details summary{cursor:pointer;color:var(--muted);padding:.15rem 0}
.finding-details[open] summary{margin-bottom:.35rem}
.finding-card{padding:.55rem .75rem;border-radius:8px;background:var(--surface2);border:1px solid var(--border)}
.findings-list{gap:.45rem}
.metrics-panel{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:.85rem 1rem;margin-bottom:1rem}
.metrics-subhead{font-size:.85rem;margin:0 0 .5rem;color:var(--muted);font-weight:600}
.pillars-compact{display:grid;grid-template-columns:repeat(2,1fr);gap:.4rem}
@media(min-width:560px){.pillars-compact{grid-template-columns:repeat(4,1fr)}}
.pillar{padding:.55rem .65rem;flex-direction:column;text-align:center;gap:.25rem}
.pillar-body p{margin:0;font-size:.75rem;line-height:1.3}
.pillar-icon{font-size:1rem}
.pillar small{display:none}
.extra-tech-body{display:grid;gap:.85rem}
.tech-block{padding:.75rem;background:var(--surface2);border-radius:8px;border:1px solid var(--border)}
.tech-block-head{display:flex;justify-content:space-between;align-items:center;gap:.5rem;margin-bottom:.35rem}
.tech-block h4{margin:0;font-size:.85rem;font-weight:600}
.site-stats{background:transparent;border:none;padding:0;margin:0 0 .75rem}
.site-stats.hidden{display:none}
.stat-grid strong{font-size:1.1rem}
.stat small{font-size:.65rem}
.status-line{margin:0 0 1rem;padding:.35rem 0;border-top:1px solid var(--border);font-size:.78rem}
.drift-panel{padding:.55rem .75rem;display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;margin:0}
.drift-list{flex:1;min-width:200px;margin:0}
.baseline-banner{margin:0;padding:.65rem .85rem}
.verdict-critical{background:#2a1515;border-color:var(--err)}
.verdict-warning{background:#2a2210;border-color:var(--warn)}
.verdict-ok{background:#102a18;border-color:var(--ok)}
.verdict-info,.verdict-unknown{background:var(--surface);border-color:var(--accent)}
.verdict-ok .score{color:var(--ok)}
.verdict-warning .score{color:var(--warn)}
.verdict-critical .score{color:var(--err)}
#score-val{display:block}
h3{font-size:1rem;margin:0 0 .75rem;color:var(--text)}
h4{font-size:.85rem;margin:0 0 .5rem;color:var(--muted)}
.sub{color:var(--muted);font-size:.875rem;margin:.2rem 0 0}
.optimizer-headline{font-weight:500;color:var(--muted);margin:.25rem 0;font-size:.82rem}
.optimizer-panel,.edge-panel{background:transparent;border:none;padding:0;margin:0}
.roadmap-list{list-style:none;padding:0;margin:0;display:grid;gap:.5rem}
.roadmap-step{padding:.65rem .85rem;border-radius:8px;background:var(--bg);border:1px solid var(--border)}
.roadmap-step-head{display:flex;gap:.75rem;align-items:flex-start}
.roadmap-icon{font-size:1.1rem;flex-shrink:0;line-height:1.4}
.roadmap-step-body{flex:1;min-width:0}
.roadmap-step-body strong{display:block;font-size:.95rem;margin-bottom:.15rem}
.roadmap-meta{font-size:.7rem;color:var(--muted);text-transform:uppercase;letter-spacing:.03em}
.roadmap-summary{margin:.35rem 0 0;font-size:.875rem;color:var(--text)}
.roadmap-why{margin:.45rem 0 0;font-size:.82rem;color:var(--warn)}
.roadmap-action{margin:.25rem 0 0;font-size:.82rem;color:var(--accent)}
.roadmap-instr{margin:.45rem 0 0 .85rem;padding:0;font-size:.82rem;color:var(--muted)}
.roadmap-instr li{margin:.2rem 0}
.roadmap-done{border-color:#14532d;background:#0f1a12}
.roadmap-current{border-color:var(--accent);background:#1e3a5f22}
.roadmap-manual{border-color:#78350f;background:#1a1608}
.roadmap-auto{border-color:#334155}
.roadmap-blocked{opacity:.55}
.findings-summary{margin:0 0 .65rem;padding:.5rem .65rem;background:var(--bg);border-radius:6px;border-left:3px solid var(--warn);font-size:.82rem}
.findings-list{list-style:none;padding:0;margin:0;display:grid}
.finding-critical{border-color:#7f1d1d}
.finding-warning{border-color:#78350f}
.finding-info{border-color:#334155}
.finding-impact{margin:.25rem 0;font-size:.82rem;color:var(--text)}
.finding-evidence{margin:.35rem 0 0 1rem;padding:0;font-size:.78rem;color:var(--muted)}
.finding-evidence li{margin:.15rem 0}
.finding-actions{flex-shrink:0}
.finding-note{margin:.25rem 0 0;font-size:.78rem}
.finding-artifact{margin:.5rem 0;font-size:.8rem}
.finding-artifact-pre{max-height:140px;overflow:auto;font-size:.7rem;background:var(--bg);padding:.5rem;border-radius:6px;margin:.35rem 0 0}
.finding-manual{margin-top:.65rem;padding:.65rem;background:var(--bg);border-radius:8px;border:1px dashed var(--border)}
.finding-manual-title{font-size:.8rem;font-weight:600;margin:0 0 .35rem}
.finding-field{display:flex;flex-direction:column;gap:.2rem;font-size:.75rem;color:var(--muted);margin:.35rem 0}
.finding-field input,.finding-field textarea{background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:.35rem .5rem;border-radius:6px}
.finding-field input[type=checkbox]{width:auto;align-self:flex-start}
.draft-preview{max-height:200px;overflow:auto;font-size:.75rem;background:#1e293b;padding:.75rem;border-radius:6px;white-space:pre-wrap}
.human-gate{color:#fbbf24}
.info-btn{position:absolute;top:0;right:0;transform:translate(50%,-30%);width:1.25rem;height:1.25rem;padding:0;border:1px solid var(--border);border-radius:50%;background:var(--surface2);color:var(--muted);font-size:.65rem;line-height:1.1;cursor:pointer;z-index:2}
.stat{position:relative}
.stat .info-btn{top:.15rem;right:.15rem;transform:none}
.stat .info-btn,.cache-head .info-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;margin-left:.25rem;transform:none}
.info-btn-inline{position:relative;display:inline-flex;width:1.1rem;height:1.1rem;font-size:.6rem;vertical-align:middle;margin-left:.2rem;transform:none}
.info-btn:hover,.info-btn:focus{color:var(--accent);border-color:var(--accent);outline:none}
.metric-modal{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:1rem}
.metric-modal.hidden{display:none!important}
.metric-modal-backdrop{position:absolute;inset:0;z-index:0;background:rgba(0,0,0,.65)}
.metric-modal-box{position:relative;z-index:1;max-width:32rem;width:100%;max-height:85vh;overflow:auto;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:1.25rem 1.5rem;box-shadow:0 8px 32px rgba(0,0,0,.4);color:var(--text)}
.metric-modal-close{position:absolute;top:.5rem;right:.75rem;border:none;background:none;color:var(--muted);font-size:1.5rem;cursor:pointer;line-height:1}
.metric-modal-close:hover{color:var(--text)}
.metric-dl{margin:.75rem 0 0}
.metric-dl dt{font-size:.7rem;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);margin-top:.85rem}
.metric-dl dt:first-child{margin-top:0}
.metric-dl dd{margin:.25rem 0 0;font-size:.9rem;line-height:1.45}
.metric-now{color:var(--accent);font-weight:500}
.operation-modal{position:fixed;inset:0;z-index:1100;display:flex;align-items:center;justify-content:center;padding:1rem}
.operation-modal.hidden{display:none!important}
body.operation-busy{overflow:hidden}
.operation-modal-backdrop{position:absolute;inset:0;z-index:0;background:rgba(0,0,0,.72)}
.operation-modal-box{position:relative;z-index:1;max-width:24rem;width:100%;background:var(--surface);border:1px solid var(--accent);border-radius:12px;padding:1.35rem 1.5rem 1.25rem;box-shadow:0 12px 40px rgba(0,0,0,.5);text-align:center}
.operation-modal-box h3{margin:0 0 .65rem;font-size:1rem}
.operation-status{margin:0;font-size:.875rem;color:var(--muted);line-height:1.45;min-height:2.5em}
.operation-modal.operation-error .operation-modal-box{border-color:var(--err)}
.operation-modal.operation-error .operation-status{color:var(--err)}
.operation-modal.operation-done .operation-modal-box{border-color:var(--ok)}
.operation-modal.operation-done .operation-status{color:var(--ok)}
.operation-spinner{width:2.25rem;height:2.25rem;margin:0 auto .85rem;border:3px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:operation-spin .75s linear infinite}
.operation-modal.operation-done .operation-spinner,.operation-modal.operation-error .operation-spinner{animation:none;border-top-color:var(--border);opacity:.35}
@keyframes operation-spin{to{transform:rotate(360deg)}}
.operation-steps{list-style:none;padding:0;margin:.85rem 0 0;text-align:left;font-size:.78rem;color:var(--muted)}
.operation-steps.hidden{display:none}
.operation-step{padding:.25rem 0 .25rem 1.1rem;position:relative}
.operation-step::before{content:'○';position:absolute;left:0;color:var(--border)}
.operation-step.active{color:var(--accent);font-weight:500}
.operation-step.active::before{content:'▸';color:var(--accent)}
.operation-step.done{color:var(--ok)}
.operation-step.done::before{content:'✓';color:var(--ok)}
.manual-head-actions{display:flex;align-items:center;gap:.45rem;flex-wrap:wrap}
.section-hint{display:none}
.hero-actions{display:none}
.btn{background:var(--accent);color:#fff;border:none;border-radius:8px;padding:.5rem 1rem;font-size:.85rem;cursor:pointer}
.btn:hover{filter:brightness(1.08)}
.btn:disabled{opacity:.5;cursor:not-allowed}
.btn-lg{padding:.65rem 1.35rem;font-size:.95rem;font-weight:600}
.btn-ghost{background:var(--surface2);color:var(--text);border:1px solid var(--border)}
.btn-sm{padding:.25rem .55rem;font-size:.75rem}
.status-line{font-size:.8rem;color:var(--muted);margin:0 0 1.25rem;min-height:1.2rem}
.baseline-banner{background:#2a2210;border:1px solid #78350f;border-radius:10px;padding:.85rem 1rem;margin-bottom:1rem}
.baseline-banner.hidden{display:none}
.baseline-banner .sub{margin:.35rem 0 0}
.drift-panel{background:#1a1010;border:1px solid #7f1d1d;border-radius:10px;padding:.75rem 1rem;margin-bottom:1rem}
.drift-panel.hidden{display:none}
.drift-list{list-style:none;padding:0;margin:.5rem 0 0}
.drift-item{font-size:.82rem;padding:.3rem 0;color:var(--muted)}
.drift-item.drift-critical{color:#fca5a5}
.drift-kind{text-transform:uppercase;font-size:.7rem;color:var(--warn);margin-right:.35rem}
.site-stats-old{display:none}
.cache-index,.onboarding{background:transparent;border:none;padding:0;margin:0}
.cache-index.hidden,.onboarding.hidden{display:none}
.stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem;text-align:center}
.stat strong{display:block;font-size:1.1rem;color:var(--accent)}
.stat small{color:var(--muted);font-size:.65rem;text-transform:uppercase}
.stat-warn strong{color:var(--warn)}
.stat-grid-5{grid-template-columns:repeat(5,1fr)}
@media(max-width:640px){.stat-grid-5{grid-template-columns:repeat(2,1fr)}}
.onboarding h3{font-size:.95rem;margin:0 0 .5rem}
.onboarding-list{list-style:none;padding:0;margin:0 0 .5rem}
.onb-step{padding:.35rem 0;font-size:.85rem;color:var(--muted);display:flex;gap:.5rem;align-items:flex-start}
.onb-step.done{color:var(--text)}
.onb-check{flex-shrink:0;width:1.1rem;color:var(--ok)}
.onb-step:not(.done) .onb-check{color:var(--muted)}
.mono{font-family:ui-monospace,monospace;font-size:.8rem}
.admin-token-label{display:flex;flex-direction:column;gap:.25rem;font-size:.8rem;color:var(--muted);margin:.5rem 0}
.admin-token-label input{background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:.45rem .6rem;border-radius:8px;max-width:420px}
.section{margin-bottom:1.75rem}
.pillars{display:grid;gap:.55rem}
.pillar{display:flex;gap:.65rem;padding:.75rem 1rem;border-radius:10px;background:var(--surface);border:1px solid var(--border)}
.pillar-critical{border-color:#7f1d1d;background:#1a1010}
.pillar-warning{border-color:#78350f;background:#1a1608}
.pillar-ok{border-color:#14532d;background:#0f1a12}
.pillar-icon{font-size:1.2rem}
.pillar p{margin:.1rem 0;font-size:.875rem}
.pillar small{color:var(--muted);font-size:.75rem}
.plan-cols{display:grid;gap:1.25rem}
@media(min-width:600px){.plan-cols{grid-template-columns:1fr 1fr}}
.plan-list{list-style:none;padding:0;margin:0}
.plan-item{display:flex;gap:.65rem;padding:.65rem 0;border-bottom:1px solid var(--border)}
.plan-num{flex-shrink:0;width:1.5rem;height:1.5rem;background:var(--accent);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:600}
.pri-high .plan-num{background:var(--err)}
.plan-item p{margin:.2rem 0 0;font-size:.8rem;color:var(--muted)}
.muted-col .plan-item{opacity:.85}
.extra{background:var(--surface);border:1px solid var(--border);border-radius:10px;margin-bottom:.65rem}
.extra summary{padding:.75rem 1rem;cursor:pointer;font-size:.875rem;color:var(--muted)}
.extra summary:hover{color:var(--text)}
.extra-body{padding:0 1rem 1rem}
.add-panel{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:1rem;margin-bottom:1rem}
.add-panel.hidden{display:none}
.form-grid{display:grid;gap:.65rem;max-width:480px}
.form-grid label{display:flex;flex-direction:column;gap:.25rem;font-size:.8rem;color:var(--muted)}
.form-grid input{background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:.45rem .6rem;border-radius:8px}
.toolbar{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.5rem}
.msg{font-size:.85rem;margin-top:.5rem;color:var(--ok)}
.msg.hidden{display:none}
.q-list{display:grid;gap:.5rem}
.q-item{background:var(--surface2);border-radius:8px;padding:.6rem;font-size:.85rem}
.q-src{font-size:.65rem;text-transform:uppercase;color:var(--muted)}
.q-text{margin:.3rem 0;padding:.3rem;background:var(--bg);border-radius:4px;min-height:1.5rem}
pre{margin:0;font-size:.75rem;color:var(--muted);overflow:auto;max-height:200px}
.apply-head{display:flex;justify-content:space-between;align-items:center;gap:.5rem;margin-bottom:.5rem}
.apply-fixes{display:grid;gap:.65rem}
.apply-fix{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:.85rem}
.apply-fix.pri-critical{border-color:#7f1d1d}
.apply-fix-head{display:flex;justify-content:space-between;align-items:center;gap:.5rem}
.apply-type{font-size:.65rem;text-transform:uppercase;color:var(--muted)}
.apply-artifact{background:var(--surface2);padding:.5rem;border-radius:6px;font-size:.7rem;overflow:auto;max-height:160px;margin:.5rem 0}
.advisor-panel{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:1rem;margin-bottom:1.75rem}
.advisor-head{display:flex;justify-content:space-between;align-items:center;gap:.5rem;margin-bottom:.35rem}
.advisor-badge{font-size:.7rem;padding:.2rem .5rem;border-radius:999px;background:var(--surface2);color:var(--muted)}
.advisor-badge.ok{background:#14532d;color:#86efac}
.advisor-badge.err{background:#3f1515;color:#fca5a5}
.advisor-badge.warn{background:#422006;color:#fcd34d}
.edge-panel{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:1rem;margin-bottom:1.75rem}
.edge-actions{display:flex;flex-wrap:wrap;gap:.45rem;margin-top:.65rem}
.edge-smoke-panel{margin-top:.75rem;padding-top:.65rem;border-top:1px solid var(--border)}
.edge-smoke-panel.hidden{display:none}
.edge-smoke-list{list-style:none;padding:0;margin:.45rem 0 0;font-size:.78rem}
.edge-smoke-item{padding:.2rem 0;color:var(--muted)}
.edge-smoke-item.ok{color:var(--ok)}
.edge-smoke-item.fail{color:var(--err)}
.edge-verdict{margin:.75rem 0;padding:.65rem .85rem;background:var(--surface2);border-radius:8px;font-size:.875rem}
.edge-fix-list,.edge-prereq-list{margin:.5rem 0;padding-left:1.25rem;font-size:.85rem}
.edge-fix{margin-bottom:.45rem}
.edge-fix-layer{font-size:.65rem;text-transform:uppercase;color:var(--accent);background:var(--surface2);padding:.1rem .35rem;border-radius:4px}
.edge-prereq-list{color:var(--muted)}
.foot{margin-top:2rem;padding-top:1rem;border-top:1px solid var(--border);color:var(--muted);font-size:.75rem}
`;
