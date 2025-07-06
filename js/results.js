document.addEventListener('DOMContentLoaded', () => {
    const resultString = sessionStorage.getItem('analysisResult');
    const userImage = sessionStorage.getItem('userImage');

    if (!resultString || !userImage) {
        document.body.innerHTML = '<h1>Грешка: Не са намерени резултати. <a href="index.html">Започнете отначало</a></h1>';
        return;
    }

    const data = JSON.parse(resultString);
    renderPage(data, userImage);

    function renderPage(data, userImage) {
        renderSummaryCard(data, userImage);
        renderOverviewTab(data);
        renderAdviceTab(data);
        renderDetailsTab(data);
        setupTabLogic();
    }

    function renderSummaryCard(data, userImage) {
        const container = document.getElementById('summary-card-container');
        container.innerHTML = `
            <div class="results-summary-card">
                <img src="${userImage}" alt="User Photo">
                <div>
                    <h2>Вашият доклад</h2>
                    <p>Възприемана възраст: <strong>${data.summary.perceived_age}</strong></p>
                </div>
            </div>
        `;
    }

    function renderOverviewTab(data) {
        const container = document.getElementById('overview');
        // Радарна графика
        const chartCard = createCard('Ключови показатели');
        const canvas = document.createElement('canvas');
        chartCard.appendChild(canvas);
        new Chart(canvas, createChartConfig(data));
        container.appendChild(chartCard);

        // Прогрес барове
        container.appendChild(createMetricCard('Бръчки', data.anti_aging.wrinkle_score, '#e74c3c'));
        container.appendChild(createMetricCard('Загуба на обем', data.anti_aging.volume_loss_score, '#f39c12'));
        container.appendChild(createMetricCard('Пигментация', data.anti_aging.pigmentation_score, '#9b59b6'));
        container.appendChild(createMetricCard('Възпаление', data.health_indicators.inflammation_score, '#e74c3c'));
        container.appendChild(createMetricCard('Хидратация', data.health_indicators.hydration_level_score, '#3498db'));
        container.appendChild(createMetricCard('Стрес', data.health_indicators.stress_impact_score, '#f39c12'));
    }

    function renderAdviceTab(data) {
        const container = document.getElementById('advice');
        if (data.advice && Object.keys(data.advice).length > 0) {
            let adviceHTML = '';
            for (const key in data.advice) {
                adviceHTML += `
                    <div class="advice-card">
                        <h3>Препоръка за ${getAdviceTitle(key)}</h3>
                        <p>${data.advice[key]}</p>
                    </div>
                `;
            }
            container.innerHTML = adviceHTML;
        } else {
            container.innerHTML = `<div class="metric-card"><p>Няма специфични препоръки. Продължавайте в същия дух!</p></div>`;
        }
    }

    function renderDetailsTab(data) {
        const container = document.getElementById('details');
        const card = createCard('Пълен анализ - сурови данни');
        let detailsHTML = '<ul>';
        for(const category in data) {
            if(typeof data[category] === 'object' && category !== 'summary' && category !== 'findings_map' && category !== 'advice') {
                for(const metric in data[category]) {
                     detailsHTML += `<li><strong>${metric}:</strong> ${data[category][metric]}/10</li>`;
                }
            }
        }
        detailsHTML += '</ul>';
        card.innerHTML += detailsHTML;
        container.appendChild(card);
    }
    
    function setupTabLogic() {
        const tabsContainer = document.getElementById('tabs-container');
        const tabButtons = tabsContainer.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');

        tabsContainer.addEventListener('click', (e) => {
            const clickedButton = e.target.closest('.tab-button');
            if (!clickedButton) return;

            tabButtons.forEach(button => button.classList.remove('active'));
            clickedButton.classList.add('active');

            const tabId = clickedButton.dataset.tab;
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === tabId) {
                    content.classList.add('active');
                }
            });
        });
    }

    // Хелпър функции (същите като преди, с добавка)
    function createCard(title) {
        const card = document.createElement('div');
        card.className = 'metric-card';
        card.innerHTML = `<h3>${title}</h3>`;
        return card;
    }
    function createMetricCard(title, score, color) {
        const card = createCard(title);

        const value = document.createElement('p');
        value.textContent = `${score}/10`;
        card.appendChild(value);

        const progressContainer = document.createElement('div');
        progressContainer.className = 'progress-bar-container';

        const outerBar = document.createElement('div');
        outerBar.className = 'h-2 bg-gray-700 rounded';

        const innerBar = document.createElement('div');
        const percent = Math.min(Math.max(score * 10, 0), 100);
        innerBar.style.width = `${percent}%`;
        innerBar.style.backgroundColor = color;
        innerBar.className = 'h-2 rounded';

        outerBar.appendChild(innerBar);
        progressContainer.appendChild(outerBar);
        card.appendChild(progressContainer);

        return card;
    }

    function createChartConfig(data) {
        return {
            type: 'radar',
            data: {
                labels: [
                    'Бръчки',
                    'Загуба на обем',
                    'Пигментация',
                    'Възпаление',
                    'Хидратация',
                    'Стрес'
                ],
                datasets: [{
                    label: 'Скала 1-10',
                    data: [
                        data.anti_aging.wrinkle_score,
                        data.anti_aging.volume_loss_score,
                        data.anti_aging.pigmentation_score,
                        data.health_indicators.inflammation_score,
                        data.health_indicators.hydration_level_score,
                        data.health_indicators.stress_impact_score
                    ],
                    backgroundColor: 'rgba(52, 152, 219, 0.2)',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    pointBackgroundColor: 'rgba(52, 152, 219, 1)'
                }]
            },
            options: {
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 10,
                        ticks: {
                            stepSize: 2
                        }
                    }
                }
            }
        };
    }
    function getAdviceTitle(key) {
        const titles = {
            'HIGH_WRINKLE_SCORE': 'Бръчки', 'HIGH_PIGMENTATION_SCORE': 'Пигментация',
            'POOR_HYDRATION': 'Хидратация', 'HIGH_INFLAMMATION': 'Възпаление',
            'HIGH_STRESS_IMPACT': 'Стрес'
        };
        return titles[key] || 'Обща';
    }
});
