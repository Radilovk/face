/**
 * Collect UI manual optimization tasks from findings + apply plan.
 */

/**
 * @param {object} finding
 */
export function isManualOptimizationTask(finding) {
  const a = finding?.automation ?? {};
  if (a.mode === 'manual') return true;
  if (a.manual_form?.fields?.length) return true;
  if (a.artifact?.content) return true;
  if (a.mode === 'semi_auto') return true;
  return false;
}

/**
 * @param {object} finding
 */
export function isAutoOnlyFinding(finding) {
  const a = finding?.automation ?? {};
  return a.mode === 'auto' && !a.manual_form?.fields?.length;
}

/**
 * @param {object[]} findings
 * @param {object} [applyPlan]
 */
export function buildManualTaskList(findings = [], applyPlan = null) {
  const tasks = [];
  const seen = new Set();

  for (const f of findings) {
    if (!isManualOptimizationTask(f)) continue;
    seen.add(f.id);
    tasks.push(taskFromFinding(f));
  }

  for (const fix of applyPlan?.fixes ?? []) {
    if (fix.type !== 'manual' || seen.has(fix.id) || seen.has(`apply_${fix.id}`)) continue;
    const id = `apply_${fix.id}`;
    seen.add(id);
    tasks.push({
      id,
      source: 'apply_plan',
      title: fix.title,
      instructions: fix.instructions ?? null,
      artifact: fix.artifact
        ? { format: fix.artifact_format ?? 'text', title: fix.title, content: String(fix.artifact) }
        : null,
      manual_form: manualFormForApplyFix(fix.id),
      severity: fix.priority === 'critical' ? 'critical' : 'warning',
      can_generate: false,
    });
  }

  return tasks.sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
}

function taskFromFinding(f) {
  const a = f.automation ?? {};
  return {
    id: f.id,
    source: 'finding',
    title: f.title,
    impact: f.impact ?? null,
    instructions: a.note ?? null,
    artifact: a.artifact ?? null,
    manual_form: a.manual_form ?? null,
    manual_gate: a.manual_gate ?? null,
    severity: f.severity ?? 'info',
    can_generate: Boolean(a.action && a.mode !== 'manual'),
    generate_label: a.label ?? 'Генерирай draft',
    intent: a.intent ?? null,
  };
}

function severityRank(sev) {
  return { critical: 0, warning: 1, info: 2, ok: 3 }[sev] ?? 9;
}

function manualFormForApplyFix(fixId) {
  if (fixId === 'homepage_content' || fixId === 'root_redirect') {
    return {
      id: 'cms_publish',
      title: 'Публикуване в CMS',
      fields: [
        { id: 'published_url', type: 'text', label: 'URL след publish', placeholder: 'https://…' },
        { id: 'notes', type: 'textarea', label: 'Бележки', placeholder: '' },
      ],
    };
  }
  if (fixId === 'jsonld' || fixId === 'robots') {
    return {
      id: 'cms_meta',
      title: 'Копиране в сайта',
      fields: [
        { id: 'applied', type: 'checkbox', label: 'Копирах snippet в сайта / head' },
        { id: 'notes', type: 'textarea', label: 'Бележки', placeholder: '' },
      ],
    };
  }
  return {
    id: 'done',
    title: 'Ръчна стъпка',
    fields: [{ id: 'done', type: 'checkbox', label: 'Маркирай като направено' }],
  };
}
