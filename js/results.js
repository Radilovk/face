document.addEventListener('DOMContentLoaded', async () => {

    // --- INITIAL DATA RETRIEVAL & VALIDATION ---
    const params = new URLSearchParams(window.location.search);
    const resultId = params.get('id');

    let resultsData = sessionStorage.getItem('analysisResult');
    if (!resultsData && resultId) {
        try {
            const resp = await fetch(`https://face.radilov-k.workers.dev/?id=${resultId}`);
            if (resp.ok) {
                resultsData = await resp.text();
            }
        } catch (err) {
            console.error('Failed to fetch stored result:', err);
        }
    }
    sessionStorage.removeItem('analysisResult'); // Clear after reading to prevent re-use on refresh

    if (!resultsData) {
        handleNoData();
        return;
    }

    try {
        const analysis = JSON.parse(resultsData);
        // Set dynamic page title
        document.title = `Вашият AI Анализ от ${new Date().toLocaleDateString()}`;
        renderPage(analysis);
        setupShareLink(analysis.id);
    } catch (error) {
        console.error("Failed to parse analysis data or render page:", error);
        handleNoData("Възникна грешка при визуализацията на данните.");
    }

    // --- CORE RENDER FUNCTION ---
    function renderPage(analysis) {
        renderSummaryAndGauge(analysis.summary);
        renderRadarChart(analysis.anti_aging, analysis.health_indicators);
        renderAdvice(analysis.advice);
        setupTabs();
    }

    // --- RENDER HELPER FUNCTIONS ---

    function renderSummaryAndGauge(summary) {
        const score = summary?.overall_skin_health_score ?? 0;
        const scorePercentage = score * 10;
        
        document.getElementById('overall-score-value').textContent = score;
        document.getElementById('perceived-age').textContent = summary?.perceived_age || 'N/A';
        document.getElementById('key-findings').textContent = summary?.key_findings?.join('. ') || 'Няма специфични заключения.';
        
        const scoreGaugeEl = document.getElementById('score-gauge');
        setTimeout(() => {
            scoreGaugeEl.style.background = `
                radial-gradient(var(--container-bg) 85%, transparent 85%),
                conic-gradient(var(--primary-magenta) 0% ${scorePercentage}%, var(--bg-color) ${scorePercentage}% 100%)
            `;
        }, 100);
    }

    function renderRadarChart(antiAging = {}, health = {}) {
        const ctx = document.getElementById('metricsRadarChart')?.getContext('2d');
        if (!ctx) return;

        // Combine all metrics and map keys to human-readable labels
        const metricLabels = {
            wrinkle_score: "Бръчки",
            volume_loss_score: "Загуба на обем",
            pigmentation_score: "Пигментация",
            hydration_level_score: "Хидратация",
            inflammation_score: "Възпаление",
            stress_impact_score: "Стрес"
        };
        
        const allMetrics = {...antiAging, ...health};
        const labels = Object.keys(metricLabels);
        const data = labels.map(labelKey => allMetrics[labelKey] ?? 0);

        new Chart(ctx, {
            type: 'radar',
            data: {
                labels: labels.map(key => metricLabels[key]),
                datasets: [{
                    label: 'Оценка на Показателите (по-голяма стойност е по-добре)',
                    data: data,
                    backgroundColor: 'rgba(255, 0, 255, 0.2)',
                    borderColor: 'rgba(255, 0, 255, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(255, 0, 255, 1)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgba(255, 0, 255, 1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        pointLabels: { 
                            color: '#e0e0e0',
                            font: { size: 14, family: 'Poppins' }
                        },
                        ticks: {
                            color: '#8c8c9e',
                            backdropColor: 'transparent',
                            stepSize: 2,
                            max: 10,
                            min: 0
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#e0e0e0',
                            font: { size: 12, family: 'Poppins' }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.r !== null) {
                                    label += `${context.parsed.r} / 10`;
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });

        updateMetricCards(allMetrics, metricLabels);
    }

    function updateMetricCards(metrics, labelMap) {
        Object.keys(labelMap).forEach(key => {
            const card = document.getElementById(`metric-${key}`);
            if (!card) return;
            const score = metrics[key] ?? 0;
            card.querySelector('.metric-score').textContent = `${score}/10`;
            const bar = card.querySelector('.progress-bar');
            if (bar) bar.style.width = `${score * 10}%`;
        });
    }

    function renderAdvice(advice) {
        const adviceContainer = document.getElementById('advice-container');
        adviceContainer.innerHTML = '';
        if (!advice || Object.keys(advice).length === 0) {
            const p = document.createElement('p');
            p.className = 'no-advice';
            p.textContent = 'Няма специфични препоръки на база този анализ.';
            adviceContainer.appendChild(p);
            return;
        }

        const adviceIconMap = {
            HIGH_INFLAMMATION: "fa-solid fa-fire-flame-curved",
            HIGH_PIGMENTATION_SCORE: "fa-solid fa-solar-panel",
            HIGH_STRESS_IMPACT: "fa-solid fa-brain",
            HIGH_WRINKLE_SCORE: "fa-solid fa-lines-leaning",
            POOR_HYDRATION: "fa-solid fa-droplet",
        };
        
        Object.keys(advice).forEach((key, index) => {
            const adviceText = advice[key];
            const [title, ...textParts] = adviceText.split(':');
            const text = textParts.join(':').trim();
            const iconClass = adviceIconMap[key] || 'fa-solid fa-lightbulb';

            const card = document.createElement('div');
            card.className = 'advice-card';

            const icon = document.createElement('i');
            icon.className = `advice-card-icon ${iconClass}`;
            card.appendChild(icon);

            const titleEl = document.createElement('h3');
            titleEl.className = 'advice-card-title';
            titleEl.textContent = title;
            card.appendChild(titleEl);

            const textEl = document.createElement('p');
            textEl.className = 'advice-card-text';
            textEl.textContent = text;
            card.appendChild(textEl);

            adviceContainer.appendChild(card);

            setTimeout(() => {
                card.classList.add('visible');
            }, index * 150);
        });
        
        // Stagger animation for advice cards
        const cards = adviceContainer.querySelectorAll('.advice-card');
        cards.forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('visible');
            }, index * 150); // 150ms delay between each card
        });
    }

    // --- UI EVENT HANDLERS ---

    function setupTabs() {
        const tabLinks = document.querySelectorAll('.tab-link');
        tabLinks.forEach(link => {
            link.addEventListener('click', () => {
                const targetTabId = link.dataset.tab;
                
                document.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active'));
                document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

                link.classList.add('active');
                document.getElementById(targetTabId).classList.add('active');
            });
        });
    }

    function setupShareLink(id) {
        const shareBtn = document.getElementById('share-btn');
        const shareModal = document.getElementById('share-modal');
        const modalClose = document.getElementById('modal-close');
        const copyBtn = document.getElementById('copy-link-btn');
        const linkInput = document.getElementById('share-link-input');

        if (id && linkInput) {
            linkInput.value = `${location.origin}${location.pathname}?id=${id}`;
        }

        shareBtn?.addEventListener('click', () => {
            shareModal?.classList.add('visible');
            linkInput?.select();
        });
        modalClose?.addEventListener('click', () => shareModal?.classList.remove('visible'));
        copyBtn?.addEventListener('click', () => {
            if (!linkInput) return;
            navigator.clipboard.writeText(linkInput.value).then(() => {
                copyBtn.textContent = 'Копирано!';
                setTimeout(() => copyBtn.textContent = 'Копирай', 2000);
            });
        });
    }

    function handleNoData(message = "Няма данни за анализ. Моля, върнете се на началната страница.") {
        const container = document.querySelector('.main-container.results-page') || document.body;
        container.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.style.textAlign = 'center';
        wrapper.style.padding = '4rem';

        const titleEl = document.createElement('h1');
        titleEl.className = 'main-title';
        titleEl.textContent = 'Грешка';
        wrapper.appendChild(titleEl);

        const subtitleEl = document.createElement('p');
        subtitleEl.className = 'subtitle';
        subtitleEl.textContent = message;
        wrapper.appendChild(subtitleEl);

        const link = document.createElement('a');
        link.href = 'index.html';
        link.className = 'cta-button secondary-btn';
        link.style.marginTop = '2rem';
        link.textContent = 'Начална страница';
        wrapper.appendChild(link);

        container.appendChild(wrapper);
    }});