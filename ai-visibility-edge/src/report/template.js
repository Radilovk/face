/**
 * HTML diagnostic report — Извличане + Разпознаваемост (Block 3.6 MVP).
 */
export function renderReport(data) {
  const {
    domain,
    generated_at = new Date().toISOString(),
    probe,
    passage,
    diagnostic_score,
    displacement,
    sov,
  } = data;

  const displacementRows = (displacement?.events ?? [])
    .map(
      (e) => `
    <tr>
      <td>${esc(e.model)}</td>
      <td>${esc(e.question_id)}</td>
      <td>${esc(e.competitors_mentioned?.join(', ') ?? '')}</td>
      <td>${esc(e.summary)}</td>
    </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="bg">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AI Visibility — ${esc(domain)}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 860px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; line-height: 1.5; }
    h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
    h2 { font-size: 1.1rem; margin-top: 2rem; border-bottom: 1px solid #ddd; padding-bottom: 0.25rem; }
    .meta { color: #666; font-size: 0.9rem; }
    .score { font-size: 2rem; font-weight: 700; color: ${scoreColor(diagnostic_score)}; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th, td { text-align: left; padding: 0.5rem; border-bottom: 1px solid #eee; vertical-align: top; }
    th { background: #f8f8f8; }
    .badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.8rem; background: #eef; }
    .warn { background: #fff3cd; padding: 0.75rem; border-radius: 6px; margin: 1rem 0; }
    footer { margin-top: 3rem; font-size: 0.8rem; color: #888; }
  </style>
</head>
<body>
  <h1>AI Visibility Report</h1>
  <p class="meta">${esc(domain)} · ${esc(generated_at.slice(0, 19))} UTC</p>

  <p class="score">${diagnostic_score ?? '—'}/100</p>
  <p class="meta">Комбиниран технически + passage autonomy score</p>

  <h2>1. Извличане (probe)</h2>
  <table>
    <tr><th>HTTP статус</th><td>${probe?.http_status ?? '—'}</td></tr>
    <tr><th>Текст (chars)</th><td>${probe?.html_text_chars ?? '—'}</td></tr>
    <tr><th>JSON-LD блокове</th><td>${probe?.jsonld_blocks ?? '—'}</td></tr>
    <tr><th>Canonical</th><td>${probe?.has_canonical ? 'Да' : 'Не'}</td></tr>
    <tr><th>robots.txt</th><td>${esc(probe?.robots_ai_policy ?? '—')}</td></tr>
    <tr><th>Ценови токени</th><td>${probe?.price_tokens ?? '—'}</td></tr>
    <tr><th>Passage autonomy</th><td>${passage?.score ?? '—'}/100 (${passage?.paragraphs ?? 0} абзаца, ${passage?.anaphora_starts ?? 0} анафори)</td></tr>
  </table>

  <h2>2. Разпознаваемост (displacement)</h2>
  ${
    displacement?.displaced_count > 0
      ? `<div class="warn"><strong>Изместване:</strong> В ${displacement.displaced_count} от ${displacement.total_runs} AI отговора конкуренти се споменават, а ${esc(domain)} липсва (rate: ${Math.round((displacement.displacement_rate ?? 0) * 100)}%).</div>`
      : `<p><span class="badge">OK</span> Няма регистрирано изместване спрямо tracked конкуренти (${displacement?.total_runs ?? 0} runs).</p>`
  }
  ${
    displacementRows
      ? `<table><thead><tr><th>Модел</th><th>Въпрос</th><th>Конкуренти</th><th>Резюме</th></tr></thead><tbody>${displacementRows}</tbody></table>`
      : ''
  }

  ${
    sov
      ? `<h2>3. AI-SOV</h2>
  <table>
    <tr><th>SOV</th><td>${sov.sov?.toFixed(2) ?? '—'}%</td></tr>
    <tr><th>Frequency</th><td>${sov.frequency?.toFixed(3) ?? '—'}</td></tr>
    <tr><th>Integrity</th><td>${sov.integrity?.toFixed(3) ?? '—'}</td></tr>
    <tr><th>Observations</th><td>${sov.observations_count ?? '—'}</td></tr>
  </table>`
      : ''
  }

  <footer>AI Visibility Edge · Block 3 MVP · Не е SEO одит — измерва AI извличане и цитиране.</footer>
</body>
</html>`;
}

function scoreColor(score) {
  if (score == null) return '#666';
  if (score >= 70) return '#198754';
  if (score >= 40) return '#fd7e14';
  return '#dc3545';
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
