import assert from 'node:assert/strict';
import {
  buildManualGuide,
  guideToInstructionLines,
  formatGuideForExport,
} from '../src/diagnose/manualGuides.js';

export function testManualGuideCnameHasWhereHowWhat() {
  const guide = buildManualGuide('cname', {
    domain: 'shop.bg',
    workerHost: 'worker.example.dev',
  });
  assert(guide.where.includes('DNS'));
  assert(guide.steps.length >= 5);
  assert(guide.fields.some((f) => f.label.includes('Type') && f.value === 'CNAME'));
  assert(guide.fields.some((f) => f.value === 'shop.bg'));
  assert(guide.fields.some((f) => f.value === 'worker.example.dev'));
  const lines = guideToInstructionLines(guide);
  assert(lines.some((l) => l.includes('Къде:')));
  const exportText = formatGuideForExport(guide);
  assert(exportText.includes('КЪДЕ:'));
  assert(exportText.includes('КАКВО ДА ВЪВЕДЕТЕ'));
}

export function testManualGuideCmsPublish() {
  const guide = buildManualGuide('cms_publish', {
    domain: 'shop.bg',
    brand: 'ShopBG',
    artifactType: 'homepage',
  });
  assert(guide.where.includes('CMS') || guide.where.includes('WordPress'));
  assert(guide.steps.some((s) => s.includes('Publish') || s.includes('publish')));
  assert(formatGuideForExport(guide).includes('shop.bg'));
}
