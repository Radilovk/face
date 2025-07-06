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
        const answers = {
            birthdate: document.getElementById('birthdate').value,
            sleep: document.getElementById('sleep').value,
            stress: document.getElementById('stress').value,
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
