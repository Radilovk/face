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
        <p class="sub">Един екран — вердикт, план, поправки</p>
      </div>
      <div class="topbar-meta">
        <select id="site-select" aria-label="Избери сайт"></select>
        <button type="button" class="btn btn-ghost btn-sm" id="btn-add-toggle">+ Сайт</button>
      </div>
    </header>

    <section id="add-panel" class="add-panel">
      <p class="lead" id="add-lead">Добавете сайт тук — всички домейни влизат през този интерфейс.</p>
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

    <div id="alerts-wrap" class="alerts-wrap">
      <section id="baseline-banner" class="baseline-banner hidden">
        <strong>Baseline ${infoBtn('baseline_gate')}</strong>
        <p id="baseline-msg" class="sub">…</p>
      </section>
      <section id="drift-panel" class="drift-panel hidden" aria-label="Drift alerts">
        <span id="drift-badge" class="advisor-badge">—</span>
        <ul id="drift-alerts" class="drift-list"></ul>
      </section>
    </div>

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

    <section id="welcome-wizard" class="welcome-wizard hidden" aria-label="Първи стъпки">
      <div class="wizard-head">
        <strong id="wizard-title">Как работи AI Visibility</strong>
        <button type="button" class="btn btn-sm btn-ghost" id="btn-wizard-dismiss">Разбрах</button>
      </div>
      <ol id="wizard-steps" class="wizard-steps"></ol>
    </section>

    <section id="journey-bar" class="journey-bar hidden" aria-label="Път на оптимизация">
      <div class="journey-phases" id="journey-phases"></div>
      <p id="journey-focus" class="journey-focus sub">—</p>
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
    </section>

    <section id="operation-history" class="operation-history hidden" aria-label="История на операции">
      <details id="op-history-details" open>
        <summary>Последни операции (<span id="op-history-count">0</span>)</summary>
        <ul id="op-history-list" class="op-history-list"></ul>
      </details>
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
          <summary>Още действия</summary>
          <div class="command-more-grid">
            <button type="button" class="btn btn-ghost btn-sm" id="btn-auto-optimize">Авто-оптимизация</button>
            <button type="button" class="btn btn-ghost btn-sm" id="btn-reprocess">Провери цитатите</button>
            <button type="button" class="btn btn-ghost btn-sm" id="btn-edge-activate">Edge прокси</button>
            <button type="button" class="btn btn-ghost btn-sm" id="btn-refresh">↻ Обнови данни</button>
            <button type="button" class="btn btn-ghost btn-sm" id="btn-export-manual-bar">📥 Ръчен checklist</button>
            <a class="btn btn-ghost btn-sm" id="btn-report" href="#" target="_blank" rel="noopener">📄 PDF отчет</a>
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
        <p id="plan-honesty" class="roadmap-honesty sub hidden">…</p>
        <p id="plan-summary" class="findings-summary sub hidden">…</p>
        <p class="sub manual-hint">Един хронологичен списък — системни стъпки, ръчни задачи и автоматични поправки.</p>
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

    <section id="metrics-panel" class="metrics-panel hidden" aria-label="Обзор">
      <div class="pillars-wrap">
        <h3 class="metrics-subhead">4 стълба ${infoBtn('pillar_visibility')}</h3>
        <div id="pillars" class="pillars pillars-compact"></div>
      </div>
    </section>

    <div id="site-stats" class="hidden" aria-hidden="true">
      <strong id="stat-runs">—</strong>
      <strong id="stat-obs">—</strong>
      <strong id="stat-sov">—</strong>
      <strong id="stat-pending">—</strong>
    </div>

    <p id="status-line" class="status-line hidden" aria-hidden="true">…</p>

    <nav id="pipeline-bar" class="pipeline-bar hidden" aria-hidden="true"></nav>
    <ol id="plan-week" class="hidden" aria-hidden="true"></ol>
    <ol id="plan-month" class="hidden" aria-hidden="true"></ol>

    <details class="extra extra-tech" id="extra-tech-wrap">
      <summary id="extra-tech-summary">⚙️ Технически детайли</summary>
      <p id="extra-tech-note" class="sub extra-tech-note hidden"></p>
      <div class="extra-body extra-tech-body">
        <section class="tech-block edge-panel" id="edge-panel">
          <div class="tech-block-head">
            <h4>Edge ${infoBtn('edge_status')}</h4>
            <span id="edge-status-badge" class="advisor-badge">…</span>
          </div>
          <div id="edge-verdict" class="edge-verdict sub">Стартирайте анализ за решение.</div>
          <ul id="edge-fixes" class="edge-fix-list"></ul>
          <ul id="edge-prereq" class="edge-prereq-list"></ul>
        </section>
        <section id="onboarding-panel" class="tech-block onboarding hidden">
          <h4>CNAME / DNS</h4>
          <ol id="onboarding-steps" class="onboarding-list"></ol>
          <p id="onboarding-dns" class="sub mono">…</p>
        </section>
        <section class="tech-block optimizer-panel" id="optimizer-panel">
          <div class="tech-block-head">
            <h4>Optimizer ${infoBtn('optimizer')}</h4>
            <span id="optimizer-badge" class="advisor-badge">…</span>
          </div>
          <p id="optimizer-headline" class="optimizer-headline sub">—</p>
          <ul id="optimizer-auto" class="edge-fix-list hidden"></ul>
          <ul id="optimizer-human" class="edge-prereq-list hidden"></ul>
          <details id="optimizer-drafts-wrap" class="hidden">
            <summary>Content draft</summary>
            <pre id="optimizer-draft-preview" class="draft-preview"></pre>
          </details>
        </section>
        <section id="cache-index-panel" class="tech-block cache-index hidden">
          <div class="tech-block-head">
            <h4>Кеш ${infoBtn('cache_coverage')}</h4>
            <span id="cache-coverage-badge" class="advisor-badge">—</span>
          </div>
          <div class="stat-grid stat-grid-5">
            <div class="stat">${infoBtn('cache_median')}<strong id="cache-median">—</strong><small>Median</small></div>
            <div class="stat">${infoBtn('cache_p25')}<strong id="cache-p25">—</strong><small>P25</small></div>
            <div class="stat">${infoBtn('cache_p75')}<strong id="cache-p75">—</strong><small>P75</small></div>
            <div class="stat">${infoBtn('bot_verified')}<strong id="stat-bot-v">—</strong><small>Bot ✓</small></div>
            <div class="stat">${infoBtn('bot_fake')}<strong id="stat-bot-u">—</strong><small>Bot fake</small></div>
          </div>
          <p id="cache-note" class="sub">…</p>
        </section>
      </div>
    </details>

    <!-- Collapsible extras -->
    <details class="extra">
      <summary>💬 Gemini съветник (опционално)</summary>
      <div class="extra-body">
        <span id="advisor-badge" class="advisor-badge">…</span>
        <div id="chat-messages" class="chat-messages"></div>
        <div id="chat-actions" class="chat-actions"></div>
        <form id="chat-form" class="chat-form">
          <textarea id="chat-input" rows="2" placeholder="Въпрос към Gemini…"></textarea>
          <button type="submit" class="btn btn-sm" id="btn-chat-send">Изпрати</button>
        </form>
      </div>
    </details>

    <details class="extra">
      <summary>❓ Въпроси за AI (редакция)</summary>
      <div class="extra-body">
        <div class="toolbar">
          <button type="button" class="btn btn-sm" id="btn-gen-q">✨ Авто-генерирай</button>
          <button type="button" class="btn btn-sm btn-ghost" id="btn-add-q">+ Ръчно</button>
        </div>
        <div id="questions-list" class="q-list"></div>
      </div>
    </details>

    <details class="extra">
      <summary>🔐 Admin достъп (production)</summary>
      <div class="extra-body">
        <p class="sub" id="auth-hint">…</p>
        <label class="admin-token-label">ADMIN_TOKEN
          <input type="password" id="admin-token" placeholder="Bearer token от Worker secrets" autocomplete="off">
        </label>
        <button type="button" class="btn btn-sm" id="btn-save-token">Запази в сесията</button>
      </div>
    </details>

    <details class="extra">
      <summary>🔧 Технически детайли</summary>
      <div class="extra-body"><pre id="tech-detail">—</pre></div>
    </details>

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

    let chatHistory = [];
    let advisorReady = false;
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
      { id: 'technical', label: 'Техника', hint: 'Crawl, schema, robots' },
      { id: 'measurement', label: 'Измерване', hint: 'SOV и цитати' },
      { id: 'positioning', label: 'Позиция', hint: 'Конкуренция в AI' },
      { id: 'dominance', label: 'Лидерство', hint: 'Monitor & remeasure' },
    ];
    const PHASE_ORDER = PRODUCT_PHASES.map(p => p.id);
    const OP_HISTORY_KEY = 'aiv_op_history';
    const WIZARD_KEY = 'aiv_wizard_seen';
    const MAX_OP_HISTORY = 5;

    function wizardStorageKey() {
      return WIZARD_KEY + ':' + (selectedDomain || '_global');
    }

    function edgeIsNeeded(decision) {
      if (!decision || decision.error) return false;
      if (decision.edge_active) return true;
      if ((decision.fixes?.length ?? 0) > 0) return true;
      return decision.status === 'pending_cname';
    }

    function applyContextualVisibility() {
      const needed = edgeIsNeeded(lastEdgeDecision);
      $('edge-panel')?.classList.toggle('context-hidden', !needed);
      $('btn-edge-activate')?.classList.toggle('hidden', !needed);
      const note = $('extra-tech-note');
      if (note) {
        if (needed) {
          note.classList.add('hidden');
        } else {
          note.textContent = 'Edge/CNAME не са нужни за този сайт — техническата основа е достатъчна за измерване.';
          note.classList.remove('hidden');
        }
      }
      $('extra-tech-summary').textContent = needed
        ? '⚙️ Edge, DNS, кеш и drafts'
        : '⚙️ Кеш и drafts (Edge не е нужен)';
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

      $('journey-phases').innerHTML = PRODUCT_PHASES.map((phase, idx) => {
        let state = 'future';
        if (idx < currentIdx) state = 'done';
        else if (idx === currentIdx) state = 'current';
        if (phase.id === 'technical' && baselineDone) state = idx < currentIdx ? 'done' : (idx === currentIdx ? 'current' : state);
        if (phase.id === 'measurement' && hasRuns && idx <= currentIdx) state = idx < currentIdx ? 'done' : 'current';
        const icon = state === 'done' ? '✓' : state === 'current' ? '●' : '○';
        return '<div class="journey-phase journey-' + state + '" data-phase="' + phase.id + '">' +
          '<span class="journey-icon" aria-hidden="true">' + icon + '</span>' +
          '<span class="journey-label">' + escHtml(phase.label) + '</span>' +
          '<small class="journey-hint">' + escHtml(phase.hint) + '</small></div>';
      }).join('');
      $('journey-focus').textContent = strategyData.phase_focus || strategyData.verdict?.summary || '—';
    }

    function renderWelcomeWizard(strategyData) {
      const panel = $('welcome-wizard');
      if (!selectedDomain) {
        panel.classList.add('hidden');
        return;
      }
      if (sessionStorage.getItem(wizardStorageKey()) === '1') {
        panel.classList.add('hidden');
        return;
      }
      const runs = strategyData?.stats?.runCount ?? 0;
      const steps = [
        { id: 'add', label: 'Добавете сайт', done: Boolean(strategyData?.registered), detail: 'Домейн, марка, вертикал' },
        { id: 'analyze', label: 'Пълен AI анализ', done: runs > 0, detail: 'Одит → въпроси → измерване (~2 мин)' },
        { id: 'sov', label: 'Вижте AI-SOV и изместване', done: runs > 0, detail: 'Метриките „Как AI ви вижда“ по-горе' },
        { id: 'fix', label: 'Поправете задачите от плана', done: false, detail: 'Ръчни + автоматични стъпки по-долу' },
        { id: 'remeasure', label: 'Повторете измерване', done: false, detail: 'След CMS/DNS промени — главният бутон' },
      ];
      if (runs > 0 && (strategyData?.manual_tasks?.length ?? 0) === 0) {
        steps[3].done = true;
      }
      panel.classList.remove('hidden');
      $('wizard-steps').innerHTML = steps.map((s, i) =>
        '<li class="wizard-step ' + (s.done ? 'done' : '') + '">' +
        '<span class="wizard-num">' + (s.done ? '✓' : (i + 1)) + '</span>' +
        '<div><strong>' + escHtml(s.label) + '</strong>' +
        '<p class="sub">' + escHtml(s.detail) + '</p></div></li>'
      ).join('');
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
      const panel = $('operation-history');
      const list = JSON.parse(sessionStorage.getItem(OP_HISTORY_KEY) || '[]')
        .filter(r => r.domain === selectedDomain)
        .slice(0, MAX_OP_HISTORY);
      if (!selectedDomain || !list.length) {
        panel.classList.add('hidden');
        return;
      }
      panel.classList.remove('hidden');
      $('op-history-count').textContent = String(list.length);
      $('op-history-list').innerHTML = list.map(r => {
        const icon = r.status === 'ok' ? '✓' : r.status === 'error' ? '✕' : '⏳';
        const when = new Date(r.at).toLocaleString('bg-BG', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        return '<li class="op-history-item op-history-' + r.status + '">' +
          '<span class="op-history-icon">' + icon + '</span>' +
          '<div class="op-history-body"><strong>' + escHtml(r.title) + '</strong>' +
          '<span class="op-history-when">' + escHtml(when) + '</span>' +
          (r.detail ? '<p class="sub">' + escHtml(r.detail.slice(0, 160)) + '</p>' : '') +
          '</div></li>';
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
      if (result?.observations != null) rows.push({ label: 'Observations', value: String(result.observations) });
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
      return data?.error || data?.hint || res.status;
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
      const res = await fetch(API('/api/sites'));
      const data = await res.json();
      sites = data.sites || [];
      const sel = $('site-select');
      const addPanel = $('add-panel');
      const addLead = $('add-lead');
      if (!sites.length) {
        sel.innerHTML = '<option value="">— добавете сайт —</option>';
        selectedDomain = '';
        addPanel.classList.remove('hidden');
        addLead.textContent = 'Няма регистрирани сайтове. Добавете домейн по-долу — това е единственият вход.';
        $('btn-primary-action').disabled = true;
        $('verdict-headline').textContent = 'Добавете първи сайт';
        $('verdict-summary').textContent = 'Домейн, марка, вертикал — след това „Добави + анализ“.';
        return;
      }
      addPanel.classList.add('hidden');
      $('btn-primary-action').disabled = false;
      sel.innerHTML = sites.map(s =>
        '<option value="' + s.domain + '">' + s.domain + '</option>'
      ).join('');
      if (!selectedDomain || !sites.find(s => s.domain === selectedDomain)) {
        selectedDomain = sites[0].domain;
      }
      sel.value = selectedDomain;
      sel.onchange = () => {
        selectedDomain = sel.value;
        chatHistory = [];
        $('chat-messages').innerHTML = '';
        $('chat-actions').innerHTML = '';
        renderOperationHistory();
        loadStrategy();
      };
    }

    function renderPipeline(pipeline) {
      const bar = $('pipeline-bar');
      if (!pipeline?.steps) { bar.innerHTML = ''; return; }
      bar.innerHTML = pipeline.steps.map(s =>
        '<span class="pipe-step ' + (s.done ? 'done' : (s.id === pipeline.current ? 'current' : '')) + '">' +
        escHtml(s.label) + '</span>'
      ).join('<span class="pipe-arrow">→</span>');
    }

    const GATE_LABELS = {
      dns_cname: 'CNAME / DNS',
      cms_publish: 'Текст в CMS',
      strategic_review: 'Преглед на Edge',
    };

    const ACTION_HINT_LABELS = {
      run_analysis: '→ „🚀 1. Анализ“',
      run_auto_optimizer: '→ „🤖 Auto-оптимизация“',
      activate_edge: '→ „⚡ 2. Приложи Edge“',
      reprocess: '→ „↻ Reprocess“',
      generate_questions: '→ „✨ Авто-генерирай“ въпроси',
      add_site: '→ „+ Сайт“',
      cname_dns: '→ DNS панел + „↻ Обнови“',
      publish_cms: '→ „Content drafts“ + CMS',
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
        '<span class="unified-kind-badge">📋 План</span>' +
        '<span class="roadmap-icon">' + s.status_icon + '</span>' +
        '<div class="unified-plan-body">' +
        '<strong>' + escHtml(s.title) + '</strong>' +
        '<span class="roadmap-meta">' + escHtml(s.status_label) + '</span>' +
        (compact ? '' : '<p class="roadmap-summary">' + escHtml(s.summary) + '</p>') +
        why + instr +
        '</div></div></li>';
    }

    function htmlManualTaskCard(t) {
      const sev = t.severity === 'critical' ? 'finding-critical' : (t.severity === 'warning' ? 'finding-warning' : '');
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
        '<span class="unified-kind-badge">👤 Ръчно</span>' +
        '<div class="unified-plan-body">' +
        '<strong>' + escHtml(t.title) + '</strong>' +
        (t.instructions ? '<p class="sub">' + escHtml(t.instructions) + '</p>' : '') +
        (t.impact ? '<p class="finding-impact">' + escHtml(t.impact) + '</p>' : '') +
        artifactBlock +
        renderManualFormFields(t.manual_form, t.id) +
        '<div class="manual-task-actions">' + genBtn +
        '<button type="button" class="btn btn-sm manual-save" data-finding-id="' + escHtml(t.id) + '">✓ Готово</button></div>' +
        '</div></div></li>';
    }

    function htmlAutoFindingCard(f) {
      const sevClass = 'finding-' + f.severity;
      const auto = f.automation || {};
      const modeShort = { auto: '🤖', semi_auto: '🤖+👤', manual: '👤' };
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
          escHtml(auto.label || 'Приложи') + '</button>'
        : '';
      return '<li class="unified-plan-item finding-card ' + sevClass + '" data-kind="auto" data-finding-id="' + escHtml(f.id) + '">' +
        '<div class="unified-plan-head">' +
        '<span class="unified-kind-badge">🤖 Авто</span>' +
        '<span class="finding-mode">' + (modeShort[auto.mode] || '') + '</span>' +
        '<div class="unified-plan-body">' +
        '<div class="finding-row"><strong class="finding-title">' + escHtml(f.title) + '</strong>' +
        '<div class="finding-actions">' + applyBtn + '</div></div>' +
        '<details class="finding-details"><summary>Детайли</summary>' + detailsInner + '</details>' +
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
      const totalActive = activeRoadmap.length + manualTasks.length + autoFindings.length;

      if (!strategyData.registered && !strategyData.probe) {
        panel.classList.add('hidden');
        return;
      }
      panel.classList.remove('hidden');
      $('plan-domain').textContent = selectedDomain || strategyData.domain || '—';

      const honesty = roadmap?.honesty_note || '';
      const honestyEl = $('plan-honesty');
      if (honesty) {
        honestyEl.textContent = honesty;
        honestyEl.classList.remove('hidden');
      } else {
        honestyEl.classList.add('hidden');
      }
      const summaryText = strategyData.findings_summary || roadmap?.summary || '';
      const summaryEl = $('plan-summary');
      if (summaryText) {
        summaryEl.textContent = summaryText;
        summaryEl.classList.remove('hidden');
      } else {
        summaryEl.classList.add('hidden');
      }

      const critical = manualTasks.filter(t => t.severity === 'critical').length +
        autoFindings.filter(f => f.severity === 'critical').length;
      const warning = manualTasks.filter(t => t.severity === 'warning').length +
        autoFindings.filter(f => f.severity === 'warning').length;
      const badge = $('plan-count-badge');
      const pending = manualTasks.length + autoFindings.length + activeRoadmap.length;
      badge.textContent = pending ? pending + ' активни' : '✓ готов';
      badge.className = 'advisor-badge ' + (critical > 0 ? 'err' : warning > 0 ? 'warn' : 'ok');

      const sortManual = [...manualTasks].sort((a, b) => {
        const w = { critical: 0, warning: 1, info: 2 };
        return (w[a.severity] ?? 9) - (w[b.severity] ?? 9);
      });
      const sortAuto = [...autoFindings].sort((a, b) => {
        const w = { critical: 0, warning: 1, info: 2 };
        return (w[a.severity] ?? 9) - (w[b.severity] ?? 9);
      });

      const activeHtml = [
        ...activeRoadmap.map(s => htmlRoadmapStep(s, false)),
        ...sortManual.map(t => htmlManualTaskCard(t)),
        ...sortAuto.map(f => htmlAutoFindingCard(f)),
      ].join('');

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
          const el = document.querySelector('.manual-task-card[data-task-id="' + critical.id + '"]');
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el?.classList.add('manual-task-highlight');
        };
      } else if (auto.action === 'activate_edge') {
        btn.textContent = '⚡ Edge';
        btn.onclick = () => activateEdge();
      } else {
        btn.textContent = 'Виж детайли';
        btn.onclick = () => $('manual-workbench')?.scrollIntoView({ behavior: 'smooth' });
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
        : (runs != null && runs > 0 ? runs + ' отговора — SOV след observations' : 'Пуснете пълен анализ');

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
      if (strategyData?.product_phase) {
        hint.textContent = (strategyData.phase_focus || step.desc) + ' · Фаза: ' + strategyData.product_phase;
      }
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
      return '<div class="finding-manual manual-task-form" data-finding-id="' + escHtml(taskId) + '">' +
        '<p class="finding-manual-title">' + escHtml(form.title) + '</p>' +
        (form.hint ? '<p class="sub mono">' + escHtml(form.hint) + '</p>' : '') +
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
      });
    }

    async function applyFindingFix(findingId, intent) {
      if (!selectedDomain || busy) return;
      return withOperation('Автоматична поправка', 'Прилагане: ' + findingId + '…', async (setStatus) => {
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
        log('Fix OK: ' + findingId + ' — ' + (data.result?.message || data.action || 'готово'));
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

    function renderPlan(plan) {
      const renderItems = (items) => (items || []).map(a =>
        '<li class="plan-item pri-' + a.priority + '">' +
        '<span class="plan-num">' + a.step + '</span>' +
        '<div><strong>' + escHtml(a.title) + '</strong>' +
        '<p>' + escHtml(a.detail) + '</p></div></li>'
      ).join('') || '<li class="sub">—</li>';

      $('plan-week').innerHTML = renderItems(plan?.this_week);
      $('plan-month').innerHTML = renderItems(plan?.this_month);
    }

    function renderChatMessage(role, text) {
      const el = $('chat-messages');
      const div = document.createElement('div');
      div.className = 'chat-msg chat-' + role;
      div.innerHTML = '<span class="chat-role">' + (role === 'user' ? 'Вие' : 'Gemini') + '</span>' +
        '<div class="chat-text">' + escHtml(text).replace(/\\n/g, '<br>') + '</div>';
      el.appendChild(div);
      el.scrollTop = el.scrollHeight;
    }

    function renderChatActions(actions) {
      const el = $('chat-actions');
      if (!actions?.length) { el.innerHTML = ''; return; }
      el.innerHTML = actions.map(a =>
        '<button type="button" class="btn btn-sm chat-action" data-action="' + escHtml(a.action) + '" title="' + escHtml(a.reason || '') + '">' +
        escHtml(a.label) + '</button>'
      ).join('');
      el.querySelectorAll('.chat-action').forEach(btn => {
        btn.onclick = () => executeAdvisorAction(btn.dataset.action);
      });
    }

    async function executeAdvisorAction(action) {
      if (action === 'run_analysis') return runFullAnalysis();
      if (action === 'run_auto_optimizer') return runAutoOptimize();
      if (action === 'generate_apply') return runAutoOptimize();
      if (action === 'refresh_strategy') { await loadStrategy(); await loadEdgeDecision(); return; }
      if (action === 'open_report') { window.open(API('/report/' + encodeURIComponent(selectedDomain)), '_blank'); return; }
      if (action === 'generate_questions') { $('btn-gen-q').click(); return; }
    }

    async function loadModelsStatus() {
      try {
        const res = await fetch(API('/api/models/status'));
        const data = await res.json();
        window.__aivModels = data;
        if (data.gemini?.deprecated_warning) {
          log('⚠ ' + data.gemini.deprecated_warning);
        }
        if (advisorReady && data.gemini?.model) {
          $('advisor-badge').textContent = 'Gemini · ' + data.gemini.model;
        }
      } catch { /* optional */ }
    }

    async function loadAdvisorStatus() {
      try {
        const res = await fetch(API('/api/advisor/status'));
        const data = await res.json();
        advisorReady = data.configured;
        const badge = $('advisor-badge');
        badge.textContent = data.configured ? ('Gemini · ' + (data.model || 'ok')) : 'няма API key';
        badge.className = 'advisor-badge ' + (data.configured ? 'ok' : 'err');
        if (!data.configured) {
          renderChatMessage('model', data.hint || 'GEMINI_API_KEY не е конфигуриран в Worker.');
        }
      } catch {
        $('advisor-badge').textContent = 'offline';
      }
    }

    async function sendChatMessage(text) {
      if (!selectedDomain) { log('Изберете сайт'); return; }
      if (!advisorReady) { log('Gemini не е конфигуриран'); return; }
      const msg = text.trim();
      if (!msg) return;

      renderChatMessage('user', msg);
      chatHistory.push({ role: 'user', content: msg });
      $('btn-chat-send').disabled = true;
      log('Gemini мисли…');

      try {
        const res = await apiFetch('/api/advisor/chat', {
          method: 'POST',
          body: JSON.stringify({ domain: selectedDomain, message: msg, history: chatHistory.slice(0, -1) })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(authErrorHint(res, data));
        renderChatMessage('model', data.reply);
        chatHistory.push({ role: 'model', content: data.reply });
        renderChatActions(data.actions);
        log('Gemini · score ' + (data.context_summary?.score ?? '—'));
      } catch (e) {
        renderChatMessage('model', 'Грешка: ' + e.message);
        log('Gemini: ' + e.message);
      } finally {
        $('btn-chat-send').disabled = false;
        $('chat-input').value = '';
      }
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
        note.textContent = cache?.note || 'Нужни observations + bot hits (tenant) или dateModified (external).';
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
          ' observations с cache age (72h прозорец).';
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
      if (!edgeIsNeeded(lastEdgeDecision)) {
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
        $('onboarding-dns').textContent = dns.type + ' ' + dns.name + ' → ' + dns.target;
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
        renderWelcomeWizard(strategy);
        renderCommandCenter(strategy);
        lastApplyPlan = await loadApplyPlan();
        renderPillars(strategy.pillars);
        $('metrics-panel')?.classList.toggle('hidden', !(strategy.pillars?.length));
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
      return withOperation('Проверка на цитатите', 'Verify + classify…', async (setStatus) => {
        setStatus('Обработка на observations…');
        const res = await apiFetch('/api/citations/reprocess', { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(authErrorHint(res, data));
        setStatus('Презареждане на метрики…');
        log('Reprocess: ' + (data.observations ?? 0) + ' observations');
        await loadSiteStats();
        await loadStrategy();
        return data;
      }, null, {
        retry: () => runReprocess(),
        successDetail: (data) => 'Обработени ' + (data?.observations ?? 0) + ' observations — цитатите и SOV са преизчислени.',
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
        $('optimizer-badge').textContent = data.enabled ? (plan?.automation_level || 'ready') : '—';
        $('optimizer-headline').textContent = plan?.headline || data.roadmap?.summary || '—';
        $('optimizer-auto').innerHTML = '';
        $('optimizer-human').innerHTML = '';
        const draft = (data.content_drafts || [])[0];
        if (draft?.artifact) {
          $('optimizer-drafts-wrap').classList.remove('hidden');
          $('optimizer-draft-preview').textContent = draft.artifact.slice(0, 2000);
        } else {
          $('optimizer-drafts-wrap').classList.add('hidden');
        }
        setMetricContext('optimizer', {
          message: (plan?.headline || data.roadmap?.summary || ''),
        });
      } catch { /* optional panel */ }
    }

    function actionLabel(action) {
      const labels = {
        run_pipeline: 'Пълен анализ',
        reprocess: 'Проверка на цитати',
        generate_questions: 'Генериране на въпроси',
        refine_questions_displacement: 'Нови въпроси (конкуренция)',
        generate_content: 'Draft текст',
        activate_edge: 'Edge конфигурация',
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
          if (runs != null) parts.push(runs + ' AI runs');
          if (obs != null) parts.push(obs + ' observations');
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
              box.textContent = 'Грешка: ' + authErrorHint(res, data);
              throw new Error(authErrorHint(res, data));
            }
            box.textContent = '✓ ' + data.domain + ' добавен';
            selectedDomain = data.domain;
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
    $('btn-wizard-dismiss').onclick = () => {
      sessionStorage.setItem(wizardStorageKey(), '1');
      $('welcome-wizard').classList.add('hidden');
    };
    $('btn-activity-retry').onclick = () => {
      if (lastActivityRetry) lastActivityRetry();
    };
    $('btn-edge-activate').onclick = activateEdge;
    $('btn-refresh').onclick = () => { loadStrategy(); loadEdgeDecision(); loadSiteStats(); loadOnboarding(); loadDriftStatus(); loadOptimizer(); };
    $('btn-reprocess').onclick = runReprocess;
    $('btn-export-manual').onclick = exportManualRecommendations;
    $('btn-export-manual-bar').onclick = exportManualRecommendations;
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
    $('btn-add-q').onclick = async () => {
      const text = prompt('Нов въпрос:');
      if (!text?.trim()) return;
      await apiFetch('/api/questions', {
        method: 'POST',
        body: JSON.stringify({ domain: selectedDomain, text: text.trim(), source: 'manual' })
      });
      loadQuestionsQuiet();
    };

    $('chat-form').onsubmit = (e) => {
      e.preventDefault();
      sendChatMessage($('chat-input').value);
    };
    document.querySelectorAll('.chat-quick-btn').forEach(btn => {
      btn.onclick = () => sendChatMessage(btn.dataset.q);
    });

    $('btn-save-token').onclick = () => {
      setAdminToken($('admin-token').value);
      log('Admin token запазен за сесията');
    };

    loadAuthStatus();
    loadBaselineStatus();
    loadDriftStatus();
    loadModelsStatus();
    loadAdvisorStatus();
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
.welcome-wizard{background:linear-gradient(135deg,#1e3a5f33,#121820);border:1px solid var(--accent);border-radius:10px;padding:.85rem 1rem;margin-bottom:.75rem}
.welcome-wizard.hidden{display:none}
.wizard-head{display:flex;justify-content:space-between;align-items:center;gap:.75rem;margin-bottom:.65rem}
.wizard-steps{list-style:none;padding:0;margin:0;display:grid;gap:.45rem}
.wizard-step{display:flex;gap:.65rem;align-items:flex-start;padding:.45rem .55rem;border-radius:8px;background:var(--surface2);border:1px solid var(--border)}
.wizard-step.done{opacity:.75;border-color:#14532d}
.wizard-num{flex-shrink:0;width:1.35rem;height:1.35rem;border-radius:50%;background:var(--surface);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:600}
.wizard-step.done .wizard-num{background:#14532d22;color:var(--ok)}
.journey-bar{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:.75rem 1rem;margin-bottom:.75rem}
.journey-bar.hidden{display:none}
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
.operation-history{margin-bottom:.75rem}
.operation-history.hidden{display:none}
.operation-history details{font-size:.82rem;color:var(--muted)}
.operation-history summary{cursor:pointer;padding:.25rem 0;color:var(--text);font-weight:500}
.op-history-list{list-style:none;padding:.35rem 0 0;margin:0;display:grid;gap:.35rem}
.op-history-item{display:flex;gap:.5rem;align-items:flex-start;padding:.45rem .55rem;background:var(--surface);border:1px solid var(--border);border-radius:8px;font-size:.78rem}
.op-history-ok{border-left:3px solid var(--ok)}
.op-history-error{border-left:3px solid var(--err)}
.op-history-running{border-left:3px solid var(--accent)}
.op-history-icon{flex-shrink:0;font-weight:700}
.op-history-when{display:block;font-size:.68rem;color:var(--muted);margin-top:.1rem}
.unified-plan{margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border)}
.unified-plan.hidden{display:none}
.unified-plan-list{list-style:none;padding:0;margin:.65rem 0 0;display:grid;gap:.55rem}
.unified-plan-item{padding:.65rem .85rem;border-radius:8px;background:var(--bg);border:1px solid var(--border)}
.unified-plan-compact{padding:.45rem .65rem;opacity:.85}
.unified-plan-head{display:flex;flex-wrap:wrap;gap:.45rem;align-items:flex-start}
.unified-kind-badge{font-size:.65rem;text-transform:uppercase;letter-spacing:.03em;color:var(--muted);background:var(--surface2);border:1px solid var(--border);border-radius:4px;padding:.12rem .4rem;flex-shrink:0}
.unified-plan-body{flex:1;min-width:0}
.context-hidden{display:none!important}
.extra-tech-note{margin:0 0 .65rem;padding:.45rem .65rem;background:#102a1818;border-radius:6px;border-left:3px solid var(--ok)}
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
.edge-verdict{margin:.75rem 0;padding:.65rem .85rem;background:var(--surface2);border-radius:8px;font-size:.875rem}
.edge-fix-list,.edge-prereq-list{margin:.5rem 0;padding-left:1.25rem;font-size:.85rem}
.edge-fix{margin-bottom:.45rem}
.edge-fix-layer{font-size:.65rem;text-transform:uppercase;color:var(--accent);background:var(--surface2);padding:.1rem .35rem;border-radius:4px}
.edge-prereq-list{color:var(--muted)}
.chat-messages{max-height:320px;overflow-y:auto;display:flex;flex-direction:column;gap:.65rem;margin:.75rem 0;padding:.5rem;background:var(--bg);border-radius:8px;min-height:80px}
.chat-msg{padding:.55rem .65rem;border-radius:8px;font-size:.875rem}
.chat-user{background:#1e3a5f;align-self:flex-end;max-width:92%}
.chat-model{background:var(--surface2);align-self:flex-start;max-width:96%}
.chat-role{font-size:.65rem;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:.2rem}
.chat-text{line-height:1.45}
.chat-actions{display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.5rem}
.chat-quick{display:flex;flex-wrap:wrap;gap:.35rem;margin-bottom:.5rem}
.chat-form{display:flex;gap:.5rem;align-items:flex-end}
.chat-form textarea{flex:1;background:var(--surface2);border:1px solid var(--border);color:var(--text);border-radius:8px;padding:.5rem;font-family:inherit;font-size:.875rem;resize:vertical;min-height:2.5rem}
.foot{margin-top:2rem;padding-top:1rem;border-top:1px solid var(--border);color:var(--muted);font-size:.75rem}
`;
