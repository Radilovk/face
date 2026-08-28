import assert from 'node:assert/strict';
import { generateQuestionDrafts } from '../src/api/questions.js';
import { stepStatus } from '../src/ui/workflow.js';

export function testGenerateQuestions() {
  const drafts = generateQuestionDrafts({
    domain: 'example.com',
    brand: 'Example',
    verticalLabel: 'спортни добавки',
  });
  assert(drafts.length >= 5);
  assert(drafts.some((d) => d.source === 'auto'));
  assert(drafts.some((d) => d.text.includes('example.com')));
}

export function testStepStatus() {
  assert.equal(stepStatus('register', { tenant: true }), 'done');
  assert.equal(stepStatus('audit', { tenant: true, probe: {} }), 'done');
  assert.equal(stepStatus('questions', { tenant: true, questionCount: 5 }), 'done');
}
