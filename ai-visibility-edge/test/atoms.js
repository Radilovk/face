import assert from 'node:assert/strict';
import {
  buildAtom,
  validateAtom,
  buildFingerprint,
  fingerprintInPassage,
  atomId,
} from '../src/atoms/generate.js';
import {
  saveAtom,
  publishAtom,
  listAtoms,
  checkUniqueness,
  generateAtomsForDomain,
} from '../src/atoms/store.js';
import { attributeObservation, matchPassageToAtom, atomPerformance } from '../src/atoms/attribute.js';
import { atomJson, atomMarkdown, representationFor, buildAtomIndexLines } from '../src/atoms/serve.js';
import { createTestDb } from './d1-harness.js';

const FACT = { value: '94', unit: '%', date: '2026-09-12', label: 'лабораторен протокол №4417' };

function sampleAtom(overrides = {}) {
  return buildAtom({
    domain: 'vitaform-bg.com',
    brand: 'VitaForm',
    questionId: 'q-purity',
    questionText: 'Каква е чистотата на колагена на VitaForm?',
    fact: FACT,
    sourceLabel: FACT.label,
    ...overrides,
  });
}

/** Реалният път: въпрос → run → наблюдение. atom_citations сочи към истински редове. */
function seedObservation(db, { id, runId, model = 'openai', domain, passage, questionId = 'q-seed' }) {
  const hasQuestion = db.prepare(`SELECT 1 AS x FROM questions WHERE id = ?`).bind(questionId).first();
  if (!hasQuestion) {
    const hasVertical = db.prepare(`SELECT 1 AS x FROM verticals WHERE id = 'v-atoms'`).first();
    if (!hasVertical) db.exec(`INSERT INTO verticals (id, name) VALUES ('v-atoms', 'Атоми тест')`);
    db.prepare(`INSERT INTO questions (id, vertical_id, text, qtype) VALUES (?, 'v-atoms', 'тест', 'informational')`)
      .bind(questionId)
      .run();
  }

  const hasRun = db.prepare(`SELECT 1 AS x FROM runs WHERE id = ?`).bind(runId).first();
  if (!hasRun) {
    db.prepare(
      `INSERT INTO runs (id, question_id, model, run_at, repetition, raw_response, answer_text)
       VALUES (?, ?, ?, ?, 1, '{}', '')`,
    )
      .bind(runId, questionId, model, new Date().toISOString())
      .run();
  }

  db.prepare(
    `INSERT INTO observations (id, run_id, domain, url, class, cited_passage, verified_at)
     VALUES (?, ?, ?, ?, 'GROUNDED_VERIFIED', ?, ?)`,
  )
    .bind(id, runId, domain, `https://${domain}/x`, passage, new Date().toISOString())
    .run();

  return { id, run_id: runId, model, domain, cited_passage: passage };
}

export function testBuildAtomShape() {
  const atom = sampleAtom();
  assert.equal(atom.domain, 'vitaform-bg.com');
  assert.equal(atom.fact_value, '94');
  assert.equal(atom.fingerprint, '94|%|2026-09-12');
  assert.equal(atom.status, 'draft');
  assert(atom.answer_text.includes('94'), 'числото е в текста');
  assert(atom.answer_text.includes('2026-09-12'), 'датата е в текста');
}

export function testValidateAtomPasses() {
  assert.deepEqual(validateAtom(sampleAtom()), [], 'генерираният атом минава линтера');
}

export function testLinterCatchesAnaphora() {
  const atom = sampleAtom({ body: 'Това е продукт с чистота 94 % към 2026-09-12, потвърдена в лаборатория при независима проверка на партидата.' });
  const codes = validateAtom(atom).map((i) => i.code);
  assert(codes.includes('anaphora'), 'първото изречение започва с препратка');
}

export function testLinterCatchesMissingFact() {
  const atom = sampleAtom({ body: 'VitaForm (vitaform-bg.com) поддържа високо качество на суровините и работи с проверени доставчици в Европейския съюз от години.' });
  const codes = validateAtom(atom).map((i) => i.code);
  assert(codes.includes('fact_missing_from_text'), 'числото липсва в текста');
}

export function testLinterRefusesOwnRiskyClaim() {
  const atom = sampleAtom({
    body: 'VitaForm (vitaform-bg.com) декларира 94 % чистота към 2026-09-12. Продуктът лекува възпаления на ставите според производителя и премахва болките.',
  });
  const codes = validateAtom(atom).map((i) => i.code);
  assert(codes.includes('risky_claim'), 'не публикуваме това, което сами продаваме като риск');
}

export function testLinterLength() {
  const short = sampleAtom({ body: 'VitaForm: 94 % към 2026-09-12.' });
  assert(validateAtom(short).some((i) => i.code === 'too_short'));
}

export function testFingerprintSurvivesParaphrase() {
  const fp = buildFingerprint({ value: '94', unit: '%', date: '2026-09-12' });

  assert(fingerprintInPassage(fp, 'чистота от 94% по лабораторен протокол'), 'директно споменаване');
  assert(fingerprintInPassage(fp, 'продуктът е с 94 % чистота'), 'интервал преди единицата');
  assert(!fingerprintInPassage(fp, 'чистота от 91% по протокол'), 'друго число не съвпада');
  assert(!fingerprintInPassage(fp, 'високо качество без посочени числа'), 'без число няма съвпадение');
}

export function testFingerprintDecimalNormalisation() {
  const fp = buildFingerprint({ value: '39,90', unit: 'лв', date: '2026-09-01' });
  assert.equal(fp, '39.90|лв|2026-09-01');
  assert(fingerprintInPassage(fp, 'цената е 39.90 лв за опаковка'));
}

export function testRepresentationNegotiation() {
  const asJson = new Request('https://x.test/a/atom-1', { headers: { Accept: 'application/ld+json' } });
  const asMd = new Request('https://x.test/a/atom-1', { headers: { Accept: 'text/markdown' } });
  const asHtml = new Request('https://x.test/a/atom-1', { headers: { Accept: 'text/html' } });
  const noAccept = new Request('https://x.test/a/atom-1');

  assert.equal(representationFor(asJson), 'json');
  assert.equal(representationFor(asMd), 'markdown');
  assert.equal(representationFor(asHtml), 'html');
  assert.equal(representationFor(noAccept), 'html', 'без Accept — HTML, не предположение по UA');
}

export function testSerialisations() {
  const atom = sampleAtom();
  const ld = atomJson(atom, { base: 'https://vitaform-bg.com' });
  assert.equal(ld['@type'], 'QAPage');
  assert.equal(ld.mainEntity.acceptedAnswer.text, atom.answer_text);
  assert.equal(ld.dateModified, '2026-09-12');

  const md = atomMarkdown(atom);
  assert(md.includes('# Каква е чистотата'));
  assert(md.includes('94 %'));
}

export function testIndexLinesOnlyPublished() {
  const lines = buildAtomIndexLines(
    [
      { ...sampleAtom(), status: 'published' },
      { ...sampleAtom({ questionId: 'q2' }), status: 'draft' },
    ],
    'https://vitaform-bg.com',
  );
  assert.equal(lines.length, 1, 'черновите не се изброяват');
  assert(lines[0].includes('/a/'));
}

export function testAtomIdStable() {
  assert.equal(atomId('vitaform-bg.com', 'q1'), atomId('www.vitaform-bg.com', 'q1'), 'www не променя id');
  assert.notEqual(atomId('vitaform-bg.com', 'q1'), atomId('vitaform-bg.com', 'q2'));
}

export async function testPublishRequiresValidAtom() {
  const db = createTestDb();
  const bad = sampleAtom({ body: 'Това е кратко.' });
  await saveAtom(db, bad);

  const result = await publishAtom(db, bad.id);
  assert.equal(result.error, 'validation_failed');
  assert(result.issues.length > 0);

  const stored = await listAtoms(db, 'vitaform-bg.com');
  assert.equal(stored[0].status, 'draft', 'остава чернова');
}

export async function testPublishDetectsFingerprintCollision() {
  const db = createTestDb();

  const mine = sampleAtom();
  await saveAtom(db, mine);

  // Друг домейн вече ползва същия кортеж — отпечатъкът не е уникален.
  const theirs = buildAtom({
    domain: 'other-shop.com',
    brand: 'Other',
    questionId: 'q-purity',
    questionText: 'Каква е чистотата?',
    fact: FACT,
  });
  await saveAtom(db, { ...theirs, status: 'published' });

  const check = await checkUniqueness(db, mine);
  assert.equal(check.unique, false);
  assert.equal(check.uniqueness, 'collision');

  const result = await publishAtom(db, mine.id);
  assert.equal(result.error, 'fingerprint_not_unique', 'не публикуваме неуникален отпечатък');
}

export async function testPublishHappyPath() {
  const db = createTestDb();
  const atom = sampleAtom();
  await saveAtom(db, atom);

  const result = await publishAtom(db, atom.id);
  assert.equal(result.ok, true);
  assert.equal(result.status, 'published');

  const [stored] = await listAtoms(db, 'vitaform-bg.com', { status: 'published' });
  assert.equal(stored.id, atom.id);
  assert(stored.published_at);
}

export async function testAttributionMatchesOwnAtom() {
  const db = createTestDb();
  const atom = sampleAtom();
  await saveAtom(db, atom);
  await publishAtom(db, atom.id);

  const observation = seedObservation(db, {
    id: 'obs-1',
    runId: 'run-1',
    domain: 'vitaform-bg.com',
    passage: 'Производителят посочва 94% чистота, потвърдена лабораторно.',
  });
  const result = await attributeObservation(db, observation);

  assert.equal(result.matched, true);
  assert.equal(result.atom_id, atom.id);

  const stored = db.prepare(`SELECT COUNT(*) AS n FROM atom_citations`).first();
  assert.equal(stored.n, 1);
}

export async function testAttributionIgnoresCopiesOnOtherDomains() {
  const db = createTestDb();
  const atom = sampleAtom();
  await saveAtom(db, atom);
  await publishAtom(db, atom.id);

  // Същият текст, препубликуван от агрегатор — наблюдението сочи ЧУЖД домейн.
  const result = await attributeObservation(db, seedObservation(db, {
    id: 'obs-2',
    runId: 'run-2',
    model: 'gemini',
    domain: 'agregator.bg',
    passage: 'Производителят посочва 94% чистота, потвърдена лабораторно.',
  }));

  assert.equal(result.matched, false, 'копие на чужд домейн не е наше цитиране');
  const stored = db.prepare(`SELECT COUNT(*) AS n FROM atom_citations`).first();
  assert.equal(stored.n, 0);
}

export async function testAttributionSkipsDrafts() {
  const db = createTestDb();
  const atom = sampleAtom();
  await saveAtom(db, atom); // остава чернова

  const result = await attributeObservation(db, seedObservation(db, {
    id: 'obs-3',
    runId: 'run-3',
    domain: 'vitaform-bg.com',
    passage: 'Производителят посочва 94% чистота.',
  }));

  assert.equal(result.matched, false);
  assert.equal(result.reason, 'no_published_atoms', 'непроверен отпечатък не участва');
}

export async function testAttributionIsIdempotent() {
  const db = createTestDb();
  const atom = sampleAtom();
  await saveAtom(db, atom);
  await publishAtom(db, atom.id);

  const observation = seedObservation(db, {
    id: 'obs-4',
    runId: 'run-4',
    domain: 'vitaform-bg.com',
    passage: '94% чистота по протокол.',
  });
  await attributeObservation(db, observation);
  await attributeObservation(db, observation);

  const stored = db.prepare(`SELECT COUNT(*) AS n FROM atom_citations`).first();
  assert.equal(stored.n, 1, 'повторната обработка не дублира цитирането');
}

export async function testPerformanceSeparatesWorkingFromSilent() {
  const db = createTestDb();

  const working = sampleAtom();
  await saveAtom(db, working);
  await publishAtom(db, working.id);

  const silent = buildAtom({
    domain: 'vitaform-bg.com',
    brand: 'VitaForm',
    questionId: 'q-delivery',
    questionText: 'За колко дни доставя VitaForm?',
    fact: { value: '2', unit: 'работни дни', date: '2026-09-10' },
  });
  await saveAtom(db, silent);
  await publishAtom(db, silent.id);
  // състарен, за да излезе от прозореца „твърде рано"
  db.prepare(`UPDATE answer_atoms SET published_at = ? WHERE id = ?`)
    .bind('2026-01-01T00:00:00Z', silent.id)
    .run();

  await attributeObservation(db, seedObservation(db, {
    id: 'obs-5',
    runId: 'run-5',
    domain: 'vitaform-bg.com',
    passage: 'чистота 94% по лабораторен протокол',
  }));

  const perf = await atomPerformance(db, 'vitaform-bg.com', { days: 90 });
  assert.equal(perf.published_atoms, 2);
  assert.equal(perf.cited_atoms, 1);
  assert.equal(perf.citation_share, 0.5);

  const rows = Object.fromEntries(perf.atoms.map((a) => [a.atom_id, a.verdict]));
  assert.equal(rows[working.id], 'working');
  assert.equal(rows[silent.id], 'rewrite', 'мълчащ атом след прозореца е за пренаписване');
}

export async function testGenerateForAnyDomainWithoutTenant() {
  const db = createTestDb();

  const out = await generateAtomsForDomain(db, {
    domain: 'nyakoi-klient.bg',
    brand: 'Някой Клиент',
    facts: [
      { question_text: 'Каква е цената на абонамента?', value: '39.90', unit: 'лв', date: '2026-09-01' },
      { question_text: 'За колко дни доставяте?', value: '2', unit: 'работни дни', date: '2026-09-01' },
      { question_text: 'Липсва число', value: '', unit: null, date: '2026-09-01' },
    ],
  });

  assert.equal(out.drafted, 3);
  assert.equal(out.ready, 2, 'двата с числа минават линтера');
  assert.equal(out.needs_work, 1);
  assert(out.rejected[0].issues.some((i) => i.code === 'no_fact'));

  const stored = await listAtoms(db, 'nyakoi-klient.bg');
  assert.equal(stored.length, 3, 'универсално — домейнът не е регистриран tenant');
}

export function testMatchPassageToAtomDirect() {
  const atoms = [
    { id: 'a1', fingerprint: '94|%|2026-09-12' },
    { id: 'a2', fingerprint: '2|работнидни|2026-09-10' },
  ];
  assert.equal(matchPassageToAtom('доставка за 2 работни дни', atoms)?.atom.id, 'a2');
  assert.equal(matchPassageToAtom('няма числа тук', atoms), null);
}
