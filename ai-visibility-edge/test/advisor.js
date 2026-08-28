import assert from 'node:assert/strict';
import { parseAdvisorActions } from '../src/advisor/geminiClient.js';

export function testParseAdvisorActions() {
  const text = `Ето какво да направите първо.

\`\`\`actions
[{"action":"run_analysis","label":"Пусни анализ","reason":"test"}]
\`\`\``;

  const { reply, actions } = parseAdvisorActions(text);
  assert(reply.includes('Ето какво'));
  assert(!reply.includes('actions'));
  assert.equal(actions.length, 1);
  assert.equal(actions[0].action, 'run_analysis');
}

export function testParseAdvisorIgnoresInvalidActions() {
  const text = 'OK\n```actions\n[{"action":"hack_site","label":"bad"}]\n```';
  const { actions } = parseAdvisorActions(text);
  assert.equal(actions.length, 0);
}
