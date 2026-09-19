/**
 * Съхранение и публикуване на атоми.
 *
 * Публикуване = отпечатъкът е проверен за уникалност. Неуникален отпечатък
 * приписва чуждо цитиране на нашия атом — фалшив положителен точно в
 * посоката, в която най-много ни се иска да сгрешим.
 */

import { buildAtom, validateAtom, isPublishable, normalizeDomain, ATOM_VERSION } from './generate.js';

export async function saveAtom(db, atom) {
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO answer_atoms (
         id, domain, tenant_id, question_id, question_text, answer_text,
         fact_value, fact_unit, fact_date, source_label, fingerprint,
         status, uniqueness, published_at, updated_at, atom_version
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(domain, question_id) DO UPDATE SET
         answer_text = excluded.answer_text,
         fact_value = excluded.fact_value,
         fact_unit = excluded.fact_unit,
         fact_date = excluded.fact_date,
         source_label = excluded.source_label,
         fingerprint = excluded.fingerprint,
         question_text = excluded.question_text,
         updated_at = excluded.updated_at,
         atom_version = excluded.atom_version`,
    )
    .bind(
      atom.id,
      normalizeDomain(atom.domain),
      atom.tenant_id ?? null,
      atom.question_id ?? null,
      atom.question_text,
      atom.answer_text,
      atom.fact_value,
      atom.fact_unit ?? null,
      atom.fact_date,
      atom.source_label ?? null,
      atom.fingerprint,
      atom.status ?? 'draft',
      atom.uniqueness ?? 'unchecked',
      atom.published_at ?? null,
      now,
      atom.atom_version ?? ATOM_VERSION,
    )
    .run();

  return { ...atom, updated_at: now };
}

export async function listAtoms(db, domain, { status = null } = {}) {
  const { results } = await db
    .prepare(
      `SELECT * FROM answer_atoms
       WHERE domain = ?
         AND (? IS NULL OR status = ?)
       ORDER BY updated_at DESC`,
    )
    .bind(normalizeDomain(domain), status, status)
    .all();
  return results ?? [];
}

export async function getAtom(db, atomId) {
  return db.prepare(`SELECT * FROM answer_atoms WHERE id = ?`).bind(atomId).first();
}

/**
 * Локална проверка за сблъсък: същият отпечатък при друг домейн.
 * Глобалната проверка (търсене в уеб) се подава отвън чрез `externalCheck`,
 * защото Worker-ът не бива да зависи от търсачка по време на публикуване.
 *
 * @param {Function} [externalCheck] — async (fingerprint, atom) => boolean (true = уникален)
 */
export async function checkUniqueness(db, atom, externalCheck = null) {
  const collision = await db
    .prepare(`SELECT id, domain FROM answer_atoms WHERE fingerprint = ? AND domain != ? LIMIT 1`)
    .bind(atom.fingerprint, normalizeDomain(atom.domain))
    .first();

  if (collision) {
    return {
      unique: false,
      uniqueness: 'collision',
      reason: `Същият отпечатък вече се ползва от ${collision.domain}.`,
    };
  }

  if (!externalCheck) {
    return { unique: true, uniqueness: 'local_ok', reason: 'Проверен само срещу нашата база.' };
  }

  const externallyUnique = await externalCheck(atom.fingerprint, atom);
  return externallyUnique
    ? { unique: true, uniqueness: 'verified', reason: 'Отпечатъкът не се среща другаде.' }
    : { unique: false, uniqueness: 'collision', reason: 'Отпечатъкът се среща извън домейна на клиента.' };
}

/**
 * Публикува атом: линтер → уникалност → status=published.
 * Всеки отказ носи причина, годна за показване в UI.
 */
export async function publishAtom(db, atomId, { externalCheck = null } = {}) {
  const atom = await getAtom(db, atomId);
  if (!atom) return { error: 'atom_not_found', atom_id: atomId };

  const issues = validateAtom(atom);
  if (issues.length > 0) {
    return { error: 'validation_failed', atom_id: atomId, issues };
  }

  const uniqueness = await checkUniqueness(db, atom, externalCheck);
  if (!uniqueness.unique) {
    await db
      .prepare(`UPDATE answer_atoms SET uniqueness = ?, updated_at = ? WHERE id = ?`)
      .bind(uniqueness.uniqueness, new Date().toISOString(), atomId)
      .run();
    return { error: 'fingerprint_not_unique', atom_id: atomId, reason: uniqueness.reason };
  }

  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE answer_atoms SET status = 'published', uniqueness = ?, published_at = ?, updated_at = ? WHERE id = ?`,
    )
    .bind(uniqueness.uniqueness, now, now, atomId)
    .run();

  return { ok: true, atom_id: atomId, status: 'published', uniqueness: uniqueness.uniqueness, published_at: now };
}

export async function retireAtom(db, atomId) {
  const now = new Date().toISOString();
  await db
    .prepare(`UPDATE answer_atoms SET status = 'retired', updated_at = ? WHERE id = ?`)
    .bind(now, atomId)
    .run();
  return { ok: true, atom_id: atomId, status: 'retired' };
}

/**
 * Създава чернови атоми за всички въпроси на домейн, за които има подаден факт.
 * Универсално: работи за всеки домейн, не само за регистриран tenant.
 *
 * @param {object[]} facts — [{ question_id, value, unit, date, label, body }]
 */
export async function generateAtomsForDomain(db, { domain, brand = null, tenantId = null, facts = [] }) {
  const created = [];
  const rejected = [];

  for (const fact of facts) {
    const questionRow = fact.question_id
      ? await db.prepare(`SELECT id, text FROM questions WHERE id = ?`).bind(fact.question_id).first()
      : null;

    const questionText = fact.question_text ?? questionRow?.text;
    if (!questionText) {
      rejected.push({ question_id: fact.question_id ?? null, issues: [{ code: 'no_question', message: 'Липсва въпрос.' }] });
      continue;
    }

    const atom = buildAtom({
      domain,
      brand,
      tenantId,
      questionId: fact.question_id ?? null,
      questionText,
      body: fact.body ?? null,
      sourceLabel: fact.label ?? null,
      fact: { value: fact.value, unit: fact.unit, date: fact.date },
    });

    const issues = validateAtom(atom);
    await saveAtom(db, atom);

    if (issues.length > 0) rejected.push({ atom_id: atom.id, question_id: atom.question_id, issues });
    else created.push(atom);
  }

  return {
    domain: normalizeDomain(domain),
    drafted: created.length + rejected.length,
    ready: created.length,
    needs_work: rejected.length,
    atoms: created,
    rejected,
  };
}

export { isPublishable };
