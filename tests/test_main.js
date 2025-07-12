const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const virtualConsole = new VirtualConsole();
virtualConsole.sendTo(console);

const scriptPath = path.resolve(__dirname, '../js/main.js');
const original = fs.readFileSync(scriptPath, 'utf-8');
const exported = original.replace(/\}\);\s*$/, "window.__TEST__ = { validateForm, saveFormData, loadFormData, analysisData };\n});");

const html = `<!DOCTYPE html><html><body>
<form id="questionnaire">
  <input type="date" id="birthdate" name="birthdate">
  <select id="phototype" name="phototype">
    <option value="I">I</option>
    <option value="II">II</option>
  </select>
</form>
<div id="upload-box"></div>
<input type="file" id="file-upload">
<img id="image-preview">
<div id="upload-prompt"></div>
<p id="file-name"></p>
<button id="analyze-btn"></button>
<div id="loader-overlay"></div>
<script>${exported}</script>
</body></html>`;

(async () => {
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    virtualConsole,
    url: 'https://example.com/'
  });

  await new Promise(resolve => {
    if (dom.window.document.readyState === 'complete') return resolve();
    dom.window.addEventListener('DOMContentLoaded', () => setTimeout(resolve, 50));
  });

  const { validateForm, saveFormData, analysisData } = dom.window.__TEST__;
  const birthInput = dom.window.document.getElementById('birthdate');

  // 1. Missing birthdate and image
  analysisData.image = null;
  birthInput.value = '';
  assert.strictEqual(validateForm(), false, 'Invalid when no birthdate');

  // 2. Future date
  const future = new Date();
  future.setDate(future.getDate() + 1);
  birthInput.value = future.toISOString().split('T')[0];
  assert.strictEqual(validateForm(), false, 'Invalid with future date');

  // 3. Underage
  const young = new Date();
  young.setFullYear(young.getFullYear() - 10);
  birthInput.value = young.toISOString().split('T')[0];
  assert.strictEqual(validateForm(), false, 'Invalid when under 18');

  // 4. Valid date & image
  const valid = new Date();
  valid.setFullYear(valid.getFullYear() - 25);
  birthInput.value = valid.toISOString().split('T')[0];
  analysisData.image = 'data:image/png;base64,AAA';
  assert.strictEqual(validateForm(), true, 'Valid with proper data');

  // LocalStorage persistence
  const select = dom.window.document.getElementById('phototype');
  select.value = 'II';
  select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  birthInput.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

  const stored = JSON.parse(dom.window.localStorage.getItem('savedFormData'));
  assert.deepStrictEqual(stored, { birthdate: birthInput.value, phototype: 'II' });

  console.log('main.js tests passed.');
})();
