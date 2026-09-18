/**
 * Папката за срещата: какво е казал моделът за марката, колко често, с дати.
 *
 * Принцип: показваме факт и честота, не правна квалификация. Изводът остава
 * на клиента. Затова докладът не съдържа думите „глоба", „санкция", „нарушение".
 */

import { scanBrandRisk, groupByRiskClass } from './scan.js';
import { RISK_CLASSES } from './claimRisk.js';

/**
 * @param {object} env
 * @param {string} domain — марката, включително чужда
 * @param {object} [options] — { brandName, verticalId, model, days, persist }
 */
export async function buildBrandRiskReport(env, domain, options = {}) {
  if (!env?.DB) return { error: 'db_not_bound' };

  const scan = await scanBrandRisk(env.DB, { domain, ...options });
  if (scan.error) return scan;

  const groups = groupByRiskClass(scan.findings);
  const headline = buildHeadline(scan);

  return {
    domain: scan.domain,
    window_days: scan.window_days,
    scanned_runs: scan.scanned_runs,
    questions: scan.questions,
    rate: scan.rate,
    headline,
    groups,
    risk_version: scan.risk_version,
    generated_at: scan.generated_at,
  };
}

/**
 * Заглавният ред. При достатъчна извадка — коефициентът и какво значи той
 * за човека отсреща, който след минута ще извади телефона си.
 */
export function buildHeadline(scan) {
  const { rate } = scan;
  const critical = scan.findings.filter((f) => f.severity === 'critical').length;

  if (scan.findings.length === 0) {
    return {
      level: 'ok',
      title: 'Няма открити рискови твърдения',
      detail: `${scan.scanned_runs} отговора за ${scan.window_days} дни. Продължаваме наблюдението.`,
    };
  }

  if (!rate.sufficient_power) {
    return {
      level: 'warning',
      title: `${scan.findings.length} рискови твърдения, приписани на марката`,
      detail: `${rate.hint} Находките по-долу са проверими поотделно — всяка сочи към суровия отговор и датата му.`,
    };
  }

  const pct = Math.round(rate.hallucination_rate * 100);
  const clean = 100 - pct;

  return {
    level: critical > 0 ? 'critical' : 'warning',
    title: `В ${pct}% от отговорите моделът приписва на марката твърдение, което тя не е правила`,
    detail:
      `${rate.runs_with_risk} от ${rate.total_runs} изпълнения за ${scan.window_days} дни. ` +
      `Ако зададете въпроса сега, има около ${clean}% шанс да получите чист отговор — ` +
      `затова единичната проверка не показва проблема, а разпределението го показва.`,
  };
}

export function renderBrandRiskReport(report) {
  if (report.error) return `<p>Грешка: ${esc(report.error)}</p>`;

  const rate = report.rate;
  const rateBlock = rate.sufficient_power
    ? `<p class="rate"><strong>${Math.round(rate.hallucination_rate * 100)}%</strong>
         коефициент на рисково твърдение · ${rate.runs_with_risk} от ${rate.total_runs} изпълнения</p>
       ${renderModelTable(rate.by_model)}`
    : `<p class="rate-insufficient">${esc(rate.hint)}</p>`;

  return `<!doctype html>
<html lang="bg"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Какво казват AI моделите за ${esc(report.domain)}</title>
<style>
  body{font:16px/1.6 system-ui,sans-serif;max-width:52rem;margin:0 auto;padding:2rem 1.25rem;color:#16191d}
  h1{font-size:1.6rem;line-height:1.2;margin:0 0 .25rem}
  .sub{color:#5b6670;margin:0 0 2rem}
  .headline{border-left:4px solid #b3261e;padding:.75rem 1rem;background:#fbeceb;margin-bottom:1.5rem}
  .headline.warning{border-color:#a2621b;background:#fbf1e4}
  .headline.ok{border-color:#1b6448;background:#e6f2ec}
  .headline h2{font-size:1.15rem;margin:0 0 .35rem}
  .rate{font-size:1.05rem}
  .rate strong{font-size:1.5rem}
  .rate-insufficient{color:#7a5a12;background:#fbf6e6;padding:.6rem .8rem}
  table{border-collapse:collapse;width:100%;margin:.75rem 0;font-size:.9rem}
  th,td{text-align:left;padding:.35rem .5rem;border-bottom:1px solid #e0e4e8}
  .group{margin-top:2rem}
  .group h3{font-size:1.05rem;margin:0 0 .5rem;padding-bottom:.3rem;border-bottom:2px solid #16191d}
  .finding{border-bottom:1px solid #e0e4e8;padding:.9rem 0}
  .q{font-size:.82rem;color:#5b6670;margin:0 0 .3rem}
  blockquote{margin:.4rem 0;padding-left:.8rem;border-left:3px solid #b3261e;font-size:.97rem}
  .meta{font:.75rem ui-monospace,monospace;color:#78848e}
  mark{background:#ffe8a3}
</style></head><body>
<h1>Какво казват AI моделите за ${esc(report.domain)}</h1>
<p class="sub">${report.scanned_runs} отговора · ${report.questions} въпроса · последните ${report.window_days} дни</p>

<div class="headline ${esc(report.headline.level)}">
  <h2>${esc(report.headline.title)}</h2>
  <p>${esc(report.headline.detail)}</p>
</div>

${rateBlock}

${report.groups.map(renderGroup).join('')}

<p class="meta">Методика: ${esc(report.risk_version)} · генериран ${esc(report.generated_at)}<br>
Документът съдържа наблюдения, не правна оценка. Суровите отговори се пазят непроменени и се предоставят при поискване.</p>
</body></html>`;
}

function renderGroup(group) {
  return `<div class="group">
    <h3>${esc(group.label)} — ${group.count}</h3>
    ${group.findings.map(renderFinding).join('')}
  </div>`;
}

function renderFinding(f) {
  return `<div class="finding">
    <p class="q">Въпрос: ${esc(f.question_text ?? f.question_id ?? '—')}</p>
    <blockquote>${highlight(f.sentence, f.evidence)}</blockquote>
    <p class="meta">${esc(f.model)} · ${esc(f.run_at)} · run ${esc(f.run_id)}</p>
  </div>`;
}

function renderModelTable(byModel) {
  if (!byModel?.length) return '';
  return `<table>
    <tr><th>Модел</th><th>Изпълнения</th><th>С рисково твърдение</th><th>Дял</th></tr>
    ${byModel
      .map(
        (m) =>
          `<tr><td>${esc(m.model)}</td><td>${m.runs}</td><td>${m.runs_with_risk}</td><td>${Math.round(
            m.rate * 100,
          )}%</td></tr>`,
      )
      .join('')}
  </table>`;
}

/** Подчертава намерения израз вътре в изречението, без да чупи екранирането. */
function highlight(sentence, evidence) {
  const safe = esc(sentence);
  if (!evidence) return safe;
  const safeEvidence = esc(evidence);
  const idx = safe.toLowerCase().indexOf(safeEvidence.toLowerCase());
  if (idx < 0) return safe;
  return (
    safe.slice(0, idx) + '<mark>' + safe.slice(idx, idx + safeEvidence.length) + '</mark>' + safe.slice(idx + safeEvidence.length)
  );
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export { RISK_CLASSES };
