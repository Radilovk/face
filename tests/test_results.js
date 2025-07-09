const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');

const virtualConsole = new VirtualConsole();
virtualConsole.sendTo(console);

const example = {
  summary: { overall_skin_health_score: 8, perceived_age: '25', key_findings: ['Пример'] },
  anti_aging: { wrinkle_score: 7, volume_loss_score: 5 },
  health_indicators: { hydration_level_score: 6 },
  advice: { HIGH_INFLAMMATION: 'Възпаление: Намалете стреса' }
};

const script = fs.readFileSync(path.resolve(__dirname, '../js/results.js'), 'utf-8');
const html = `<!DOCTYPE html><html><body>
<div id="overall-score-value"></div>
<div id="score-gauge"></div>
<span id="perceived-age"></span>
<span id="key-findings"></span>
<canvas id="metricsRadarChart"></canvas>
<div id="advice-container"></div>
<script>${script}</script>
</body></html>`;

(async () => {
  process.on('unhandledRejection', (err) => {
    console.error('Unhandled', err.stack || err);
  });
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    url: 'https://example.com/test.html',
    virtualConsole,
    beforeParse(window) {
      window.sessionStorage.setItem('analysisResult', JSON.stringify(example));
      window.Chart = function() { return { destroy() {} }; };
      window.HTMLCanvasElement.prototype.getContext = () => ({})
    }
  });

  await new Promise(resolve => {
    if (dom.window.document.readyState === 'complete') return resolve();
    dom.window.addEventListener('DOMContentLoaded', () => setTimeout(resolve, 100));
  });

  const score = dom.window.document.getElementById('overall-score-value').textContent;
  const age = dom.window.document.getElementById('perceived-age').textContent;
  console.log('Score:', score);
  console.log('Age:', age);
})();
