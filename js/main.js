document.addEventListener('DOMContentLoaded', () => {

    // --- STATE MANAGEMENT ---
    const analysisData = {
        image: null,
        answers: {}
    };

    // --- DOM ELEMENT SELECTORS ---
    const form = document.getElementById('questionnaire');
    const uploadBox = document.getElementById('upload-box');
    const fileInput = document.getElementById('file-upload');
    const imagePreview = document.getElementById('image-preview');
    const uploadPrompt = document.getElementById('upload-prompt');
    const fileNameDisplay = document.getElementById('file-name');
    const analyzeBtn = document.getElementById('analyze-btn');
    const formInputs = form.querySelectorAll('input, select');

    // --- MODAL ELEMENTS ---
    const modalTrigger = document.querySelector('.modal-trigger');
    const privacyModal = document.getElementById('privacy-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    function openModal() {
        privacyModal?.classList.remove('hidden');
    }

    function closeModal() {
        privacyModal?.classList.add('hidden');
    }

    modalTrigger?.addEventListener('click', openModal);
    modalCloseBtn?.addEventListener('click', closeModal);

    // --- DYNAMIC VALUE DISPLAY FOR RANGE SLIDERS ---
    const sleepSlider = document.getElementById('sleep');
    const sleepValue = document.getElementById('sleep-value');
    const stressSlider = document.getElementById('stress');
    const stressValue = document.getElementById('stress-value');

    if (sleepSlider) sleepSlider.addEventListener('input', (e) => sleepValue.textContent = e.target.value);
    if (stressSlider) stressSlider.addEventListener('input', (e) => stressValue.textContent = e.target.value);

    // --- ACCORDION LOGIC ---
    const accordionItems = document.querySelectorAll('.accordion-item');
    accordionItems.forEach(item => {
        const header = item.querySelector('.accordion-header');
        const content = item.querySelector('.accordion-content');
        header.addEventListener('click', () => {
            const currentlyActive = document.querySelector('.accordion-item.active');
            if (currentlyActive && currentlyActive !== item) {
                currentlyActive.classList.remove('active');
                const currHeader = currentlyActive.querySelector('.accordion-header');
                const currContent = currentlyActive.querySelector('.accordion-content');
                currHeader.setAttribute('aria-expanded', 'false');
                currContent.style.maxHeight = null;
            }

            item.classList.toggle('active');
            if (item.classList.contains('active')) {
                content.style.maxHeight = content.scrollHeight + 'px';
                header.setAttribute('aria-expanded', 'true');
            } else {
                content.style.maxHeight = null;
                header.setAttribute('aria-expanded', 'false');
            }
        });
    });
    const initialActive = document.querySelector('.accordion-item.active');
    if (initialActive) {
        const content = initialActive.querySelector('.accordion-content');
        const head = initialActive.querySelector('.accordion-header');
        content.style.maxHeight = content.scrollHeight + 'px';
        head.setAttribute('aria-expanded', 'true');
    }

    // --- FILE UPLOAD LOGIC ---
    uploadBox.addEventListener('click', () => fileInput.click());
    ['dragover', 'dragleave', 'drop'].forEach(eventName => uploadBox.addEventListener(eventName, preventDefaults, false));
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    uploadBox.addEventListener('dragover', () => uploadBox.classList.add('dragover'));
    uploadBox.addEventListener('dragleave', () => uploadBox.classList.remove('dragover'));
    uploadBox.addEventListener('drop', (e) => {
        uploadBox.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    });
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleFile(file);
    });

    function handleFile(file) {
        const allowedTypes = ['image/jpeg', 'image/png'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (!allowedTypes.includes(file.type)) {
            showError('Грешен файлов формат. Моля, изберете PNG или JPG изображение.');
            return;
        }
        if (file.size > maxSize) {
            showError('Файлът е твърде голям. Моля, изберете изображение под 5MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            analysisData.image = e.target.result;
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
            uploadPrompt.style.display = 'none';
            fileNameDisplay.textContent = file.name;
            fileNameDisplay.style.display = 'block';
            checkFormCompletion();
        };
        reader.readAsDataURL(file);
    }

    // --- FORM VALIDATION AND DATA PERSISTENCE (localStorage) ---
    function saveFormData() {
        const formData = new FormData(form);
        const data = {};
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        localStorage.setItem('savedFormData', JSON.stringify(data));
        checkFormCompletion();
    }

    function loadFormData() {
        const savedData = localStorage.getItem('savedFormData');
        if (savedData) {
            const data = JSON.parse(savedData);
            for (const key in data) {
                const input = form.querySelector(`[name="${key}"]`);
                if (input) {
                    if (input.type === 'radio') {
                        form.querySelector(`[name="${key}"][value="${data[key]}"]`).checked = true;
                    } else {
                        input.value = data[key];
                    }
                    // Manually trigger input event for range sliders to update their labels
                    if (input.type === 'range') {
                        input.dispatchEvent(new Event('input'));
                    }
                }
            }
        }
    }

    function checkFormCompletion() {
        const birthdateInput = document.getElementById('birthdate');
        analyzeBtn.disabled = !(birthdateInput.value && analysisData.image);
    }

    formInputs.forEach(input => input.addEventListener('change', saveFormData));
    loadFormData(); // Load data on initial page load
    checkFormCompletion();

    // --- DATA SUBMISSION ---
    analyzeBtn.addEventListener('click', async () => {
        if (!validateForm()) return;
        
        showLoadingOverlay(true);

        analysisData.answers = JSON.parse(localStorage.getItem('savedFormData') || '{}');

        try {
            const response = await fetch('https://face.radilov-k.workers.dev/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: analysisData.image,
                    answers: analysisData.answers
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `HTTP грешка! Статус: ${response.status}`);
            }

            const result = await response.json();
            sessionStorage.setItem('analysisResult', JSON.stringify(result));
            localStorage.removeItem('savedFormData'); // Clean up for next session
            window.location.href = 'results.html';

        } catch (error) {
            console.error('Error during analysis:', error);
            showError(`Възникна грешка: ${error.message}`);
            showLoadingOverlay(false);
        }
    });
    
    function validateForm() {
        const birthdateInput = document.getElementById('birthdate');
        let isValid = true;

        if (!birthdateInput.value) {
            birthdateInput.classList.add('input-error');
            showError("Моля, въведете дата на раждане.");
            isValid = false;
        } else {
            const birthDate = new Date(birthdateInput.value);
            const today = new Date();

            if (birthDate > today) {
                birthdateInput.classList.add('input-error');
                showError("Датата на раждане не може да е в бъдещето.");
                isValid = false;
            } else {
                let age = today.getFullYear() - birthDate.getFullYear();
                const m = today.getMonth() - birthDate.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                }

                if (age < 18) {
                    birthdateInput.classList.add('input-error');
                    showError("Трябва да сте поне на 18 години, за да използвате услугата.");
                    isValid = false;
                } else {
                    birthdateInput.classList.remove('input-error');
                }
            }
        }

        if (!analysisData.image) {
            showError("Моля, качете изображение.");
            isValid = false;
        }

        return isValid;
    }

    // --- UI UTILITY FUNCTIONS ---
    function showLoadingOverlay(show) {
        const overlay = document.getElementById('loader-overlay');
        if (!overlay) return;
        overlay.classList.toggle('hidden', !show);
    }

    function showError(message) {
        let errorBox = document.querySelector('.error-message');
        if (!errorBox) {
            errorBox = document.createElement('div');
            errorBox.className = 'error-message';
            document.body.appendChild(errorBox);
        }
        errorBox.textContent = message;
        errorBox.classList.add('visible');
        setTimeout(() => {
            errorBox.classList.remove('visible');
        }, 4000);
    }});