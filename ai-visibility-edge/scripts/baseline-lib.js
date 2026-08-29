/**
 * Shared baseline path/id helpers (audit C1 — versioned weekly snapshots).
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** Canonical questions + gate template (Block 0.1 seed). */
export const CANONICAL_BASELINE_ID = '2026-08-27';

export function resolveBaselineId() {
  return process.env.BASELINE_ID || new Date().toISOString().slice(0, 10);
}

export function baselineDir(root, baselineId = resolveBaselineId()) {
  return join(root, 'baseline', baselineId);
}

/**
 * Ensure baseline/{id}/ exists with questions.json (+ manifest stub if missing).
 * Copies from canonical baseline when starting a new weekly snapshot.
 */
export function ensureBaselineDir(root, baselineId = resolveBaselineId()) {
  const dir = baselineDir(root, baselineId);
  mkdirSync(dir, { recursive: true });

  const canonical = baselineDir(root, CANONICAL_BASELINE_ID);
  const questionsPath = join(dir, 'questions.json');
  if (!existsSync(questionsPath)) {
    const src = join(canonical, 'questions.json');
    if (!existsSync(src)) {
      throw new Error(`Missing canonical questions at ${src}`);
    }
    copyFileSync(src, questionsPath);
  }

  const manifestPath = join(dir, 'manifest.json');
  if (!existsSync(manifestPath)) {
    const template = existsSync(join(canonical, 'manifest.json'))
      ? JSON.parse(readFileSync(join(canonical, 'manifest.json'), 'utf8'))
      : {};
    const manifest = {
      ...template,
      baseline_id: baselineId,
      created_at: new Date().toISOString(),
      status: 'collecting',
      models_collected: [],
      block_0_1: 'open',
    };
    delete manifest.closed_at;
    delete manifest.fixture_seeded;
    delete manifest.fixture_seeded_at;
    delete manifest.gate_report;
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  }

  return dir;
}

/** D1 run id — unique per baseline snapshot (no weekly overwrite). */
export function baselineRunId(baselineId, model, questionId) {
  return `baseline-${baselineId}-${model}-${questionId}`;
}
