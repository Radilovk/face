/**
 * Граници на дума за кирилица.
 *
 * В JavaScript `\b` и `\w` са ASCII-only дори с флага `u`: `/^(това)\b/iu`
 * не съвпада с „това е…“, защото „а“ не е ASCII буква и граница не се образува.
 * Всеки шаблон в проекта, който гледа български текст, минава оттук.
 */

/** Буква, цифра или долна черта — Unicode-осъзнато. */
export const WORD_CHAR = '[\\p{L}\\p{N}_]';

/** Начало на дума: отляво няма буква/цифра. */
export const WORD_START = `(?<!${WORD_CHAR})`;

/** Край на дума: отдясно няма буква/цифра. */
export const WORD_END = `(?!${WORD_CHAR})`;

/**
 * Построява регулярен израз с Unicode-осъзнати граници около целия шаблон.
 * @param {string} source — тяло на шаблона (низ, не RegExp)
 * @param {string} [flags='iu']
 */
export function wordRegex(source, flags = 'iu') {
  return new RegExp(`${WORD_START}(?:${source})${WORD_END}`, flags);
}

/**
 * Като wordRegex, но закотвен в началото на низа — за проверки от вида
 * „изречението започва с…“.
 */
export function startsWithWord(source, flags = 'iu') {
  return new RegExp(`^(?:${source})${WORD_END}`, flags);
}
