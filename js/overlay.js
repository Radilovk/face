// js/overlay.js

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('overlay');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const preview = document.getElementById('image-preview');

    canvas.style.pointerEvents = 'none';

    let detectedFaces = [];
    const detector = 'FaceDetector' in window ? new FaceDetector() : null;

    async function detectFaces() {
        if (!detector || !preview.naturalWidth) {
            detectedFaces = [];
            return;
        }
        try {
            detectedFaces = await detector.detect(preview);
        } catch (err) {
            console.error('Face detection error:', err);
            detectedFaces = [];
        }
    }

    function drawBoxes() {
        const scaleX = canvas.width / preview.naturalWidth;
        const scaleY = canvas.height / preview.naturalHeight;
        for (const face of detectedFaces) {
            const { width, height, top, left } = face.boundingBox;
            const x = left * scaleX;
            const y = top * scaleY;
            const w = width * scaleX;
            const h = height * scaleY;
            const conf = face?.confidence || 0.95;
            const borderColor = conf > 0.9 ? 'green' : conf > 0.7 ? 'yellow' : 'red';
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, w, h);
        }
    }

    function resize() {
        canvas.width = preview.clientWidth;
        canvas.height = preview.clientHeight;
    }

    function drawGrid(step, offset) {
        ctx.strokeStyle = 'cyan';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        for (let x = 0; x <= canvas.width; x += step) {
            ctx.beginPath();
            ctx.moveTo(x + offset, 0);
            ctx.lineTo(x + offset, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y <= canvas.height; y += step) {
            ctx.beginPath();
            ctx.moveTo(0, y + offset);
            ctx.lineTo(canvas.width, y + offset);
            ctx.stroke();
        }
        ctx.setLineDash([]);
    }

    let offset = 0;
    let scanY = 0;

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const step = canvas.width / 8;
        drawGrid(step, offset);

        ctx.strokeStyle = 'rgba(0,255,255,0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, scanY);
        ctx.lineTo(canvas.width, scanY);
        ctx.stroke();

        drawBoxes();

        offset = (offset + 0.5) % step;
        scanY = (scanY + 2) % canvas.height;
        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', () => { resize(); detectFaces(); });
    preview.addEventListener('load', () => { resize(); detectFaces(); });
    resize();
    detectFaces();
    animate();
});

