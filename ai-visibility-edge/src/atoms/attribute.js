/**
 * Обратна атрибуция: кой точно атом е бил цитиран.
 *
 * Това е звеното, което никой друг няма — изисква едновременно да
 * публикуваш единицата и да наблюдаваш изхода на модела.
 *
 * Две защити срещу тихо грешни данни:
 *  1. Съвпадението се приема само ако наблюдението сочи домейна на атома —
 *     иначе препубликувано копие на трети сайт се брои за наше цитиране.
 *  2. Само публикувани атоми участват — черновите нямат проверен отпечатък.
 */

import { fingerprintInPassage, normalizeDomain } from './generate.js';

export const MATCH_METHOD = { FINGERPRINT: 'fingerprint' };

/**
 * Намира атома, чийто отпечатък присъства в пасажа.
 *
 * @param {string} citedPassage
 * @param {object[]} atoms — публикувани атоми на СЪЩИЯ домейн
 */
export function matchPassageToAtom(citedPassage, atoms) {
  if (!citedPassage) return null;

  for (const atom of atoms ?? []) {
    if (fingerprintInPassage(atom.fingerprint, citedPassage)) {
      return { atom, method: MATCH_METHOD.FINGERPRINT };
    }
  }
  return null;
}

/**
 * Опитва атрибуция за едно наблюдение и записва цитирането.
 *
 * @param {object} db
 * @param {object} observation — { id, run_id, model, domain, cited_passage }
 */
export async function attributeObservation(db, observation) {
  const domain = normalizeDomain(observation?.domain);
  const passage = observation?.cited_passage;
  if (!db || !domain || !passage) return { matched: false, reason: 'missing_input' };

  const { results: atoms } = await db
    .prepare(`SELECT id, fingerprint, domain FROM answer_atoms WHERE domain = ? AND status = 'published'`)
    .bind(domain)
    .all();

  if (!atoms?.length) return { matched: false, reason: 'no_published_atoms' };

  const hit = matchPassageToAtom(passage, atoms);
  if (!hit) return { matched: false, reason: 'no_fingerprint_in_passage' };

  await db
    .prepare(
      `INSERT OR IGNORE INTO atom_citations (
         id, atom_id, observation_id, run_id, model, domain, match_method, cited_passage, cited_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      crypto.randomUUID(),
      hit.atom.id,
      observation.id ?? null,
      observation.run_id ?? null,
      observation.model ?? 'unknown',
      domain,
      hit.method,
      String(passage).slice(0, 600),
      new Date().toISOString(),
    )
    .run();

  return { matched: true, atom_id: hit.atom.id, method: hit.method };
}

/**
 * Изгледът, който се продава: кой атом работи и кой не.
 * Нецитиран атом след достатъчно време е кандидат за пренаписване — това е
 * разликата между съвет и продукт с атрибуция.
 */
export async function atomPerformance(db, domain, { days = 90 } = {}) {
  const host = normalizeDomain(domain);
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const { results: atoms } = await db
    .prepare(
      `SELECT id, question_text, fact_value, fact_unit, fact_date, status, published_at
       FROM answer_atoms WHERE domain = ? ORDER BY published_at IS NULL, published_at DESC`,
    )
    .bind(host)
    .all();

  const { results: citations } = await db
    .prepare(
      `SELECT atom_id, model, COUNT(*) AS hits, MAX(cited_at) AS last_cited
       FROM atom_citations
       WHERE domain = ? AND cited_at >= ?
       GROUP BY atom_id, model`,
    )
    .bind(host, since)
    .all();

  const byAtom = new Map();
  for (const c of citations ?? []) {
    const entry = byAtom.get(c.atom_id) ?? { total: 0, by_model: [], last_cited: null };
    entry.total += c.hits;
    entry.by_model.push({ model: c.model, hits: c.hits });
    if (!entry.last_cited || c.last_cited > entry.last_cited) entry.last_cited = c.last_cited;
    byAtom.set(c.atom_id, entry);
  }

  const rows = (atoms ?? []).map((a) => {
    const stats = byAtom.get(a.id) ?? { total: 0, by_model: [], last_cited: null };
    return {
      atom_id: a.id,
      question: a.question_text,
      fact: [a.fact_value, a.fact_unit].filter(Boolean).join(' '),
      fact_date: a.fact_date,
      status: a.status,
      published_at: a.published_at,
      citations: stats.total,
      by_model: stats.by_model.sort((x, y) => y.hits - x.hits),
      last_cited: stats.last_cited,
      verdict: verdictFor(a, stats, days),
    };
  });

  const published = rows.filter((r) => r.status === 'published');
  const cited = published.filter((r) => r.citations > 0);

  return {
    domain: host,
    window_days: days,
    published_atoms: published.length,
    cited_atoms: cited.length,
    total_citations: published.reduce((sum, r) => sum + r.citations, 0),
    citation_share: published.length > 0 ? cited.length / published.length : 0,
    atoms: rows.sort((a, b) => b.citations - a.citations),
  };
}

function verdictFor(atom, stats, days) {
  if (atom.status !== 'published') return 'not_published';
  if (stats.total > 0) return 'working';

  const publishedAt = atom.published_at ? Date.parse(atom.published_at) : null;
  if (!publishedAt) return 'no_data';

  const ageDays = (Date.now() - publishedAt) / 86400000;
  if (ageDays < 14) return 'too_early';
  if (ageDays < days) return 'silent';
  return 'rewrite';
}
