/**
 * Генератор на атоми — атомарни проверими твърдения.
 *
 * Атомът е най-малката единица, която модел може да цитира: самостоятелен
 * отговор на един въпрос, съдържащ едно първично число с дата и източник.
 *
 * Три правила, които го правят цитируем:
 *  1. Първото изречение се разбира без предходен контекст (анафора — MASTER 0.5).
 *  2. Съдържа число, което никой друг не може да декларира.
 *  3. Не съдържа твърдение, което собственият ни радар би маркирал като рисково.
 */

import { classifyClaim } from '../risk/claimRisk.js';
import { startsWithWord } from '../lang/boundaries.js';

export const ATOM_VERSION = 'atom-2026-09';

export const LENGTH = { min: 25, target: [40, 60], max: 80 };

/** Начала, които изискват предходно изречение — забранени в първото. */
const ANAPHORA = startsWithWord(
  'това|този|тази|тези|той|тя|то|те|такъв|такава|такива|затова|освен\\s+това|' +
    'също\\s+така|същият|същата|it|this|that|these|those|they|he|she|therefore|also',
);

/**
 * Построява атом от въпрос + първичен факт.
 *
 * @param {object} input
 * @param {string} input.domain
 * @param {string} input.questionText
 * @param {object} input.fact — { value, unit, date, label }
 * @param {string} [input.brand]
 * @param {string} [input.body] — тялото на отговора; ако липсва, се сглобява
 * @param {string} [input.sourceLabel] — как е получено числото
 */
export function buildAtom(input = {}) {
  const { domain, questionText, fact = {}, brand = null, body = null, sourceLabel = null, questionId = null, tenantId = null } = input;

  const factValue = String(fact.value ?? '').trim();
  const factUnit = fact.unit ? String(fact.unit).trim() : null;
  const factDate = String(fact.date ?? '').trim();

  const answerText = body?.trim() || composeAnswer({ brand, domain, questionText, factValue, factUnit, factDate, sourceLabel });

  return {
    id: atomId(domain, questionId ?? questionText),
    domain: normalizeDomain(domain),
    tenant_id: tenantId,
    question_id: questionId,
    question_text: questionText,
    answer_text: answerText,
    fact_value: factValue,
    fact_unit: factUnit,
    fact_date: factDate,
    source_label: sourceLabel,
    fingerprint: buildFingerprint({ value: factValue, unit: factUnit, date: factDate }),
    status: 'draft',
    uniqueness: 'unchecked',
    atom_version: ATOM_VERSION,
  };
}

/**
 * Отпечатъкът е нормализираният кортеж (число, единица, дата).
 * Числото оцелява при парафраза — прозата не оцелява. Затова матчваме него.
 */
export function buildFingerprint({ value, unit, date }) {
  const v = String(value ?? '')
    .replace(/\s+/g, '')
    .replace(',', '.')
    .toLowerCase();
  const u = String(unit ?? '')
    .replace(/\s+/g, '')
    .toLowerCase();
  const d = String(date ?? '').trim();
  return [v, u, d].filter(Boolean).join('|');
}

/**
 * Проверява дали пасаж носи отпечатъка на атом.
 * Търси числото и (ако има) единицата в близост — датата не се изисква,
 * защото моделите често я изпускат при преразказ.
 */
export function fingerprintInPassage(fingerprint, passage) {
  if (!fingerprint || !passage) return false;
  const [value, unit] = fingerprint.split('|');
  if (!value) return false;

  // „1 234,50" → „1234.50", за да съвпада с нормализираната стойност
  const hay = String(passage)
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/(\d)[\s](\d)/g, '$1$2')
    .replace(/,(\d)/g, '.$1');

  let from = 0;
  while (true) {
    const idx = hay.indexOf(value, from);
    if (idx < 0) return false;
    from = idx + 1;

    // „2" не бива да съвпада вътре в „12" или „2026"
    const before = hay[idx - 1];
    const after = hay[idx + value.length];
    if (before && /[\d.]/.test(before)) continue;
    if (after && /\d/.test(after)) continue;

    if (!unit) return true;

    // Единицата в отпечатъка е без интервали („работнидни") — същото за прозореца
    const window = hay.slice(idx + value.length, idx + value.length + 24).replace(/\s+/g, '');
    if (window.startsWith(unit) || window.includes(unit)) return true;
  }
}

/**
 * Линтерът. Връща списък проблеми — празен списък значи готов за публикуване.
 */
export function validateAtom(atom) {
  const issues = [];
  const text = atom?.answer_text ?? '';
  const sentences = text.split(/(?<=[.!?])\s+/u).filter(Boolean);
  const first = sentences[0] ?? '';

  if (!text.trim()) {
    issues.push({ code: 'empty', message: 'Атомът няма текст.' });
    return issues;
  }

  if (ANAPHORA.test(first.trim())) {
    issues.push({
      code: 'anaphora',
      message: 'Първото изречение започва с препратка към предходен контекст — извън страницата не се разбира.',
    });
  }

  const words = text.trim().split(/\s+/u).length;
  if (words < LENGTH.min) {
    issues.push({ code: 'too_short', message: `${words} думи — под ${LENGTH.min}, недостатъчно за самостоятелен отговор.` });
  } else if (words > LENGTH.max) {
    issues.push({ code: 'too_long', message: `${words} думи — над ${LENGTH.max}, моделът ще цитира само част.` });
  }

  if (!atom.fact_value) {
    issues.push({ code: 'no_fact', message: 'Липсва първично число — без него твърдението е преразказ.' });
  } else if (!fingerprintInPassage(atom.fingerprint, text)) {
    issues.push({ code: 'fact_missing_from_text', message: 'Числото от отпечатъка не се среща в текста на атома.' });
  }

  if (!atom.fact_date) {
    issues.push({ code: 'no_date', message: 'Липсва дата — недатирано число не е проверимо.' });
  }

  // Самосъгласуваност: не публикуваме това, което сами продаваме като риск.
  const risk = classifyClaim(text);
  if (risk && (risk.severity === 'critical' || risk.severity === 'high')) {
    issues.push({
      code: 'risky_claim',
      message: `Атомът съдържа ${risk.risk_class} („${risk.evidence}“). Собственият ни радар би го маркирал.`,
    });
  }

  return issues;
}

export function isPublishable(atom) {
  return validateAtom(atom).length === 0;
}

/**
 * Сглобява отговор, когато не е подаден готов текст.
 * Първото изречение именува марката и домейна — никаква анафора.
 */
function composeAnswer({ brand, domain, questionText, factValue, factUnit, factDate, sourceLabel }) {
  const who = brand ? `${brand} (${normalizeDomain(domain)})` : normalizeDomain(domain);
  const unit = factUnit ? ` ${factUnit}` : '';
  const source = sourceLabel
    ? ` Стойността произхожда от ${sourceLabel}.`
    : ' Стойността се поддържа от самия доставчик на данните.';

  return (
    `${who} декларира ${factValue}${unit} към ${factDate}. ` +
    `Стойността отговаря на въпроса „${cleanQuestion(questionText)}“ и важи за посочената дата. ` +
    `Данните се обновяват при всяка промяна и се публикуват на този адрес.${source}`
  );
}

/** Маха въпросителната, но пази изречението четимо — без снишаване до долен регистър. */
function cleanQuestion(text) {
  return String(text ?? '')
    .replace(/\?+\s*$/u, '')
    .trim();
}

export function atomId(domain, seed) {
  const base = `${normalizeDomain(domain)}:${seed ?? ''}`;
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = (hash * 31 + base.charCodeAt(i)) >>> 0;
  }
  return `atom-${hash.toString(36)}`;
}

export function normalizeDomain(domain) {
  return String(domain ?? '')
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0];
}
