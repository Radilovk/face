import { GITHUB_ACTIONS } from './dashboardData.js';

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
      <div>
        <h1>AI Visibility</h1>
        <p class="sub">Как AI моделите ви виждат — и какво да направите</p>
      </div>
      <div class="topbar-meta">
        <select id="site-select" aria-label="Избери сайт"></select>
        <button type="button" class="btn btn-ghost btn-sm" id="btn-add-toggle">+ Сайт</button>
      </div>
    </header>

    <!-- Add site — primary entry when no sites yet -->
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

    <!-- Pipeline progress -->
    <nav id="pipeline-bar" class="pipeline-bar" aria-label="Стъпки"></nav>

    <!-- Verdict -->
    <section id="verdict" class="verdict verdict-unknown">
      <div class="verdict-top">
        <span id="score" class="score">—</span>
        <div>
          <h2 id="verdict-headline">Изберете сайт или добавете нов</h2>
          <p id="verdict-summary" class="sub">Системата ще покаже ясен вердикт и план за оптимизация.</p>
        </div>
      </div>
    </section>

    <!-- Primary action -->
    <div class="hero-actions">
      <button type="button" class="btn btn-lg" id="btn-analyze">🚀 1. Анализ</button>
      <button type="button" class="btn btn-lg" id="btn-edge-activate">⚡ 2. Приложи Edge</button>
      <button type="button" class="btn btn-ghost" id="btn-refresh">↻ Обнови</button>
      <button type="button" class="btn btn-ghost" id="btn-reprocess">↻ Reprocess</button>
      <a class="btn btn-ghost" id="btn-report" href="#" target="_blank" rel="noopener">📄 Отчет</a>
    </div>
    <section id="site-stats" class="site-stats hidden" aria-label="Измерване">
      <div class="stat-grid">
        <div class="stat"><strong id="stat-runs">—</strong><small>Runs</small></div>
        <div class="stat"><strong id="stat-obs">—</strong><small>Observations</small></div>
        <div class="stat"><strong id="stat-sov">—</strong><small>SOV</small></div>
        <div class="stat"><strong id="stat-pending">—</strong><small>Чака reprocess</small></div>
      </div>
    </section>
    <section id="cache-index-panel" class="cache-index hidden" aria-label="Кеш индекс">
      <div class="cache-head">
        <h3>Кеш индекс (Слой 8)</h3>
        <span id="cache-coverage-badge" class="advisor-badge">—</span>
      </div>
      <div class="stat-grid stat-grid-5">
        <div class="stat"><strong id="cache-median">—</strong><small>Median (ч)</small></div>
        <div class="stat"><strong id="cache-p25">—</strong><small>P25</small></div>
        <div class="stat"><strong id="cache-p75">—</strong><small>P75</small></div>
        <div class="stat"><strong id="stat-bot-v">—</strong><small>Bot hits ✓</small></div>
        <div class="stat"><strong id="stat-bot-u">—</strong><small>Bot fake</small></div>
      </div>
      <p id="cache-note" class="sub">Разпределение на cache age — не единично число.</p>
    </section>
    <section id="onboarding-panel" class="onboarding hidden" aria-label="Onboarding">
      <h3>CNAME onboarding</h3>
      <ol id="onboarding-steps" class="onboarding-list"></ol>
      <p id="onboarding-dns" class="sub mono">…</p>
    </section>
    <p id="status-line" class="status-line">…</p>

    <!-- Baseline + Block 0.1 gate -->
    <section id="baseline-banner" class="baseline-banner hidden">
      <strong>Блок 0.1 — Baseline</strong>
      <p id="baseline-msg" class="sub">…</p>
    </section>

    <!-- Edge decision (Block 4 — optimization via Cloudflare Worker) -->
    <section class="section edge-panel" id="edge-panel">
      <div class="apply-head">
        <h3>⚡ Edge решение</h3>
        <span id="edge-status-badge" class="advisor-badge">…</span>
      </div>
      <p class="sub">Оптимизацията минава през наш Cloudflare Worker — не през CMS. След CNAME поправките са автоматични.</p>
      <div id="edge-verdict" class="edge-verdict sub">Стартирайте анализ за решение.</div>
      <ul id="edge-fixes" class="edge-fix-list"></ul>
      <ul id="edge-prereq" class="edge-prereq-list"></ul>
    </section>

    <!-- Pillars -->
    <section class="section">
      <h3>Къде сте сега</h3>
      <div id="pillars" class="pillars"></div>
    </section>

    <!-- Strategy plan -->
    <section class="section">
      <h3>Какво да направите</h3>
      <div class="plan-cols">
        <div>
          <h4>Тази седмица</h4>
          <ol id="plan-week" class="plan-list"></ol>
        </div>
        <div>
          <h4>Този месец</h4>
          <ol id="plan-month" class="plan-list muted-col"></ol>
        </div>
      </div>
    </section>

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
  <script>${script(origin)}</script>
</body>
</html>`;
}

function script(origin) {
  return `
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

    const $ = (id) => document.getElementById(id);

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
        if (data.ready) {
          banner.classList.add('hidden');
          return;
        }
        banner.classList.remove('hidden');
        const models = (data.models_collected || []).join(', ') || '—';
        msg.textContent = 'Baseline ' + (data.baseline_id || '') + ': status=' + (data.status || '?') +
          ', models=[' + models + ']. Пуснете GitHub Action aiv-baseline-collect (Block 0.1).';
      } catch {
        banner.classList.remove('hidden');
        msg.textContent = 'Baseline статус недостъпен — проверете deploy.';
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
        $('btn-analyze').disabled = true;
        $('verdict-headline').textContent = 'Добавете първи сайт';
        $('verdict-summary').textContent = 'Домейн, марка, вертикал — след това „Добави + анализ“.';
        return;
      }
      addPanel.classList.add('hidden');
      $('btn-analyze').disabled = false;
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

    function renderVerdict(v, score) {
      const box = $('verdict');
      box.className = 'verdict verdict-' + (v?.level || 'unknown');
      $('score').textContent = score != null ? score : '—';
      $('verdict-headline').textContent = v?.headline || '—';
      $('verdict-summary').textContent = v?.summary || '';
    }

    function renderPillars(pillars) {
      const el = $('pillars');
      if (!pillars?.length) { el.innerHTML = '<p class="sub">Няма данни</p>'; return; }
      el.innerHTML = pillars.map(p =>
        '<div class="pillar pillar-' + p.level + '">' +
        '<span class="pillar-icon">' + p.icon + '</span>' +
        '<div><strong>' + escHtml(p.label) + '</strong>' +
        '<p>' + escHtml(p.status) + '</p>' +
        '<small>' + escHtml(p.action) + '</small></div></div>'
      ).join('');
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
      if (action === 'generate_apply') return activateEdge();
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
      btn.textContent = decision.edge_active ? '✓ Edge активен' : '⚡ 2. Приложи Edge';
    }

    async function loadEdgeDecision() {
      if (!selectedDomain) return;
      try {
        const res = await fetch(API('/api/edge/' + encodeURIComponent(selectedDomain) + '/decision'));
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.hint || res.status);
        renderEdgeDecision(data);
      } catch (e) {
        renderEdgeDecision({ error: true, hint: 'Edge: ' + e.message });
      }
    }

    async function activateEdge() {
      if (!selectedDomain || busy) return;
      busy = true;
      $('btn-edge-activate').disabled = true;
      log('Прилагане на Edge конфигурация (KV)…');
      try {
        const res = await apiFetch('/api/edge/' + encodeURIComponent(selectedDomain) + '/activate', {
          method: 'POST', body: '{}'
        });
        const data = await res.json();
        if (!res.ok) throw new Error(authErrorHint(res, data));
        log(data.message || 'Edge конфигурация записана');
        await loadEdgeDecision();
        await loadStrategy();
      } catch (e) {
        log('Edge: ' + e.message);
        await loadEdgeDecision();
      } finally {
        busy = false;
      }
    }

    async function loadSiteStats() {
      if (!selectedDomain) return;
      const panel = $('site-stats');
      const cachePanel = $('cache-index-panel');
      try {
        const res = await fetch(API('/api/dashboard/site-stats?domain=' + encodeURIComponent(selectedDomain)));
        const data = await res.json();
        if (!res.ok) { panel.classList.add('hidden'); cachePanel.classList.add('hidden'); return; }
        panel.classList.remove('hidden');
        $('stat-runs').textContent = data.runs ?? 0;
        $('stat-obs').textContent = data.observations ?? 0;
        $('stat-sov').textContent = data.sov?.sov != null ? (data.sov.sov.toFixed(1) + '%') : '—';
        $('stat-pending').textContent = data.pending_reprocess ?? 0;
        if (data.needs_reprocess) {
          $('stat-pending').parentElement.classList.add('stat-warn');
        } else {
          $('stat-pending').parentElement.classList.remove('stat-warn');
        }

        renderCacheIndex(data.cache_index, data.bot_hits);
        cachePanel.classList.remove('hidden');
      } catch {
        panel.classList.add('hidden');
        cachePanel.classList.add('hidden');
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
      }
      $('stat-bot-v').textContent = botHits?.verified_hits ?? 0;
      $('stat-bot-u').textContent = botHits?.unverified_hits ?? 0;
      if ((botHits?.unverified_hits ?? 0) > 0) {
        $('stat-bot-u').parentElement.classList.add('stat-warn');
      } else {
        $('stat-bot-u').parentElement.classList.remove('stat-warn');
      }
    }

    async function loadOnboarding() {
      if (!selectedDomain) return;
      const panel = $('onboarding-panel');
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
        renderPipeline(strategy.pipeline);
        renderVerdict(strategy.verdict, strategy.score);
        renderPillars(strategy.pillars);
        renderPlan(strategy.plan);
        renderTech(strategy.probe, strategy.stats);
        log('Обновено ' + new Date().toLocaleTimeString('bg-BG'));
        loadQuestionsQuiet();
        loadEdgeDecision();
        loadSiteStats();
        loadOnboarding();
      } catch (e) {
        log('Грешка: ' + e.message);
      }
    }

    async function runReprocess() {
      if (busy) return;
      busy = true;
      log('Reprocess: verify + classify…');
      try {
        const res = await apiFetch('/api/citations/reprocess', { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(authErrorHint(res, data));
        log('Reprocess: ' + (data.observations ?? 0) + ' observations');
        await loadSiteStats();
        await loadStrategy();
      } catch (e) {
        log('Reprocess: ' + e.message);
      } finally {
        busy = false;
      }
    }

    async function runFullAnalysis() {
      if (!selectedDomain || busy) return;
      busy = true;
      $('btn-analyze').disabled = true;
      log('Анализ: одит → въпроси → AI измерване… (~2 мин)');

      try {
        const res = await apiFetch('/api/pipeline/' + encodeURIComponent(selectedDomain) + '/run', {
          method: 'POST',
          body: JSON.stringify({ measure: true, question_limit: 5, repetitions: 1 })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(authErrorHint(res, data));
        log('Готов! Презареждам стратегия…');
        await loadStrategy();
        await loadEdgeDecision();
      } catch (e) {
        log('Грешка: ' + e.message);
      } finally {
        busy = false;
        $('btn-analyze').disabled = false;
      }
    }

    async function submitAddSite(thenRun) {
      const fd = new FormData($('add-site-form'));
      const body = {
        domain: fd.get('domain'),
        name: fd.get('name'),
        vertical_name: fd.get('vertical_name') || undefined,
      };
      const box = $('add-result');
      box.classList.remove('hidden');
      box.textContent = 'Регистрация…';
      const res = await apiFetch('/api/sites', {
        method: 'POST', body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) {
        box.textContent = 'Грешка: ' + authErrorHint(res, data);
        return;
      }
      box.textContent = '✓ ' + data.domain + ' добавен';
      selectedDomain = data.domain;
      $('add-panel').classList.add('hidden');
      await loadSites();
      if (thenRun) await runFullAnalysis();
      else await loadStrategy();
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
    $('btn-analyze').onclick = runFullAnalysis;
    $('btn-edge-activate').onclick = activateEdge;
    $('btn-refresh').onclick = () => { loadStrategy(); loadEdgeDecision(); loadSiteStats(); loadOnboarding(); };
    $('btn-reprocess').onclick = runReprocess;
    $('btn-gen-q').onclick = async () => {
      if (!selectedDomain) return;
      log('Генериране на въпроси…');
      await apiFetch('/api/questions/generate', {
        method: 'POST',
        body: JSON.stringify({ domain: selectedDomain, replace_auto: true })
      });
      loadQuestionsQuiet();
      log('Готово');
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
.app{max-width:820px;margin:0 auto;padding:1rem 1.25rem 2.5rem}
.topbar{display:flex;flex-wrap:wrap;justify-content:space-between;gap:1rem;margin-bottom:1.25rem;align-items:flex-end}
h1{font-size:1.35rem;margin:0}
h3{font-size:1rem;margin:0 0 .75rem;color:var(--text)}
h4{font-size:.85rem;margin:0 0 .5rem;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
.sub{color:var(--muted);font-size:.875rem;margin:.2rem 0 0}
.topbar-meta{display:flex;gap:.5rem;align-items:center}
#site-select{background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:.45rem .65rem;min-width:200px}
.pipeline-bar{display:flex;flex-wrap:wrap;align-items:center;gap:.35rem;margin-bottom:1rem;font-size:.75rem}
.pipe-step{padding:.25rem .55rem;border-radius:999px;background:var(--surface2);color:var(--muted);border:1px solid var(--border)}
.pipe-step.done{background:#14532d;color:#86efac;border-color:#166534}
.pipe-step.current{background:#1e3a5f;color:#93c5fd;border-color:var(--accent)}
.pipe-arrow{color:var(--muted);font-size:.65rem}
.verdict{border-radius:12px;padding:1.25rem;margin-bottom:1rem;border-left:4px solid var(--border)}
.verdict-critical{background:#2a1515;border-color:var(--err)}
.verdict-warning{background:#2a2210;border-color:var(--warn)}
.verdict-ok{background:#102a18;border-color:var(--ok)}
.verdict-info,.verdict-unknown{background:var(--surface);border-color:var(--accent)}
.verdict-top{display:flex;gap:1.25rem;align-items:flex-start}
.verdict h2{font-size:1.1rem;margin:0 0 .35rem}
.score{font-size:2.75rem;font-weight:700;line-height:1;color:var(--accent);flex-shrink:0}
.verdict-ok .score{color:var(--ok)}
.verdict-warning .score{color:var(--warn)}
.verdict-critical .score{color:var(--err)}
.hero-actions{display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:.5rem}
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
.site-stats{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:.75rem 1rem;margin-bottom:1rem}
.site-stats.hidden{display:none}
.stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem;text-align:center}
.stat strong{display:block;font-size:1.25rem;color:var(--accent)}
.stat small{color:var(--muted);font-size:.7rem;text-transform:uppercase}
.stat-warn strong{color:var(--warn)}
.cache-index,.onboarding{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:.75rem 1rem;margin-bottom:1rem}
.cache-index.hidden,.onboarding.hidden{display:none}
.cache-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem}
.cache-head h3{margin:0;font-size:.95rem}
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
