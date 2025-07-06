// js/face-info.js
// Обновява страничния панел със статус на разпознаването на лица

document.addEventListener('DOMContentLoaded', () => {
    const countEl = document.getElementById('face-count');
    const confEl = document.getElementById('face-confidence');
    const camEl = document.getElementById('camera-name');
    const statusEl = document.getElementById('model-status');

    let detector;

    async function init() {
        if (!('FaceDetector' in window)) {
            statusEl.textContent = 'unsupported';
            return;
        }
        detector = new FaceDetector();
        statusEl.textContent = 'ready';
    }

    window.detectFaces = async function(img, sourceName = '') {
        if (!detector) return;
        try {
            const faces = await detector.detect(img);
            countEl.textContent = faces.length;
            confEl.textContent = faces[0] && typeof faces[0].confidence !== 'undefined'
                ? faces[0].confidence.toFixed(2)
                : '0';
            camEl.textContent = sourceName;
        } catch (err) {
            console.error('Face detection failed:', err);
            statusEl.textContent = 'error';
        }
    };

    init();
});
