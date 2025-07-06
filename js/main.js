// js/main.js

document.addEventListener('DOMContentLoaded', () => {
    const fileUpload = document.getElementById('file-upload');
    const imagePreview = document.getElementById('image-preview');
    const analyzeBtn = document.getElementById('analyze-btn');
    const statusEl = document.getElementById('model-status');
    const progressEl = document.getElementById('model-progress');
    const overlay = document.getElementById('overlay');
    const overlayCtx = overlay ? overlay.getContext('2d') : null;

    if (statusEl && progressEl) {
        statusEl.textContent = 'Зареждане на моделите...';
        let prog = 0;
        const progInterval = setInterval(() => {
            prog = (prog + 5) % 100;
            progressEl.style.width = prog + '%';
        }, 200);

        loadModels().then(() => {
            clearInterval(progInterval);
            progressEl.style.width = '100%';
            statusEl.textContent = 'Моделите са заредени';
        });
    }

    let base64Image = null;

    function loadModels() {
        return new Promise(resolve => setTimeout(resolve, 1500));
    }

    async function detectFaces() {
        if (!overlayCtx || !('FaceDetector' in window)) return;
        try {
            const detector = new FaceDetector();
            const faces = await detector.detect(imagePreview);
            const boxes = faces.map(f => ({
                x: f.boundingBox.x,
                y: f.boundingBox.y,
                width: f.boundingBox.width,
                height: f.boundingBox.height,
                conf: f.score || f.probability || 1,
            }));
            if (window.drawFaceBoxes) {
                window.drawFaceBoxes(boxes);
            } else {
                overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
                boxes.forEach(b => {
                    const borderColor = b.conf > 0.9 ? 'green' : b.conf > 0.7 ? 'yellow' : 'red';
                    overlayCtx.strokeStyle = borderColor;
                    overlayCtx.lineWidth = 2;
                    overlayCtx.strokeRect(b.x, b.y, b.width, b.height);
                });
            }
        } catch (err) {
            console.error('Face detection error:', err);
        }
    }

    // --- Функция за преоразмеряване на изображението ---
    async function resizeImage(file) {
        const MAX_DIMENSION = 1024; // Максимален размер на по-дългата страна в пиксели
        const reader = new FileReader();

        return new Promise((resolve, reject) => {
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;

                    // Изчисляваме новите размери, запазвайки пропорцията
                    if (width > height) {
                        if (width > MAX_DIMENSION) {
                            height = height * (MAX_DIMENSION / width);
                            width = MAX_DIMENSION;
                        }
                    } else {
                        if (height > MAX_DIMENSION) {
                            width = width * (MAX_DIMENSION / height);
                            height = MAX_DIMENSION;
                        }
                    }

                    // Създаваме canvas, за да нарисуваме новото изображение
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Експортираме преоразмереното изображение като base64 JPEG с високо качество
                    resolve(canvas.toDataURL('image/jpeg', 0.9));
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // --- Слушател за качване на файл ---
    fileUpload.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file || !file.type.startsWith('image/')) {
            alert('Моля, изберете валиден файл с изображение.');
            return;
        }

        try {
            // Деактивираме бутона, докато трае обработката
            analyzeBtn.disabled = true;
            analyzeBtn.textContent = 'Обработка...';

            // Извикваме новата функция за преоразмеряване
            const resizedImage = await resizeImage(file);
            
            base64Image = resizedImage;
            imagePreview.src = base64Image;
            imagePreview.onload = detectFaces;

            // Активираме бутона след успешна обработка
            analyzeBtn.disabled = false;
            analyzeBtn.textContent = 'АНАЛИЗИРАЙ СЕГА';

        } catch (error) {
            console.error('Грешка при преоразмеряване на изображението:', error);
            alert('Възникна грешка при обработката на вашата снимка. Моля, опитайте с друг файл.');
            analyzeBtn.textContent = 'АНАЛИЗИРАЙ СЕГА';
        }
    });

    // --- Слушател за бутона "Анализирай" (без промяна) ---
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

        sessionStorage.setItem('analysisPayload', JSON.stringify(payload));
        sessionStorage.setItem('userImage', base64Image);

        window.location.href = 'loading.html';
    });
});
