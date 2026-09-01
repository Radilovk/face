/**
 * Plain-text export of manual work for site administrators.
 * Everything the platform recommends but cannot apply automatically.
 */
import { buildManualTaskList } from './manualTasks.js';

/**
 * @param {object} input
 * @param {string} input.domain
 * @param {string} [input.brand]
 * @param {object} [input.verdict]
 * @param {string} [input.findings_summary]
 * @param {object[]} [input.findings]
 * @param {object[]} [input.manual_tasks]
 * @param {object} [input.applyPlan]
 * @param {object} [input.onboarding]
 * @param {object} [input.roadmap]
 * @param {string} [input.generated_at]
 */
export function buildManualExportText(input = {}) {
  const {
    domain = '',
    brand = '',
    verdict = null,
    findings_summary = '',
    findings = [],
    manual_tasks = null,
    applyPlan = null,
    onboarding = null,
    roadmap = null,
    generated_at = new Date().toISOString(),
  } = input;

  const tasks = manual_tasks ?? buildManualTaskList(findings, applyPlan);
  const findingById = new Map(findings.map((f) => [f.id, f]));
  const lines = [];

  lines.push('═'.repeat(72));
  lines.push('AI VISIBILITY — РЪЧНИ ПРЕПОРЪКИ ЗА АДМИНИСТРАТОРА НА САЙТА');
  lines.push('═'.repeat(72));
  lines.push('');
  lines.push(`Домейн: ${domain}`);
  if (brand) lines.push(`Марка: ${brand}`);
  lines.push(`Генерирано: ${formatBgDate(generated_at)}`);
  lines.push('');
  lines.push('Този файл съдържа само стъпки, които системата НЕ може да приложи');
  lines.push('автоматично (CMS, DNS, hosting, публикуване на текст).');
  lines.push('');

  if (verdict?.headline) {
    lines.push('─'.repeat(72));
    lines.push('ВЕРДИКТ');
    lines.push('─'.repeat(72));
    lines.push(verdict.headline);
    if (verdict.summary) lines.push(verdict.summary);
    lines.push('');
  }

  if (findings_summary) {
    lines.push(`Обобщение: ${findings_summary}`);
    lines.push('');
  }

  const humanRoadmap = (roadmap?.steps ?? []).filter(
    (s) => s.status === 'waiting_manual' || s.owner === 'human',
  );
  if (humanRoadmap.length) {
    lines.push('─'.repeat(72));
    lines.push('ПЛАН — ВАШИ РЪЧНИ СТЪПКИ');
    lines.push('─'.repeat(72));
    for (const s of humanRoadmap) {
      lines.push(`• ${s.title} — ${s.summary || s.status_label}`);
      for (const instr of s.instructions ?? []) {
        lines.push(`  - ${instr}`);
      }
    }
    lines.push('');
  }

  if (onboarding?.dns) {
    lines.push('─'.repeat(72));
    lines.push('DNS / CNAME');
    lines.push('─'.repeat(72));
    const dns = onboarding.dns;
    lines.push(`Тип: ${dns.type ?? 'CNAME'}`);
    lines.push(`Име: ${dns.name ?? domain}`);
    lines.push(`Стойност: ${dns.target ?? '—'}`);
    for (const step of onboarding.steps ?? []) {
      if (!step.done) {
        lines.push(`○ ${step.title} — ${step.detail}`);
      }
    }
    lines.push('');
  }

  lines.push('─'.repeat(72));
  lines.push(`ДЕТАЙЛНИ ЗАДАЧИ (${tasks.length})`);
  lines.push('─'.repeat(72));
  lines.push('');

  if (!tasks.length) {
    lines.push('Няма открити ръчни задачи — сайтът е готов за автоматични операции.');
    lines.push('');
  }

  tasks.forEach((task, idx) => {
    const finding = findingById.get(task.id);
    lines.push(`${idx + 1}. ${task.title}`);
    lines.push(`   Приоритет: ${severityLabel(task.severity)}`);
    if (task.impact || finding?.impact) {
      lines.push(`   Защо: ${task.impact || finding.impact}`);
    }
    if (task.instructions) {
      lines.push(`   Бележка: ${task.instructions}`);
    }
    const steps = finding?.fix?.steps ?? [];
    if (steps.length) {
      lines.push('   Стъпки:');
      steps.forEach((st, i) => lines.push(`     ${i + 1}. ${st}`));
    }
    if (task.manual_form) {
      lines.push(`   ${task.manual_form.title}:`);
      if (task.manual_form.hint) lines.push(`   ${task.manual_form.hint}`);
      for (const field of task.manual_form.fields ?? []) {
        lines.push(`   [ ] ${field.label}`);
      }
    }
    if (task.artifact?.content) {
      lines.push('');
      lines.push(`   --- Draft: ${task.artifact.title || 'artifact'} ---`);
      for (const line of String(task.artifact.content).split('\n')) {
        lines.push(`   ${line}`);
      }
      lines.push('   --- край на draft ---');
    }
    lines.push('');
  });

  const youFindings = findings.filter(
    (f) =>
      f.fix?.owner === 'you' &&
      !tasks.some((t) => t.id === f.id) &&
      f.severity !== 'ok',
  );
  if (youFindings.length) {
    lines.push('─'.repeat(72));
    lines.push('ДОПЪЛНИТЕЛНИ ПРЕПОРЪКИ (съдържание / конкуренция)');
    lines.push('─'.repeat(72));
    for (const f of youFindings) {
      lines.push(`• ${f.title}`);
      if (f.impact) lines.push(`  ${f.impact}`);
      for (const st of f.fix?.steps ?? []) {
        lines.push(`  - ${st}`);
      }
      lines.push('');
    }
  }

  lines.push('─'.repeat(72));
  lines.push('След като приложите промените: dashboard → „Повторен анализ“.');
  lines.push('═'.repeat(72));

  return lines.join('\n');
}

function severityLabel(sev) {
  return { critical: 'КРИТИЧНО', warning: 'ВАЖНО', info: 'Инфо', ok: 'OK' }[sev] ?? sev;
}

function formatBgDate(iso) {
  try {
    return new Date(iso).toLocaleString('bg-BG');
  } catch {
    return iso;
  }
}

export function manualExportFilename(domain) {
  const safe = String(domain || 'site')
    .replace(/^www\./, '')
    .replace(/[^a-z0-9.-]/gi, '-')
    .toLowerCase();
  const d = new Date().toISOString().slice(0, 10);
  return `aiv-rachni-preporuki-${safe}-${d}.txt`;
}
