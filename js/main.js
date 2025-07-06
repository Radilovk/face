document.addEventListener('DOMContentLoaded', () => {
    const fileUpload = document.getElementById('file-upload');
    const imagePreview = document.getElementById('image-preview');
    const analyzeBtn = document.getElementById('analyze-btn');

    let base64Image = null;

    fileUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                base64Image = e.target.result;
                imagePreview.src = base64Image;
                analyzeBtn.disabled = false;
            };
            reader.readAsDataURL(file);
        }
    });

    analyzeBtn.addEventListener('click', () => {
        const sleepVal = parseInt(document.getElementById('sleep').value, 10);
        const stressVal = parseInt(document.getElementById('stress').value, 10);

        if (
            isNaN(sleepVal) || sleepVal < 1 || sleepVal > 12 ||
            isNaN(stressVal) || stressVal < 1 || stressVal > 10
        ) {
            alert('Невалидни данни: сънят трябва да е между 1 и 12 часа, а стресът – между 1 и 10.');
            return;
        }

        const answers = {
            birthdate: document.getElementById('birthdate').value,
            sleep: sleepVal,
            stress: stressVal,
            sun_exposure: document.getElementById('sun_exposure').value,
        };

        if (!base64Image || !answers.birthdate || !answers.sleep || !answers.stress) {
            alert('Моля, попълнете всички полета и качете снимка.');
            return;
        }

        const payload = {
            image: base64Image,
            answers: answers,
        };

        // Запазваме данните в sessionStorage, за да ги ползваме на следващата страница
        sessionStorage.setItem('analysisPayload', JSON.stringify(payload));
        sessionStorage.setItem('userImage', base64Image);

        // Пренасочваме към страницата за зареждане
        window.location.href = 'loading.html';
    });
});
