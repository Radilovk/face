/** Tenant metadata for dashboard (mirrors D1 seed). */
export const TENANTS = [
  {
    domain: 'daotslabna.com',
    name: 'Да отслабна',
    vertical_id: 'weight-loss-supplements-bg',
    vertical: 'Добавки за отслабване',
    canary: false,
  },
  {
    domain: 'biocode-bg.com',
    name: 'BIOCODE Nutrition',
    vertical_id: 'sports-nutrition-supplements-bg',
    vertical: 'Спортни добавки',
    canary: true,
  },
  {
    domain: 'life-protocols.com',
    name: 'Life Protocols',
    vertical_id: 'longevity-protocols-bg',
    vertical: 'Дълголетие / biohacking',
    canary: false,
  },
  {
    domain: 'biocode-peptides.com',
    name: 'BIOCODE Peptides',
    vertical_id: 'peptides-research-bg',
    vertical: 'Research пептиди',
    canary: false,
  },
];

export const GITHUB_ACTIONS = {
  repo: 'https://github.com/Radilovk/face/actions',
  baseline: 'https://github.com/Radilovk/face/actions/workflows/aiv-baseline-collect.yml',
  deploy: 'https://github.com/Radilovk/face/actions/workflows/aiv-deploy.yml',
  tests: 'https://github.com/Radilovk/face/actions/workflows/aiv-test.yml',
};

export async function fetchDashboardSummary(env) {
  const summary = {
    generated_at: new Date().toISOString(),
    health: {
      ok: true,
      db: Boolean(env.DB),
      kv: Boolean(env.CACHE),
      baseline_id: env.BASELINE_ID ?? '2026-08-27',
    },
    baseline: null,
    runs: null,
    observations: null,
    tenants: TENANTS,
  };

  summary.baseline = await readBaselineStatus(env);

  if (env.DB) {
    try {
      const { results } = await env.DB.prepare(
        `SELECT model, COUNT(*) as count FROM runs GROUP BY model`,
      ).all();
      const total = await env.DB.prepare(`SELECT COUNT(*) as n FROM runs`).first();
      summary.runs = { total: total?.n ?? 0, by_model: results ?? [] };
    } catch (err) {
      summary.runs = { error: err.message };
    }

    try {
      const { results } = await env.DB.prepare(
        `SELECT class, COUNT(*) as count FROM observations GROUP BY class ORDER BY count DESC`,
      ).all();
      const mis = await env.DB.prepare(`SELECT COUNT(*) as n FROM misattributions`).first();
      summary.observations = {
        by_class: results ?? [],
        misattributions: mis?.n ?? 0,
      };
    } catch (err) {
      summary.observations = { error: err.message };
    }
  }

  return summary;
}

async function readBaselineStatus(env) {
  const baselineId = env.BASELINE_ID ?? '2026-08-27';
  const key = `aiv/baseline/${baselineId}/manifest`;

  if (env.CACHE) {
    const manifest = await env.CACHE.get(key, 'json');
    if (manifest) {
      return { source: 'kv', baseline_id: baselineId, ...manifest };
    }
  }

  return {
    source: 'default',
    baseline_id: baselineId,
    status: 'questions_ready',
    hint: 'Пусни aiv-baseline-collect в GitHub Actions',
  };
}

export function renderDashboardPage(origin) {
  const tenantsJson = JSON.stringify(TENANTS);
  const ghJson = JSON.stringify(GITHUB_ACTIONS);

  return `<!DOCTYPE html>
<html lang="bg">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AI Visibility Edge — Control Panel</title>
  <style>
    :root {
      --bg: #0f1419;
      --surface: #1a2332;
      --surface2: #243044;
      --text: #e7ecf3;
      --muted: #8b9cb3;
      --accent: #3b82f6;
      --ok: #22c55e;
      --warn: #f59e0b;
      --err: #ef4444;
      --border: #2d3a4f;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
    }
    .wrap { max-width: 960px; margin: 0 auto; padding: 1.25rem; }
    header { margin-bottom: 1.5rem; }
    h1 { font-size: 1.5rem; margin: 0 0 0.25rem; }
    .sub { color: var(--muted); font-size: 0.95rem; }
    .grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); margin-bottom: 1.5rem; }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1rem;
    }
    .card h3 { margin: 0 0 0.5rem; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); }
    .card .val { font-size: 1.4rem; font-weight: 700; }
    .badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
    .badge-ok { background: #14532d; color: #86efac; }
    .badge-warn { background: #78350f; color: #fcd34d; }
    .badge-err { background: #7f1d1d; color: #fca5a5; }
    section { margin-bottom: 2rem; }
    section h2 { font-size: 1.1rem; margin: 0 0 0.75rem; padding-bottom: 0.35rem; border-bottom: 1px solid var(--border); }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th, td { text-align: left; padding: 0.6rem 0.5rem; border-bottom: 1px solid var(--border); }
    th { color: var(--muted); font-weight: 600; font-size: 0.8rem; }
    a { color: #93c5fd; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .btn {
      display: inline-block;
      background: var(--accent);
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      cursor: pointer;
      text-decoration: none;
      margin-right: 0.5rem;
      margin-bottom: 0.5rem;
    }
    .btn:hover { filter: brightness(1.1); text-decoration: none; }
    .btn-secondary { background: var(--surface2); color: var(--text); border: 1px solid var(--border); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .explain { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 1rem 1.25rem; }
    .explain p { margin: 0.5rem 0; color: var(--muted); }
    .explain strong { color: var(--text); }
    .flow { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; margin: 1rem 0; font-size: 0.85rem; }
    .flow span { background: var(--surface2); padding: 0.35rem 0.65rem; border-radius: 6px; }
    .flow .arrow { background: none; color: var(--muted); padding: 0; }
    details { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 0.75rem 1rem; margin-bottom: 0.75rem; }
    summary { cursor: pointer; font-weight: 600; }
    code { background: var(--surface2); padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.85em; }
    pre { overflow-x: auto; background: var(--surface2); padding: 0.75rem; border-radius: 8px; font-size: 0.8rem; }
    #log { font-family: monospace; font-size: 0.8rem; white-space: pre-wrap; background: var(--surface2); padding: 0.75rem; border-radius: 8px; min-height: 2rem; color: var(--muted); }
    footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--border); color: var(--muted); font-size: 0.8rem; }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>AI Visibility Edge</h1>
      <p class="sub">Control panel — измерване, диагностика и отчети за AI видимост</p>
      <p class="sub"><code id="origin">${esc(origin)}</code> · <span id="updated">зареждане…</span></p>
    </header>

    <div class="grid" id="status-grid">
      <div class="card"><h3>Worker</h3><div class="val" id="st-worker">…</div></div>
      <div class="card"><h3>D1 база</h3><div class="val" id="st-db">…</div></div>
      <div class="card"><h3>KV cache</h3><div class="val" id="st-kv">…</div></div>
      <div class="card"><h3>Baseline</h3><div class="val" id="st-baseline">…</div></div>
      <div class="card"><h3>Runs</h3><div class="val" id="st-runs">…</div></div>
      <div class="card"><h3>Observations</h3><div class="val" id="st-obs">…</div></div>
    </div>

    <section>
      <h2>Какво прави системата</h2>
      <div class="explain">
        <p><strong>Слой 1 — Измерване:</strong> Пита OpenAI/Gemini реални BG въпроси → записва raw отговори в D1 (<code>runs</code>).</p>
        <p><strong>Verify + classify:</strong> Проверява цитати по пасаж → <code>observations</code> + SOV + misattributions.</p>
        <p><strong>Диагностика:</strong> Probe на сайта + displacement („конкуренти изброени, теб няма“) → HTML отчет.</p>
        <div class="flow">
          <span>Baseline collect</span><span class="arrow">→</span>
          <span>D1 runs</span><span class="arrow">→</span>
          <span>Reprocess</span><span class="arrow">→</span>
          <span>Observations</span><span class="arrow">→</span>
          <span>Report</span>
        </div>
        <p>Edge поправка (Блок 4) — <em>не е активна</em>. Първо натрупваме данни 4+ седмици.</p>
      </div>
    </section>

    <section>
      <h2>Tenant домейни</h2>
      <table>
        <thead>
          <tr><th>Домейн</th><th>Вертикал</th><th>Отчет</th><th>Displacement</th></tr>
        </thead>
        <tbody id="tenant-rows"></tbody>
      </table>
    </section>

    <section>
      <h2>Действия</h2>
      <button class="btn" id="btn-refresh">↻ Обнови статус</button>
      <button class="btn" id="btn-reprocess">Reprocess runs → observations</button>
      <a class="btn btn-secondary" href="${GITHUB_ACTIONS.baseline}" target="_blank" rel="noopener">GitHub: Baseline collect</a>
      <a class="btn btn-secondary" href="${GITHUB_ACTIONS.deploy}" target="_blank" rel="noopener">GitHub: Deploy Worker</a>
      <div id="log" style="margin-top:1rem"></div>
    </section>

    <section>
      <h2>Често срещани проблеми</h2>
      <details open>
        <summary>„There is nothing here yet“ в браузъра</summary>
        <p>Грешен URL или Worker без D1. Използвай <strong>този dashboard</strong> или пълен path <code>/report/domain.com</code>. Пусни <strong>aiv-deploy</strong> в GitHub.</p>
      </details>
      <details>
        <summary>Runs има, observations празни</summary>
        <p>Натисни <strong>Reprocess</strong> по-горе или <code>POST /api/citations/reprocess</code>.</p>
      </details>
      <details>
        <summary>Perplexity</summary>
        <p>Опционален. Baseline изисква само OpenAI + Gemini.</p>
      </details>
    </section>

    <section>
      <h2>API референция</h2>
      <pre id="api-ref"></pre>
    </section>

    <footer>
      AI Visibility Edge · Block 1–3 MVP · Документация в repo <code>ai-visibility-edge/docs/</code>
    </footer>
  </div>
  <script>
    const ORIGIN = ${JSON.stringify(origin)};
    const TENANTS = ${tenantsJson};

    const API = (path) => ORIGIN + path;

    document.getElementById('api-ref').textContent = [
      'GET  ' + ORIGIN + '/health',
      'GET  ' + ORIGIN + '/dashboard',
      'GET  ' + ORIGIN + '/api/dashboard/summary',
      'GET  ' + ORIGIN + '/api/baseline/status',
      'GET  ' + ORIGIN + '/api/runs/stats',
      'GET  ' + ORIGIN + '/api/observations/stats',
      'POST ' + ORIGIN + '/api/citations/reprocess',
      'GET  ' + ORIGIN + '/report/{domain}',
      'GET  ' + ORIGIN + '/api/diagnose/displacement?domain=&vertical_id=',
    ].join('\\n');

    function log(msg) {
      const el = document.getElementById('log');
      el.textContent = new Date().toISOString().slice(11, 19) + ' ' + msg;
    }

    function badge(ok, okText, errText) {
      const c = ok ? 'badge-ok' : 'badge-err';
      return '<span class="badge ' + c + '">' + (ok ? okText : errText) + '</span>';
    }

    function renderTenants() {
      const tbody = document.getElementById('tenant-rows');
      tbody.innerHTML = TENANTS.map(t => {
        const canary = t.canary ? ' <span class="badge badge-warn">canary</span>' : '';
        return '<tr>' +
          '<td><strong>' + t.domain + '</strong>' + canary + '<br><small style="color:var(--muted)">' + t.name + '</small></td>' +
          '<td>' + t.vertical + '</td>' +
          '<td><a href="' + API('/report/' + t.domain) + '" target="_blank">Отчет →</a></td>' +
          '<td><a href="' + API('/api/diagnose/displacement?domain=' + t.domain + '&vertical_id=' + t.vertical_id) + '" target="_blank">JSON →</a></td>' +
          '</tr>';
      }).join('');
    }

    async function loadSummary() {
      log('Зареждане…');
      try {
        const res = await fetch(API('/api/dashboard/summary'));
        const data = await res.json();
        document.getElementById('updated').textContent = 'обновено ' + new Date().toLocaleTimeString('bg-BG');

        document.getElementById('st-worker').innerHTML = badge(data.health?.ok, 'OK', 'FAIL');
        document.getElementById('st-db').innerHTML = badge(data.health?.db, 'Свързана', 'Липсва — deploy');
        document.getElementById('st-kv').innerHTML = badge(data.health?.kv, 'OK', 'Липсва');

        const bl = data.baseline?.status || data.baseline?.source || '—';
        document.getElementById('st-baseline').textContent = bl;
        document.getElementById('st-runs').textContent = data.runs?.total ?? (data.health?.db ? '0' : '—');
        const obsCount = (data.observations?.by_class || []).reduce((s, r) => s + r.count, 0);
        document.getElementById('st-obs').textContent = data.health?.db ? obsCount : '—';

        if (!data.health?.db) {
          log('D1 не е свързана. GitHub → aiv-deploy → Run workflow на main.');
        } else {
          log('OK · runs=' + (data.runs?.total ?? 0) + ' · obs=' + obsCount);
        }
      } catch (e) {
        log('Грешка: ' + e.message);
      }
    }

    async function reprocess() {
      const btn = document.getElementById('btn-reprocess');
      btn.disabled = true;
      log('Reprocess…');
      try {
        const res = await fetch(API('/api/citations/reprocess'), { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.hint || res.status);
        log('Reprocess готово: ' + JSON.stringify(data));
        await loadSummary();
      } catch (e) {
        log('Reprocess грешка: ' + e.message);
      } finally {
        btn.disabled = false;
      }
    }

    document.getElementById('btn-refresh').onclick = loadSummary;
    document.getElementById('btn-reprocess').onclick = reprocess;
    renderTenants();
    loadSummary();
  </script>
</body>
</html>`;
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
