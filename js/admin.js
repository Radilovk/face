let productsData = { categories: [] };

async function loadData() {
    const stored = localStorage.getItem('products');
    if (stored) {
        productsData = JSON.parse(stored);
    } else {
        try {
            const res = await fetch('data/products.json');
            productsData = await res.json();
        } catch (err) {
            console.error('Неуспешно зареждане на products.json', err);
        }
    }
    fillGroupOptions();
}

function fillGroupOptions() {
    const select = document.getElementById('product-group');
    select.innerHTML = '';
    productsData.categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = cat.title;
        select.appendChild(opt);
    });
}

function saveData() {
    localStorage.setItem('products', JSON.stringify(productsData));
    alert('Данните са записани локално.');
}

document.getElementById('group-form').addEventListener('submit', e => {
    e.preventDefault();
    const title = document.getElementById('group-name').value.trim();
    const id = title.toLowerCase().replace(/\s+/g, '-');
    const image = document.getElementById('group-image').value.trim();
    const desc = document.getElementById('group-description').value.trim();
    productsData.categories.push({ id, title, image, alt: desc, products: [] });
    fillGroupOptions();
    e.target.reset();
});

document.getElementById('product-form').addEventListener('submit', e => {
    e.preventDefault();
    const catId = document.getElementById('product-group').value;
    const name = document.getElementById('product-name').value.trim();
    const tagline = document.getElementById('product-tagline').value.trim();
    const link = document.getElementById('product-link').value.trim();
    const chartValues = document.getElementById('product-chart').value
        .split(',')
        .map(v => parseFloat(v.trim()))
        .filter(v => !isNaN(v));
    const effects = chartValues.map((val, idx) => ({
        label: `Стойност ${idx + 1}`,
        score: val.toString(),
        width: `${val * 10}%`
    }));
    const cat = productsData.categories.find(c => c.id === catId);
    if (cat) {
        cat.products.push({ name, tagline, effects, link });
    }
    e.target.reset();
});

document.getElementById('save-btn').addEventListener('click', saveData);

loadData();
