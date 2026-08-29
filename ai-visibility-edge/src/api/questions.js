/** Questions CRUD + auto-generation for measurement pipeline. */

import { generateQuestionDraftsSmart } from '../questions/generateSmart.js';
import { probeDomain } from '../diagnose/probe.js';

const QTYPE_DEFAULT = 'informational';

export function generateQuestionDrafts({ domain, brand, verticalLabel }) {
  const b = brand || domain.replace(/^www\./, '').split('.')[0];
  const v = verticalLabel || 'продукти';
  const host = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');

  return [
    {
      text: `Къде да купя ${v} онлайн в България с доставка?`,
      qtype: 'product',
      source: 'auto',
      intent: 'product',
    },
    {
      text: `Кои са най-популярните марки за ${v} в България през 2026?`,
      qtype: 'comparative',
      source: 'auto',
      intent: 'comparative',
    },
    {
      text: `${b} ${host} — надежден ли е сайтът и какво предлага?`,
      qtype: 'brand',
      source: 'auto',
      intent: 'brand',
    },
    {
      text: `Как да избера ${v} според цена и качество?`,
      qtype: 'informational',
      source: 'auto',
      intent: 'informational',
    },
    {
      text: `Търся ${v} с доставка в България, бюджет до 100 €. Кои онлайн магазини препоръчвате?`,
      qtype: 'product',
      source: 'auto',
      intent: 'product',
    },
  ];
}

export async function listQuestions(db, { domain, verticalId, tenantId }) {
  let query = `SELECT q.id, q.vertical_id, q.tenant_id, q.text, q.qtype, q.source, q.intent
               FROM questions q`;
  const binds = [];

  if (tenantId) {
    query += ` WHERE q.tenant_id = ?`;
    binds.push(tenantId);
  } else if (verticalId) {
    query += ` WHERE q.vertical_id = ?`;
    binds.push(verticalId);
  } else if (domain) {
    query += ` JOIN tenants t ON t.id = q.tenant_id WHERE t.apex_host = ? OR t.apex_host = ?`;
    binds.push(domain.replace(/^www\./, ''), domain);
  }

  query += ` ORDER BY q.id`;

  const { results } = await db.prepare(query).bind(...binds).all();
  return results ?? [];
}

export async function resolveTenantByDomain(db, domain) {
  const normalized = domain.replace(/^www\./, '').toLowerCase().split('/')[0];
  return db
    .prepare(
      `SELECT t.id, t.name, t.apex_host, t.is_canary, t.edge_enabled, t.edge_status,
              wd.vertical_id, v.name as vertical_name
       FROM tenants t
       LEFT JOIN watched_domains wd ON wd.tenant_id = t.id AND wd.role = 'tenant'
       LEFT JOIN verticals v ON v.id = wd.vertical_id
       WHERE t.apex_host = ?`,
    )
    .bind(normalized)
    .first();
}

export async function generateAndSaveQuestions(db, {
  domain,
  brand,
  verticalLabel,
  replaceAuto = false,
  probe = null,
  env = null,
  useSiteContext = true,
}) {
  const tenant = await resolveTenantByDomain(db, domain);
  if (!tenant) {
    return { error: 'unknown_domain', domain };
  }

  if (replaceAuto) {
    await db
      .prepare(`DELETE FROM questions WHERE tenant_id = ? AND source = 'auto'`)
      .bind(tenant.id)
      .run();
  }

  let activeProbe = probe;
  if (useSiteContext && !activeProbe && env) {
    try {
      activeProbe = await probeDomain(tenant.apex_host);
    } catch (err) {
      console.warn('[questions] probe for context failed:', err.message);
    }
  }

  const { drafts, method, model, brief, error } = await generateQuestionDraftsSmart({
    domain: tenant.apex_host,
    brand: brand ?? tenant.name,
    verticalLabel: verticalLabel ?? tenant.vertical_name,
    probe: activeProbe,
    env: useSiteContext ? env : null,
  });

  const saved = [];
  for (const d of drafts) {
    const id = `q-${crypto.randomUUID().slice(0, 8)}`;
    await db
      .prepare(
        `INSERT INTO questions (id, vertical_id, tenant_id, text, qtype, source, intent)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, tenant.vertical_id, tenant.id, d.text, d.qtype, d.source, d.intent ?? d.qtype)
      .run();
    saved.push({ id, ...d });
  }

  return {
    domain: tenant.apex_host,
    tenant_id: tenant.id,
    generated: saved.length,
    questions: saved,
    generation_method: method,
    gemini_model: model ?? null,
    site_brief: brief
      ? { title: brief.title, vertical: brief.vertical, signals: brief.diagnostic_signals }
      : null,
    generation_error: error ?? null,
  };
}

export async function createQuestion(db, body) {
  const { domain, text, qtype = QTYPE_DEFAULT, source = 'manual', intent } = body;
  if (!domain || !text?.trim()) {
    return { error: 'domain and text required' };
  }

  const tenant = await resolveTenantByDomain(db, domain);
  if (!tenant) return { error: 'unknown_domain', domain };

  const id = body.id ?? `q-${crypto.randomUUID().slice(0, 8)}`;
  await db
    .prepare(
      `INSERT INTO questions (id, vertical_id, tenant_id, text, qtype, source, intent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, tenant.vertical_id, tenant.id, text.trim(), qtype, source, intent ?? qtype)
    .run();

  return { id, domain: tenant.apex_host, text: text.trim(), qtype, source };
}

export async function updateQuestion(db, questionId, body) {
  const row = await db.prepare(`SELECT id FROM questions WHERE id = ?`).bind(questionId).first();
  if (!row) return { error: 'not_found', id: questionId };

  const text = body.text?.trim();
  const qtype = body.qtype;
  if (text) {
    await db.prepare(`UPDATE questions SET text = ?, source = 'manual' WHERE id = ?`).bind(text, questionId).run();
  }
  if (qtype) {
    await db.prepare(`UPDATE questions SET qtype = ? WHERE id = ?`).bind(qtype, questionId).run();
  }

  return { id: questionId, updated: true };
}

export async function deleteQuestion(db, questionId) {
  const r = await db.prepare(`DELETE FROM questions WHERE id = ?`).bind(questionId).run();
  return { id: questionId, deleted: r.meta.changes > 0 };
}
