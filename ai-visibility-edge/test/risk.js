import assert from 'node:assert/strict';
import {
  classifyClaim,
  scanAnswerForBrandRisk,
  brandTermsFor,
  splitSentences,
  worstSeverity,
} from '../src/risk/claimRisk.js';
import { scanBrandRisk, buildRate, groupByRiskClass, MIN_RUNS_PER_QUESTION } from '../src/risk/scan.js';
import { buildHeadline } from '../src/risk/report.js';
import { createTestDb } from './d1-harness.js';

export function testClassifyClaimHealth() {
  const health = classifyClaim('Продуктът лекува възпаления на ставите.');
  assert.equal(health?.risk_class, 'health_claim');
  assert.equal(health.severity, 'critical');

  const advice = classifyClaim('Приемайте по 2 таблетки дневно преди хранене.');
  assert.equal(advice?.risk_class, 'medical_advice');

  const safety = classifyClaim('Напълно безопасен е и няма странични ефекти.');
  assert.equal(safety?.risk_class, 'safety');

  const price = classifyClaim('Цената е 39.90 лв. за опаковка.');
  assert.equal(price?.risk_class, 'price');

  const neutral = classifyClaim('Магазинът предлага разнообразие от продукти.');
  assert.equal(neutral, null, 'неутрално изречение не е находка');
}

export function testClassifyClaimNegation() {
  const negated = classifyClaim('Добавката не лекува заболявания и не заменя лечение.');
  assert.equal(negated, null, 'отрицанието не е твърдение');

  const positive = classifyClaim('Добавката лекува заболявания на черния дроб.');
  assert.equal(positive?.risk_class, 'health_claim');
}

export function testBrandTerms() {
  const terms = brandTermsFor('www.biocode-bg.com', null);
  assert(terms.includes('biocode-bg.com'));
  assert(terms.includes('biocode-bg'));
  assert(terms.includes('biocode bg'));

  const withName = brandTermsFor('daotslabna.com', 'Да отслабна');
  assert(withName.includes('да отслабна'));
}

export function testScanAnswerBrandProximity() {
  const answer =
    'В България има няколко магазина за добавки. BIOCODE biocode-bg.com предлага протеини. ' +
    'Продуктите им лекуват възпаления и премахват болки в ставите. ' +
    'Друг магазин предлага витамини на добра цена.';

  const findings = scanAnswerForBrandRisk(answer, brandTermsFor('biocode-bg.com', 'BIOCODE'));
  assert.equal(findings.length, 1, 'намира твърдението в изречението СЛЕД марката');
  assert.equal(findings[0].risk_class, 'health_claim');
  assert(findings[0].sentence.includes('лекуват'));
  assert.equal(worstSeverity(findings), 'critical');
}

export function testScanIgnoresUnrelatedBrands() {
  const answer = 'Друга марка лекува възпаления. Нашата марка не се споменава тук.';
  const findings = scanAnswerForBrandRisk(answer, brandTermsFor('biocode-bg.com', 'BIOCODE'));
  assert.equal(findings.length, 0, 'твърдение без марката не е находка');
}

export function testSplitSentences() {
  const parts = splitSentences('Първо изречение. Второ!\n- трета точка\nЧетвърто?');
  assert(parts.length >= 4, `очаквани поне 4 части, получени ${parts.length}`);
}

export function testRateInsufficientPower() {
  const rate = buildRate({
    totalRuns: 20,
    riskyRuns: 11,
    questionCount: 20,
    byModel: new Map([['openai', { total: 20, risky: 11 }]]),
  });

  assert.equal(rate.runs_per_question, 1);
  assert.equal(rate.sufficient_power, false, 'едно изпълнение на въпрос не дава коефициент');
  assert(rate.hint.includes(String(MIN_RUNS_PER_QUESTION)));
}

export function testRateSufficientPower() {
  const rate = buildRate({
    totalRuns: 60,
    riskyRuns: 35,
    questionCount: 20,
    byModel: new Map([
      ['openai', { total: 30, risky: 20 }],
      ['gemini', { total: 30, risky: 15 }],
    ]),
  });

  assert.equal(rate.sufficient_power, true);
  assert.equal(rate.runs_per_question, 3);
  assert(Math.abs(rate.hallucination_rate - 35 / 60) < 1e-9);
  assert.equal(rate.by_model[0].model, 'openai', 'по-високият дял е пръв');
}

export function testHeadlineCoinFlipOnlyWithPower() {
  const weak = buildHeadline({
    findings: [{ severity: 'critical' }],
    scanned_runs: 20,
    window_days: 30,
    rate: buildRate({
      totalRuns: 20,
      riskyRuns: 11,
      questionCount: 20,
      byModel: new Map(),
    }),
  });
  assert.equal(weak.level, 'warning');
  assert(!/%/.test(weak.title), 'без достатъчна извадка не показваме процент в заглавието');

  const strong = buildHeadline({
    findings: [{ severity: 'critical' }],
    scanned_runs: 60,
    window_days: 30,
    rate: buildRate({
      totalRuns: 60,
      riskyRuns: 30,
      questionCount: 20,
      byModel: new Map(),
    }),
  });
  assert.equal(strong.level, 'critical');
  assert(strong.title.includes('50%'));
  assert(strong.detail.includes('50%'), 'казва и какъв е шансът за чист отговор');
}

function seedRiskFixture(db, { domain = 'biocode-bg.com', brand = 'BIOCODE', suffix = '' } = {}) {
  const verticalId = `risk-vertical${suffix}`;
  db.exec(`INSERT INTO verticals (id, name) VALUES ('${verticalId}', 'Риск тест')`);
  db.exec(`INSERT INTO questions (id, vertical_id, text, qtype)
           VALUES ('rq1${suffix}', '${verticalId}', 'Помага ли ${brand} при болки?', 'informational')`);

  const risky = `${brand} ${domain} е онлайн магазин. Продуктите им лекуват възпаления на ставите.`;
  const clean = `${brand} ${domain} предлага протеини и витамини с доставка в България.`;

  const rows = [
    [`r1${suffix}`, 'openai', '2026-09-10T08:00:00Z', 1, risky],
    [`r2${suffix}`, 'openai', '2026-09-11T08:00:00Z', 2, clean],
    [`r3${suffix}`, 'openai', '2026-09-12T08:00:00Z', 3, risky],
    [`r4${suffix}`, 'gemini', '2026-09-12T09:00:00Z', 1, clean],
  ];

  for (const [id, model, runAt, rep, answer] of rows) {
    db.prepare(
      `INSERT INTO runs (id, question_id, model, run_at, repetition, raw_response, answer_text)
       VALUES (?, 'rq1${suffix}', ?, ?, ?, '{}', ?)`,
    )
      .bind(id, model, runAt, rep, answer)
      .run();
  }

  return { verticalId, domain, brand };
}

export async function testScanBrandRiskPersistsAndRates() {
  const db = createTestDb();
  const { verticalId } = seedRiskFixture(db);

  const scan = await scanBrandRisk(db, {
    domain: 'biocode-bg.com',
    brandName: 'BIOCODE',
    verticalId,
    days: 3650,
  });

  assert.equal(scan.scanned_runs, 4);
  assert.equal(scan.findings_count, 2, 'две от четирите изпълнения съдържат твърдението');
  assert.equal(scan.rate.runs_with_risk, 2);
  assert.equal(scan.rate.hallucination_rate, 0.5);

  const openai = scan.rate.by_model.find((m) => m.model === 'openai');
  assert.equal(openai.runs, 3);
  assert.equal(openai.runs_with_risk, 2);

  const gemini = scan.rate.by_model.find((m) => m.model === 'gemini');
  assert.equal(gemini.runs_with_risk, 0, 'чистият модел не се обвинява');

  const stored = db.prepare(`SELECT COUNT(*) AS n FROM brand_risk_findings`).first();
  assert.equal(stored.n, 2, 'находките са записани');
}

export async function testScanBrandRiskIdempotent() {
  const db = createTestDb();
  const { verticalId } = seedRiskFixture(db);

  await scanBrandRisk(db, { domain: 'biocode-bg.com', brandName: 'BIOCODE', verticalId, days: 3650 });
  await scanBrandRisk(db, { domain: 'biocode-bg.com', brandName: 'BIOCODE', verticalId, days: 3650 });

  const stored = db.prepare(`SELECT COUNT(*) AS n FROM brand_risk_findings`).first();
  assert.equal(stored.n, 2, 'повторното сканиране не дублира находки');
}

export async function testScanForeignBrandNeedsNothingFromIt() {
  const db = createTestDb();
  // Марка, която НЕ е в системата — нито tenant, нито watched_domain.
  const { verticalId, domain, brand } = seedRiskFixture(db, {
    domain: 'vitaform-bg.com',
    brand: 'VitaForm',
  });

  const known = db
    .prepare(`SELECT COUNT(*) AS n FROM tenants WHERE apex_host = ?`)
    .bind(domain)
    .first();
  assert.equal(known.n, 0, 'марката не е регистрирана в системата');

  const watched = db
    .prepare(`SELECT COUNT(*) AS n FROM watched_domains WHERE domain = ?`)
    .bind(domain)
    .first();
  assert.equal(watched.n, 0, 'марката не е и наблюдаван домейн');

  const scan = await scanBrandRisk(db, {
    domain,
    brandName: brand,
    verticalId,
    days: 3650,
    persist: false,
  });

  assert.equal(scan.findings_count, 2, 'скенерът работи без нищо от марката');
  const groups = groupByRiskClass(scan.findings);
  assert.equal(groups[0].risk_class, 'health_claim');
  assert.equal(groups[0].severity, 'critical');
}
