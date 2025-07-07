// js/products.js

function initProductCards() {
    const cards = document.querySelectorAll('.product-card');
    cards.forEach(card => {
        const header = card.querySelector('.card-header');
        header.addEventListener('click', function (event) {
            if (event.target.closest('.variant-link')) return;
            card.classList.toggle('expanded');
        });
    });

    document.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });

    const scrollObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    document.querySelectorAll('.fade-in-up').forEach(el => scrollObserver.observe(el));

    const barObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const card = entry.target;
                const bars = card.querySelectorAll('.effect-bar');
                bars.forEach(bar => {
                    const targetWidth = bar.dataset.width;
                    bar.style.width = targetWidth;
                    bar.classList.add('animated');
                });
                observer.unobserve(card);
            }
        });
    }, { threshold: 0.25 });
    document.querySelectorAll('.product-card').forEach(card => barObserver.observe(card));
}

function buildProducts(data) {
    const container = document.getElementById('categories');
    if (!container) return;
    data.categories.forEach(cat => {
        const section = document.createElement('section');
        section.id = cat.id;
        section.className = 'fade-in-up';

        const title = document.createElement('h2');
        title.className = 'category-title';
        title.textContent = cat.title;
        section.appendChild(title);

        const imgWrapper = document.createElement('div');
        imgWrapper.className = 'category-image-wrapper';
        const img = document.createElement('img');
        img.src = cat.image;
        img.alt = cat.alt || '';
        imgWrapper.appendChild(img);
        section.appendChild(imgWrapper);

        const grid = document.createElement('div');
        grid.className = 'product-grid';

        cat.products.forEach(prod => {
            const card = document.createElement('article');
            card.className = 'product-card fade-in-up';

            const header = document.createElement('div');
            header.className = 'card-header';

            const pt = document.createElement('div');
            pt.className = 'product-title';
            pt.innerHTML = `<h3>${prod.name}</h3><p>${prod.tagline}</p>`;
            header.appendChild(pt);

            const effectsContainer = document.createElement('div');
            effectsContainer.className = 'effects-container';
            prod.effects.forEach(eff => {
                const grp = document.createElement('div');
                grp.className = 'effect-bar-group';
                grp.innerHTML =
                    `<div class="effect-label">${eff.label}</div>` +
                    `<div class="effect-bar-container"><div class="effect-bar" data-width="${eff.width}">${eff.score} / 10</div></div>`;
                effectsContainer.appendChild(grp);
            });
            header.appendChild(effectsContainer);

            const icon = document.createElement('div');
            icon.className = 'expand-icon';
            icon.textContent = '+';
            header.appendChild(icon);

            card.appendChild(header);

            const details = document.createElement('div');
            details.className = 'card-details';
            details.innerHTML = `<p>${prod.description}</p>`;
            if (prod.research) {
                details.innerHTML += `<div class="research-note">Източник: <a href="${prod.research.url}" target="_blank" rel="noopener">${prod.research.source}</a></div>`;
            }
            if (prod.variants && prod.variants.length) {
                details.innerHTML += `<h4 class="details-section-title">Налични форми:</h4>`;
                const ul = document.createElement('ul');
                ul.className = 'product-variants';
                prod.variants.forEach(v => {
                    const li = document.createElement('li');
                    li.className = 'variant-item';
                    li.innerHTML = `<strong>${v.title}</strong><span>${v.note}</span><a href="${v.link}" class="variant-link" target="_blank" rel="noopener">Виж продукта</a>`;
                    ul.appendChild(li);
                });
                details.appendChild(ul);
            }
            card.appendChild(details);
            grid.appendChild(card);
        });

        section.appendChild(grid);
        container.appendChild(section);
    });
    initProductCards();
}

document.addEventListener('DOMContentLoaded', () => {
    fetch('data/products.json')
        .then(res => res.json())
        .then(buildProducts)
        .catch(err => console.error('Error loading products:', err));
});
