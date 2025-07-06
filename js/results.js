document.addEventListener('DOMContentLoaded', () => {
    const resultsContainer = document.getElementById('results-container');
    const resultString = sessionStorage.getItem('analysisResult');
    const userImage = sessionStorage.getItem('userImage');

    if (!resultString || !userImage) {
        resultsContainer.innerHTML = '<h1>Грешка: Не са намерени резултати. Моля, започнете отначало.</h1><a href="index.html">Начална страница</a>';
        return;
    }

    const data = JSON.parse(resultString);
    renderResults(data, userImage);

    function renderResults(data, userImage) {
        // Clear loading spinner
        resultsContainer.innerHTML = '';

        // Header
        const header = document.createElement('header');
        header.className = 'results-header';
        header.innerHTML = `
            <img src="${userImage}" alt="User Photo">
            <div class="summary-text">
                <h1>Вашият персонален анализ</h1>
                <p>Възприемана възраст: <strong>${data.summary.perceived_age}</strong></p>
                <ul class="key-findings">
                    ${data.summary.key_findings.map(finding => `<li>${finding}</li>`).join('')}
                </ul>
            </div>
        `;
        resultsContainer.appendChild(header);

        // Grid
        const grid = document.createElement('div');
        grid.className = 'results-grid';

        // Chart Card
        const chartCard = createCard('Общо състояние');
        const chartContainer = document.createElement('div');
        chartContainer.className = 'chart-container';
        const canvas = document.createElement('canvas');
        chartContainer.appendChild(canvas);
        chartCard.appendChild(chartContainer);
        new Chart(canvas, createChartConfig(data));
        grid.appendChild(chartCard);

        // Advice Card
        if (data.advice && Object.keys(data.advice).length > 0) {
            const adviceCard = document.createElement('div');
            adviceCard.className = 'advice-card';
            let adviceHTML = '<h3>Топ препоръки за Вас</h3><ul>';
            for (const key in data.advice) {
                adviceHTML += `<li>${data.advice[key]}</li>`;
            }
            adviceHTML += '</ul>';
            adviceCard.innerHTML = adviceHTML;
            grid.appendChild(adviceCard);
        }

        // Metrics Cards
        grid.appendChild(createMetricCard('Бръчки', data.anti_aging.wrinkle_score, '#e74c3c'));
        grid.appendChild(createMetricCard('Загуба на обем', data.anti_aging.volume_loss_score, '#f39c12'));
        grid.appendChild(createMetricCard('Пигментация', data.anti_aging.pigmentation_score, '#9b59b6'));
        grid.appendChild(createMetricCard('Възпаление', data.health_indicators.inflammation_score, '#e74c3c'));
        grid.appendChild(createMetricCard('Хидратация', data.health_indicators.hydration_level_score, '#3498db'));
        grid.appendChild(createMetricCard('Стрес', data.health_indicators.stress_impact_score, '#f39c12'));

        resultsContainer.appendChild(grid);
    }
    
    function createCard(title) {
        const card = document.createElement('div');
        card.className = 'metric-card';
        card.innerHTML = `<h3>${title}</h3>`;
        return card;
    }

    function createMetricCard(title, score, color) {
        const card = createCard(title);
        const percentage = score * 10;
        card.innerHTML += `
            <div class="progress-bar-container">
                <div class="progress-bar" style="width: ${percentage}%; background-color: ${color};">
                   ${score}/10
                </div>
            </div>
        `;
        return card;
    }

    function createChartConfig(data) {
        return {
            type: 'radar',
            data: {
                labels: ['Бръчки', 'Обем', 'Пигментация', 'Текстура', 'Хидратация', 'Възпаление'],
                datasets: [{
                    label: 'Вашият профил',
                    data: [
                        data.anti_aging.wrinkle_score,
                        data.anti_aging.volume_loss_score,
                        data.anti_aging.pigmentation_score,
                        data.anti_aging.texture_score,
                        data.health_indicators.hydration_level_score,
                        data.health_indicators.inflammation_score
                    ],
                    fill: true,
                    backgroundColor: 'rgba(52, 152, 219, 0.2)',
                    borderColor: 'rgb(52, 152, 219)',
                    pointBackgroundColor: 'rgb(52, 152, 219)',
                }]
            },
            options: {
                scales: {
                    r: {
                        angleLines: { display: true },
                        suggestedMin: 0,
                        suggestedMax: 10,
                        pointLabels: { font: { size: 14 } }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        };
    }
});
