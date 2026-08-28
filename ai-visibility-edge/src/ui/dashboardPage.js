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
      <button type="button" class="btn btn-lg" id="btn-analyze">🚀 Стартирай пълен анализ</button>
      <button type="button" class="btn btn-ghost" id="btn-refresh">↻ Обнови</button>
      <a class="btn btn-ghost" id="btn-report" href="#" target="_blank" rel="noopener">📄 Отчет</a>
    </div>
    <p id="status-line" class="status-line">…</p>

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

    let sites = [];
    let selectedDomain = '';
    let strategy = null;
    let busy = false;

    const $ = (id) => document.getElementById(id);

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
      sel.onchange = () => { selectedDomain = sel.value; loadStrategy(); };
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

    function renderTech(probe, stats) {
      $('tech-detail').textContent = JSON.stringify({ probe, stats }, null, 2);
      $('btn-report').href = API('/report/' + encodeURIComponent(selectedDomain));
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
      } catch (e) {
        log('Грешка: ' + e.message);
      }
    }

    async function runFullAnalysis() {
      if (!selectedDomain || busy) return;
      busy = true;
      $('btn-analyze').disabled = true;
      log('Анализ: одит → въпроси → AI измерване… (~2 мин)');

      try {
        const res = await fetch(API('/api/pipeline/' + encodeURIComponent(selectedDomain) + '/run'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ measure: true, question_limit: 5, repetitions: 1 })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.hint || res.status);
        log('Готов! Презареждам стратегия…');
        await loadStrategy();
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
      const res = await fetch(API('/api/sites'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) {
        box.textContent = 'Грешка: ' + (data.error || data.hint || res.status);
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
            await fetch(API('/api/questions/' + btn.dataset.id), {
              method: 'PUT', headers: { 'Content-Type': 'application/json' },
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
    $('btn-refresh').onclick = loadStrategy;
    $('btn-gen-q').onclick = async () => {
      if (!selectedDomain) return;
      log('Генериране на въпроси…');
      await fetch(API('/api/questions/generate'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: selectedDomain, replace_auto: true })
      });
      loadQuestionsQuiet();
      log('Готово');
    };
    $('btn-add-q').onclick = async () => {
      const text = prompt('Нов въпрос:');
      if (!text?.trim()) return;
      await fetch(API('/api/questions'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: selectedDomain, text: text.trim(), source: 'manual' })
      });
      loadQuestionsQuiet();
    };

    loadSites().then(() => { if (selectedDomain) loadStrategy(); });
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
.foot{margin-top:2rem;padding-top:1rem;border-top:1px solid var(--border);color:var(--muted);font-size:.75rem}
`;
