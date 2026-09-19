import { WORD_CHAR, WORD_START, wordRegex } from '../lang/boundaries.js';
/**
 * Радар за информационни аномалии — класифицира твърдения, които модел
 * приписва на марка, по клас риск (Блок 3 разширение).
 *
 * Не се произнася по правни последици. Записва факт: какво е казал моделът,
 * в кое изречение, кога. Изводът е на клиента и на неговия юрист.
 */

export const RISK_VERSION = 'risk-2026-09';

/** Тежест по клас — ред на показване в папката. */
export const RISK_CLASSES = {
  medical_advice: { severity: 'critical', label: 'Медицинско указание' },
  health_claim: { severity: 'critical', label: 'Здравно твърдение' },
  safety: { severity: 'high', label: 'Твърдение за безопасност' },
  price: { severity: 'medium', label: 'Твърдение за цена' },
  availability: { severity: 'medium', label: 'Твърдение за наличност' },
  competence: { severity: 'low', label: 'Твърдение за компетентност' },
};

/**
 * Внимание: в JavaScript `\b` и `\w` са ASCII-only дори с флага `u` —
 * не работят за кирилица. Затова: W = буква/цифра, а границите са lookaround.
 */
const W = WORD_CHAR;
const START = WORD_START;

function rx(source) {
  return wordRegex(source);
}

const PATTERNS = [
  {
    risk_class: 'medical_advice',
    re: rx(
      `приемайте|прием[аъ]т|дозировк${W}*|доза${W}*|курс[ъа]?т?\\s+(?:е|от|продължава)|противопоказ${W}+|` +
        `не\\s+комбинирайте|комбинирайте\\s+с|мг\\s+дневно|таблетки\\s+дневно|dosage|take\\s+\\d+\\s*(?:mg|capsules|tablets)`,
    ),
  },
  {
    risk_class: 'health_claim',
    re: rx(
      `лекув${W}*|излекув${W}+|изцел${W}+|терапевтич${W}+|лечебн${W}+|третира\\s+(?:заболя${W}+|състояни${W}+)|` +
        `помага\\s+(?:при|срещу|за\\s+лечение)|облекчава\\s+${W}+|премахва\\s+(?:болк${W}+|възпал${W}+)|` +
        `предотвратява\\s+${W}+|профилактик${W}+\\s+(?:на|срещу)|понижава\\s+(?:кръвн${W}+|холестерол${W}*|захар${W}*)|` +
        `нормализира\\s+${W}+|възстановява\\s+(?:черния\\s+дроб|ставит${W}+|хрущял${W}+)|изгаря\\s+мазнин${W}+|` +
        `детоксикир${W}+|(?:укрепва|повишава)\\s+имунитет${W}*|антиканцероген${W}+|против\\s+рак${W}*|` +
        `cures?|treats?\\s+${W}+|heals?|prevents?\\s+(?:cancer|disease|illness)|anti-?inflammatory\\s+treatment`,
    ),
  },
  {
    risk_class: 'safety',
    re: rx(
      `напълно\\s+безопас${W}+|без\\s+(?:никакви\\s+)?странични\\s+ефект${W}+|безвред${W}+|` +
        `може\\s+да\\s+се\\s+приема\\s+от\\s+(?:бремен${W}+|кърмещ${W}+|деца)|одобрен${W}+\\s+от\\s+(?:БАБХ|ИАЛ|EFSA|FDA)|` +
        `клинично\\s+доказан${W}+|сертифициран${W}+\\s+като\\s+лекарств${W}+|no\\s+side\\s+effects|clinically\\s+proven|FDA[\\s-]approved`,
    ),
  },
  {
    risk_class: 'price',
    re: new RegExp(
      `(?:цена${W}*\\s+(?:е|от|започва)|струва|на\\s+цена|price\\s+is|costs?\\s+)\\s*[^.!?]{0,40}?\\d[\\d\\s.,]*\\s*(?:лв\\.?|BGN|€|EUR|\\$|USD)`,
      'iu',
    ),
  },
  {
    risk_class: 'availability',
    re: rx(
      `в\\s+наличност|изчерпан${W}+|достав${W}+\\s+(?:за|до|в)\\s+\\d+\\s*(?:дни|часа|работни)|` +
        `безплатна\\s+доставка|in\\s+stock|out\\s+of\\s+stock|free\\s+shipping`,
    ),
  },
  {
    risk_class: 'competence',
    re: rx(
      `най-(?:голям|добър|евтин|надежден|силен)${W}*|водещ${W}+\\s+(?:марка|производител|магазин)|` +
        `№\\s*1|номер\\s+едно|единствен${W}+\\s+в\\s+България|лидер\\s+(?:на\\s+пазара|в)|the\\s+(?:best|leading|largest)`,
    ),
  },
];

/** Отрицание непосредствено преди твърдението — „не лекува" не е твърдение. */
const NEGATION = new RegExp(
  `${START}(?:не|няма\\s+да|не\\s+е\\s+доказано\\s+че|липсват\\s+доказателства|not|does\\s+not|no\\s+evidence)\\s*$`,
  'iu',
);

/**
 * Класифицира едно изречение.
 * @returns {{risk_class: string, severity: string, evidence: string}|null}
 */
export function classifyClaim(sentence) {
  if (!sentence || sentence.length < 8) return null;

  for (const { risk_class, re } of PATTERNS) {
    const match = sentence.match(re);
    if (!match) continue;

    const before = sentence.slice(Math.max(0, match.index - 24), match.index);
    if (NEGATION.test(before.trimEnd())) continue;

    return {
      risk_class,
      severity: RISK_CLASSES[risk_class].severity,
      evidence: match[0].trim(),
    };
  }

  return null;
}

/** Разделя отговор на изречения — точка, удивителна, въпросителна, нов ред, водач на списък. */
export function splitSentences(text) {
  if (!text) return [];
  return String(text)
    .split(/(?<=[.!?])\s+|\n+|(?:^|\s)[-•*]\s+/u)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Термини, по които разпознаваме марката в свободен текст.
 * Домейнът дава и голото име: biocode-bg.com → biocode
 */
export function brandTermsFor(domain, brandName) {
  const host = String(domain ?? '')
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0];

  const terms = new Set();
  if (host) {
    terms.add(host);
    const bare = host.split('.')[0];
    if (bare.length >= 4) {
      terms.add(bare);
      if (bare.includes('-')) terms.add(bare.replace(/-/g, ' '));
    }
  }
  if (brandName && brandName.length >= 3) terms.add(String(brandName).toLowerCase());

  return [...terms];
}

function mentionsBrand(sentence, brandTerms) {
  const lower = sentence.toLowerCase();
  return brandTerms.some((t) => t && lower.includes(t));
}

/**
 * Скенира отговор на модел за рискови твърдения, приписани на марката.
 * Търси в изречението с марката и в непосредствено следващото — моделите
 * често именуват марката, после изброяват свойствата ѝ.
 *
 * @param {string} answerText
 * @param {string[]} brandTerms
 * @returns {Array<{risk_class, severity, evidence, sentence, sentence_index}>}
 */
export function scanAnswerForBrandRisk(answerText, brandTerms) {
  const sentences = splitSentences(answerText);
  const findings = [];
  const seen = new Set();

  for (let i = 0; i < sentences.length; i++) {
    if (!mentionsBrand(sentences[i], brandTerms)) continue;

    for (const idx of [i, i + 1]) {
      const sentence = sentences[idx];
      if (!sentence || seen.has(idx)) continue;

      const claim = classifyClaim(sentence);
      if (!claim) continue;

      seen.add(idx);
      findings.push({
        ...claim,
        sentence,
        sentence_index: idx,
        brand_mention_index: i,
      });
    }
  }

  return findings;
}

/** Най-тежкият клас в списък находки — за етикет на ниво отговор. */
export function worstSeverity(findings) {
  const order = { critical: 3, high: 2, medium: 1, low: 0 };
  let worst = null;
  for (const f of findings ?? []) {
    if (!worst || order[f.severity] > order[worst]) worst = f.severity;
  }
  return worst;
}
