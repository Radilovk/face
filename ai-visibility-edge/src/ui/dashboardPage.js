import { PIPELINE_STEPS } from './workflow.js';
import { INFO_MODULES } from '../diagnose/recommendations.js';
import { GITHUB_ACTIONS } from './dashboardData.js';

export function renderDashboardPage(origin) {
  const stepsJson = JSON.stringify(PIPELINE_STEPS);
  const infoJson = JSON.stringify(INFO_MODULES);

  return `<!DOCTYPE html>
<html lang="bg">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AI Visibility Edge</title>
  <style>${CSS}</style>
</head>
<body>
  <div class="app">
    <header class="topbar">
      <div>
        <h1>AI Visibility Edge</h1>
        <p class="sub">Автоматизиран одит → въпроси → измерване → действия</p>
      </div>
      <div class="topbar-meta">
        <select id="site-select" aria-label="Избери сайт"></select>
        <span id="updated" class="sub">…</span>
      </div>
    </header>

    <nav class="tabs" role="tablist">
      <button type="button" class="tab active" data-tab="overview">📊 Обзор</button>
      <button type="button" class="tab" data-tab="add-site">➕ Добави сайт</button>
      <button type="button" class="tab" data-tab="workflow">⚙️ Автоматизация</button>
      <button type="button" class="tab" data-tab="questions">❓ Въпроси</button>
      <button type="button" class="tab" data-tab="sites">🌐 Сайтове</button>
      <button type="button" class="tab" data-tab="help">ℹ️ Помощ</button>
    </nav>

    <!-- OVERVIEW -->
    <section id="panel-overview" class="panel active">
      <div class="status-row" id="status-chips"></div>
      <div class="toolbar">
        <button type="button" class="btn" id="btn-refresh">↻ Обнови</button>
        <button type="button" class="btn" id="btn-audit">🩺 Одит на сайта</button>
        <button type="button" class="btn" id="btn-reprocess">▶ Reprocess</button>
        <button type="button" class="btn btn-ghost" id="btn-reco">💡 Препоръки</button>
        <a class="btn btn-ghost" href="${GITHUB_ACTIONS.deploy}" target="_blank" rel="noopener">Deploy</a>
      </div>
      <div id="overview-detail" class="detail-box hidden"></div>
      <div id="log" class="log"></div>
    </section>

    <!-- ADD SITE -->
    <section id="panel-add-site" class="panel">
      <p class="lead">Регистрирайте нов сайт за оптимизация. След това — таб „Автоматизация“ → „Стартирай pipeline“.</p>
      <form id="add-site-form" class="form-grid">
        <label>Домейн <input name="domain" type="text" placeholder="example.com" required></label>
        <label>Марка / име <input name="name" type="text" placeholder="Example Shop" required></label>
        <label>Вертикал (съществуваща)
          <select name="vertical_id" id="vertical-select"><option value="">— изберете или нова по-долу —</option></select>
        </label>
        <label>Или нова вертикал <input name="vertical_name" type="text" placeholder="Спортни добавки"></label>
        <label>Конкуренти (опционално) <input name="competitors" type="text" placeholder="shop1.bg, shop2.com"></label>
        <div class="toolbar">
          <button type="submit" class="btn">➕ Добави сайт</button>
          <button type="button" class="btn btn-ghost" id="btn-add-and-run">Добави + стартирай pipeline</button>
        </div>
      </form>
      <div id="add-site-result" class="detail-box hidden"></div>
    </section>

    <!-- WORKFLOW -->
    <section id="panel-workflow" class="panel">
      <p class="lead">Pipeline — автоматични стъпки. Използвайте „Стартирай pipeline“ за пълен цикъл.</p>
      <div class="toolbar" style="margin-bottom:1rem">
        <button type="button" class="btn" id="btn-run-pipeline">🚀 Стартирай pipeline</button>
        <button type="button" class="btn btn-ghost" id="btn-measure">📡 Измерване (5 въпр.)</button>
      </div>
      <div id="pipeline-steps" class="stepper"></div>
      <div id="pipeline-actions" class="toolbar"></div>
      <div id="pipeline-detail" class="detail-box hidden"></div>
    </section>

    <!-- QUESTIONS -->
    <section id="panel-questions" class="panel">
      <div class="toolbar">
        <button type="button" class="btn" id="btn-gen-questions">✨ Авто-генерирай</button>
        <button type="button" class="btn btn-ghost" id="btn-reload-questions">↻ Зареди</button>
        <button type="button" class="btn btn-ghost" id="btn-add-question">+ Добави ръчно</button>
      </div>
      <p class="sub">Въпросите се генерират автоматично; можете да редактирате или добавяте преди измерване.</p>
      <div id="questions-list" class="q-list"></div>
      <div id="question-editor" class="detail-box hidden"></div>
    </section>

    <!-- SITES -->
    <section id="panel-sites" class="panel">
      <div id="sites-table-wrap"></div>
    </section>

    <!-- HELP -->
    <section id="panel-help" class="panel">
      <p class="lead">Натиснете тема — отваря се само избраният блок.</p>
      <div class="help-nav" id="help-nav"></div>
      <div id="help-content" class="detail-box"></div>
    </section>

    <footer class="foot">AI Visibility Edge · <code>${esc(origin)}</code></footer>
  </div>
  <script>${script(origin, stepsJson, infoJson)}</script>
</body>
</html>`;
}

function script(origin, stepsJson, infoJson) {
  return `
    const ORIGIN = ${JSON.stringify(origin)};
    const PIPELINE_STEPS = ${stepsJson};
    const INFO_MODULES = ${infoJson};
    const API = (p) => ORIGIN + p;

    let sites = [];
    let selectedDomain = '';
    let summary = null;

    // --- Tabs ---
    document.querySelectorAll('.tab').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
        if (btn.dataset.tab === 'workflow') loadPipeline();
        if (btn.dataset.tab === 'questions') loadQuestions();
        if (btn.dataset.tab === 'sites') renderSitesTable();
        if (btn.dataset.tab === 'add-site') loadVerticals();
      };
    });

    function log(msg) {
      document.getElementById('log').textContent = new Date().toLocaleTimeString('bg-BG') + ' ' + msg;
    }

    function selectedSite() {
      return sites.find(s => s.domain === selectedDomain) || sites[0];
    }

    function renderSiteSelect() {
      const sel = document.getElementById('site-select');
      sel.innerHTML = sites.map(s =>
        '<option value="' + s.domain + '">' + s.domain + ' — ' + (s.name || s.domain) + '</option>'
      ).join('');
      if (selectedDomain) sel.value = selectedDomain;
      else if (sites[0]) selectedDomain = sites[0].domain;
      sel.onchange = () => { selectedDomain = sel.value; refreshAll(); };
    }

    // --- Status chips (click to expand) ---
    function renderStatusChips(data) {
      const chips = [
        { id: 'worker', label: 'Worker', ok: data.health?.ok, detail: 'Worker API отговаря' },
        { id: 'db', label: 'D1', ok: data.health?.db, detail: data.health?.db ? 'Базата е свързана' : 'Пусни aiv-deploy' },
        { id: 'kv', label: 'KV', ok: data.health?.kv, detail: 'Baseline manifest cache' },
        { id: 'runs', label: 'Runs', text: String(data.runs?.total ?? '—'), detail: 'AI отговори в D1' },
        { id: 'obs', label: 'Obs', text: String((data.observations?.by_class || []).reduce((s,r)=>s+r.count,0)), detail: 'Verify + classify' },
      ];
      const el = document.getElementById('status-chips');
      el.innerHTML = chips.map(c => {
        const cls = c.ok === false ? 'chip err' : (c.ok === true ? 'chip ok' : 'chip');
        const val = c.text ?? (c.ok ? 'OK' : '—');
        return '<button type="button" class="' + cls + '" data-detail="' + escAttr(c.detail) + '">' + c.label + ': ' + val + '</button>';
      }).join('');
      el.querySelectorAll('button').forEach(b => {
        b.onclick = () => {
          const box = document.getElementById('overview-detail');
          box.textContent = b.dataset.detail;
          box.classList.remove('hidden');
        };
      });
    }

    // --- Pipeline ---
    function renderPipeline(data) {
      const el = document.getElementById('pipeline-steps');
      if (!data?.steps) {
        el.innerHTML = '<p class="sub">Изберете сайт или добавете tenant в D1.</p>';
        return;
      }
      el.innerHTML = data.steps.map(s => {
        const st = s.status;
        return '<div class="step step-' + st + '">' +
          '<div class="step-head"><strong>' + s.title + '</strong>' +
          '<span class="step-badge">' + st + '</span></div>' +
          '<p class="sub">' + s.desc + '</p>' +
          '<div class="step-tags">' +
          (s.auto ? '<span class="tag auto">авто</span>' : '') +
          (s.manual ? '<span class="tag manual">ръчно OK</span>' : '') +
          '</div></div>';
      }).join('');

      const actions = document.getElementById('pipeline-actions');
      actions.innerHTML =
        '<button type="button" class="btn" id="pw-run">🚀 Pipeline</button>' +
        '<button type="button" class="btn" id="pw-audit">🩺 Одит</button>' +
        '<button type="button" class="btn" id="pw-gen-q">✨ Въпроси</button>' +
        '<button type="button" class="btn" id="pw-measure">📡 Измерване</button>' +
        '<button type="button" class="btn" id="pw-reprocess">▶ Reprocess</button>' +
        '<button type="button" class="btn btn-ghost" id="pw-report">📄 Отчет</button>' +
        '<button type="button" class="btn btn-ghost" id="pw-reco">💡 Препоръки</button>';
      document.getElementById('pw-run').onclick = runFullPipeline;
      document.getElementById('pw-audit').onclick = runAudit;
      document.getElementById('pw-gen-q').onclick = generateQuestions;
      document.getElementById('pw-measure').onclick = runMeasure;
      document.getElementById('pw-reprocess').onclick = reprocess;
      document.getElementById('pw-report').onclick = () => window.open(API('/report/' + selectedDomain), '_blank');
      document.getElementById('pw-reco').onclick = loadRecommendations;
    }

    async function loadPipeline() {
      if (!selectedDomain) return;
      try {
        const res = await fetch(API('/api/pipeline/' + encodeURIComponent(selectedDomain)));
        const data = await res.json();
        renderPipeline(data);
        const det = document.getElementById('pipeline-detail');
        if (data.stats) {
          det.textContent = 'Въпроси: ' + data.stats.questions + ' · Runs: ' + data.stats.runs + ' · Obs: ' + data.stats.observations;
          det.classList.remove('hidden');
        }
      } catch (e) { log('Pipeline: ' + e.message); }
    }

    async function runFullPipeline() {
      if (!selectedDomain) return;
      log('Pipeline старт… (одит → въпроси → measure → reprocess) ~1-2 мин');
      const box = document.getElementById('pipeline-detail');
      box.classList.remove('hidden');
      box.textContent = 'Изпълнява се…';
      try {
        const res = await fetch(API('/api/pipeline/' + encodeURIComponent(selectedDomain) + '/run'), {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ measure: true, question_limit: 5, repetitions: 1 })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || res.status);
        box.innerHTML = '<pre>' + escHtml(JSON.stringify(data.steps, null, 2)) + '</pre>';
        log('Pipeline готов');
        await refreshAll();
        loadPipeline();
      } catch (e) {
        box.textContent = 'Грешка: ' + e.message;
        log('Pipeline: ' + e.message);
      }
    }

    async function runMeasure() {
      if (!selectedDomain) return;
      log('Измерване…');
      const res = await fetch(API('/api/measure/run'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: selectedDomain, question_limit: 5, repetitions: 1 })
      });
      const data = await res.json();
      if (!res.ok) { log('Measure: ' + (data.error || res.status)); return; }
      log('Runs: ' + data.runs + ' · asked: ' + data.asked);
      await refreshAll();
      loadPipeline();
    }

    async function loadVerticals() {
      try {
        const res = await fetch(API('/api/verticals'));
        const data = await res.json();
        const sel = document.getElementById('vertical-select');
        const opts = (data.verticals || []).map(v =>
          '<option value="' + v.id + '">' + escHtml(v.name) + '</option>'
        ).join('');
        sel.innerHTML = '<option value="">— изберете —</option>' + opts;
      } catch (e) { /* optional */ }
    }

    async function submitAddSite(thenRunPipeline) {
      const form = document.getElementById('add-site-form');
      const fd = new FormData(form);
      const body = {
        domain: fd.get('domain'),
        name: fd.get('name'),
        vertical_id: fd.get('vertical_id') || undefined,
        vertical_name: fd.get('vertical_name') || undefined,
        competitors: fd.get('competitors') || undefined,
      };
      const box = document.getElementById('add-site-result');
      box.classList.remove('hidden');
      box.textContent = 'Регистрация…';
      const res = await fetch(API('/api/sites'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) {
        box.textContent = 'Грешка: ' + (data.error || data.hint || res.status);
        return null;
      }
      box.innerHTML = '<p>✓ Добавен <strong>' + escHtml(data.domain) + '</strong> · tenant ' + escHtml(data.tenant_id) + '</p>';
      selectedDomain = data.domain;
      await refreshAll();
      if (thenRunPipeline) {
        switchTab('workflow');
        await runFullPipeline();
      }
      return data;
    }

    document.getElementById('add-site-form').onsubmit = async (e) => {
      e.preventDefault();
      await submitAddSite(false);
    };
    document.getElementById('btn-add-and-run').onclick = async () => {
      await submitAddSite(true);
    };

    document.getElementById('btn-run-pipeline').onclick = runFullPipeline;
    document.getElementById('btn-measure').onclick = runMeasure;

    // --- Questions ---
    async function loadQuestions() {
      if (!selectedDomain) return;
      const el = document.getElementById('questions-list');
      el.innerHTML = '<p class="sub">Зареждане…</p>';
      try {
        const res = await fetch(API('/api/questions?domain=' + encodeURIComponent(selectedDomain)));
        const data = await res.json();
        if (!data.questions?.length) {
          el.innerHTML = '<p class="sub">Няма въпроси. Натиснете „Авто-генерирай“.</p>';
          return;
        }
        el.innerHTML = data.questions.map(q =>
          '<div class="q-item" data-id="' + q.id + '">' +
          '<span class="q-src ' + q.source + '">' + q.source + '</span> ' +
          '<span class="q-type">' + q.qtype + '</span>' +
          '<p class="q-text" contenteditable="true" spellcheck="false">' + escHtml(q.text) + '</p>' +
          '<div class="q-actions">' +
          '<button type="button" class="btn-sm save-q">Запази</button>' +
          '<button type="button" class="btn-sm del-q">Изтрий</button></div></div>'
        ).join('');
        el.querySelectorAll('.save-q').forEach((btn, i) => {
          btn.onclick = () => saveQuestion(data.questions[i].id, btn.closest('.q-item'));
        });
        el.querySelectorAll('.del-q').forEach((btn, i) => {
          btn.onclick = () => deleteQuestion(data.questions[i].id);
        });
      } catch (e) {
        el.innerHTML = '<p class="sub">Грешка: ' + e.message + '</p>';
      }
    }

    async function saveQuestion(id, row) {
      const text = row.querySelector('.q-text').textContent.trim();
      await fetch(API('/api/questions/' + id), {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      log('Въпрос запазен: ' + id);
    }

    async function deleteQuestion(id) {
      if (!confirm('Изтрий въпрос ' + id + '?')) return;
      await fetch(API('/api/questions/' + id), { method: 'DELETE' });
      loadQuestions();
    }

    async function generateQuestions() {
      if (!selectedDomain) return;
      log('Генериране на въпроси…');
      const res = await fetch(API('/api/questions/generate'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: selectedDomain, replace_auto: true })
      });
      const data = await res.json();
      if (!res.ok) { log('Грешка: ' + (data.error || res.status)); return; }
      log('Генерирани: ' + data.generated);
      loadQuestions();
      loadPipeline();
    }

    document.getElementById('btn-gen-questions').onclick = generateQuestions;
    document.getElementById('btn-reload-questions').onclick = loadQuestions;
    document.getElementById('btn-add-question').onclick = async () => {
      const text = prompt('Нов въпрос (BG):');
      if (!text?.trim()) return;
      await fetch(API('/api/questions'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: selectedDomain, text: text.trim(), source: 'manual' })
      });
      loadQuestions();
    };

    // --- Sites table ---
    function renderSitesTable() {
      const wrap = document.getElementById('sites-table-wrap');
      wrap.innerHTML = '<table><thead><tr><th>Сайт</th><th>Вертикал</th><th>Действия</th></tr></thead><tbody>' +
        sites.map(s =>
          '<tr><td><strong>' + s.domain + '</strong><br><small>' + (s.name||'') + '</small></td>' +
          '<td>' + (s.vertical || '—') + '</td>' +
          '<td class="actions">' +
          '<button type="button" class="btn-sm" data-a="pipe" data-d="' + s.domain + '">Pipeline</button> ' +
          '<button type="button" class="btn-sm" data-a="report" data-d="' + s.domain + '">Отчет</button> ' +
          '<button type="button" class="btn-sm" data-a="q" data-d="' + s.domain + '">Въпроси</button>' +
          '</td></tr>'
        ).join('') + '</tbody></table>';
      wrap.querySelectorAll('button').forEach(b => {
        b.onclick = () => {
          selectedDomain = b.dataset.d;
          renderSiteSelect();
          if (b.dataset.a === 'pipe') { switchTab('workflow'); loadPipeline(); }
          if (b.dataset.a === 'report') window.open(API('/report/' + b.dataset.d), '_blank');
          if (b.dataset.a === 'q') { switchTab('questions'); loadQuestions(); }
        };
      });
    }

    function switchTab(name) {
      document.querySelector('[data-tab="' + name + '"]').click();
    }

    // --- Help (button toggles, not all open) ---
    function renderHelp() {
      const nav = document.getElementById('help-nav');
      nav.innerHTML = INFO_MODULES.map(m =>
        '<button type="button" class="btn btn-ghost help-btn" data-id="' + m.id + '">' + m.icon + ' ' + m.title + '</button>'
      ).join('') +
        '<button type="button" class="btn btn-ghost help-btn" data-id="flow">🔄 Поток</button>';
      const content = document.getElementById('help-content');
      content.innerHTML = '<p class="sub">Изберете тема от бутоните.</p>';
      nav.querySelectorAll('.help-btn').forEach(btn => {
        btn.onclick = () => {
          nav.querySelectorAll('.help-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          if (btn.dataset.id === 'flow') {
            content.innerHTML = '<p><strong>Автоматичен поток:</strong> Регистрация → Одит → Въпроси (авто+ръчно) → Измерване → Reprocess → Препоръки → Мониторинг.</p>' +
              '<p>Системата прави максимално автоматично; бутоните са за одобрение или корекция.</p>';
            return;
          }
          const m = INFO_MODULES.find(x => x.id === btn.dataset.id);
          if (!m) return;
          content.innerHTML = '<h3>' + m.title + '</h3><p><strong>Какво:</strong> ' + m.what + '</p><p><strong>Защо:</strong> ' + m.why + '</p>';
        };
      });
    }

    async function loadSummary() {
      const res = await fetch(API('/api/dashboard/summary'));
      summary = await res.json();
      document.getElementById('updated').textContent = 'обновено ' + new Date().toLocaleTimeString('bg-BG');
      renderStatusChips(summary);
    }

    async function loadSites() {
      const res = await fetch(API('/api/sites'));
      const data = await res.json();
      sites = data.sites || [];
      if (!selectedDomain && sites[0]) selectedDomain = sites[0].domain;
      renderSiteSelect();
    }

    async function runAudit() {
      if (!selectedDomain) return;
      log('Одит ' + selectedDomain + '…');
      const res = await fetch(API('/api/diagnose/probe?domain=' + encodeURIComponent(selectedDomain)));
      const data = await res.json();
      const box = document.getElementById('overview-detail');
      box.innerHTML = '<pre>' + escHtml(JSON.stringify({ http: data.http_status, robots: data.robots_ai_policy, jsonld: data.jsonld_blocks, chars: data.html_text_chars }, null, 2)) + '</pre>';
      box.classList.remove('hidden');
      log('Одит готов');
      loadPipeline();
    }

    async function reprocess() {
      log('Reprocess…');
      const res = await fetch(API('/api/citations/reprocess'), { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { log('Грешка: ' + (data.error || data.hint)); return; }
      log('Reprocess: ' + JSON.stringify(data));
      loadSummary();
      loadPipeline();
    }

    async function loadRecommendations() {
      if (!selectedDomain) return;
      log('Препоръки…');
      const res = await fetch(API('/api/dashboard/recommendations?domain=' + encodeURIComponent(selectedDomain)));
      const data = await res.json();
      const t = data.tenants?.[0];
      const box = document.getElementById('overview-detail');
      if (!t?.recommendations?.length) {
        box.textContent = 'Няма препоръки';
      } else {
        box.innerHTML = t.recommendations.map(r =>
          '<div class="reco sev-' + r.severity + '"><strong>' + escHtml(r.title) + '</strong><p>' + escHtml(r.action) + '</p></div>'
        ).join('');
      }
      box.classList.remove('hidden');
    }

    function escHtml(s) {
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    async function refreshAll() {
      await loadSummary();
      await loadSites();
    }

    document.getElementById('btn-refresh').onclick = refreshAll;
    document.getElementById('btn-audit').onclick = runAudit;
    document.getElementById('btn-reprocess').onclick = reprocess;
    document.getElementById('btn-reco').onclick = loadRecommendations;

    renderHelp();
    refreshAll().then(() => { loadPipeline(); });
  `;
}

function escAttr(s) {
  return String(s ?? '').replace(/"/g, '&quot;');
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const CSS = `
:root {
  --bg:#0c1017; --surface:#151c28; --surface2:#1e2838; --border:#2a3648;
  --text:#e8edf4; --muted:#8fa3bc; --accent:#3b82f6; --ok:#22c55e; --warn:#f59e0b; --err:#ef4444;
}
*{box-sizing:border-box}
body{margin:0;font-family:system-ui,sans-serif;background:var(--bg);color:var(--text);line-height:1.5}
.app{max-width:1000px;margin:0 auto;padding:1rem 1.25rem 2rem}
.topbar{display:flex;flex-wrap:wrap;justify-content:space-between;gap:1rem;margin-bottom:1rem;align-items:flex-end}
h1{font-size:1.35rem;margin:0}
.sub{color:var(--muted);font-size:.875rem;margin:.2rem 0 0}
.topbar-meta{display:flex;gap:.75rem;align-items:center}
#site-select{background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:.45rem .65rem;min-width:220px}
.tabs{display:flex;flex-wrap:wrap;gap:.35rem;margin-bottom:1rem;border-bottom:1px solid var(--border);padding-bottom:.5rem}
.tab{background:transparent;border:1px solid transparent;color:var(--muted);padding:.45rem .85rem;border-radius:8px;cursor:pointer;font-size:.875rem}
.tab:hover{background:var(--surface2);color:var(--text)}
.tab.active{background:var(--surface2);border-color:var(--border);color:var(--text)}
.panel{display:none}
.panel.active{display:block}
.lead{color:var(--muted);margin:0 0 1rem;font-size:.9rem}
.status-row{display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:1rem}
.chip{background:var(--surface);border:1px solid var(--border);color:var(--text);padding:.35rem .7rem;border-radius:999px;font-size:.8rem;cursor:pointer}
.chip.ok{border-color:#166534}
.chip.err{border-color:#991b1b;color:#fca5a5}
.toolbar{display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:1rem}
.btn{background:var(--accent);color:#fff;border:none;border-radius:8px;padding:.5rem 1rem;font-size:.85rem;cursor:pointer}
.btn:hover{filter:brightness(1.08)}
.btn-ghost{background:var(--surface2);color:var(--text);border:1px solid var(--border)}
.btn-sm{background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:.25rem .55rem;border-radius:6px;font-size:.75rem;cursor:pointer;margin-right:.25rem}
.detail-box{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:1rem;margin:.75rem 0;font-size:.875rem}
.detail-box.hidden{display:none}
.log{font-family:monospace;font-size:.75rem;color:var(--muted);background:var(--surface2);padding:.6rem;border-radius:8px;min-height:1.5rem;margin-top:.75rem}
.stepper{display:grid;gap:.65rem}
.step{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:.85rem 1rem;border-left:4px solid var(--border)}
.step-done{border-left-color:var(--ok)}
.step-ready{border-left-color:var(--accent)}
.step-pending{border-left-color:var(--warn)}
.step-locked{opacity:.55}
.step-head{display:flex;justify-content:space-between;align-items:center;gap:.5rem}
.step-badge{font-size:.7rem;text-transform:uppercase;color:var(--muted)}
.step-tags{margin-top:.35rem}
.tag{font-size:.65rem;padding:.1rem .4rem;border-radius:4px;margin-right:.25rem}
.tag.auto{background:#14532d;color:#86efac}
.tag.manual{background:#1e3a5f;color:#93c5fd}
.q-list{display:grid;gap:.65rem}
.q-item{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:.75rem}
.q-src{font-size:.65rem;text-transform:uppercase;padding:.1rem .35rem;border-radius:4px;background:var(--surface2)}
.q-src.auto{color:#86efac}.q-src.manual{color:#fcd34d}
.q-type{font-size:.7rem;color:var(--muted);margin-left:.35rem}
.q-text{margin:.4rem 0;padding:.35rem;background:var(--surface2);border-radius:6px;min-height:2rem}
.q-actions{margin-top:.35rem}
table{width:100%;border-collapse:collapse;font-size:.875rem}
th,td{padding:.55rem .4rem;border-bottom:1px solid var(--border);text-align:left}
th{color:var(--muted);font-size:.75rem}
.help-nav{display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.75rem}
.help-btn.active{border-color:var(--accent)!important;color:#93c5fd!important}
.reco{border-left:3px solid var(--border);padding:.4rem .6rem;margin:.4rem 0}
.reco.sev-critical{border-color:var(--err)}
.reco.sev-warning{border-color:var(--warn)}
.reco.sev-ok{border-color:var(--ok)}
.pre{margin:0;overflow:auto;font-size:.75rem}
.form-grid{display:grid;gap:.75rem;max-width:520px}
.form-grid label{display:flex;flex-direction:column;gap:.3rem;font-size:.85rem;color:var(--muted)}
.form-grid input,.form-grid select{background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:.5rem .65rem;border-radius:8px;font-size:.9rem}
.foot{margin-top:2rem;padding-top:1rem;border-top:1px solid var(--border);color:var(--muted);font-size:.75rem}
pre{margin:0;overflow:auto;font-size:.75rem}
`;
