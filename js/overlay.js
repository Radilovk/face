// js/overlay.js

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('overlay');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const preview = document.getElementById('image-preview');
    let faceBoxes = [];

    // expose function for external scripts
    window.drawFaceBoxes = (boxes) => {
        faceBoxes = Array.isArray(boxes) ? boxes : [];
    };

    canvas.style.pointerEvents = 'none';

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

    function drawFaceFrames() {
        for (const box of faceBoxes) {
            const { x, y, width, height, conf = 1 } = box;
            const borderColor = conf > 0.9 ? 'green' : conf > 0.7 ? 'yellow' : 'red';
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, width, height);
        }
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const step = canvas.width / 8;
        drawGrid(step, offset);
        drawFaceFrames();

        ctx.strokeStyle = 'rgba(0,255,255,0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, scanY);
        ctx.lineTo(canvas.width, scanY);
        ctx.stroke();

        offset = (offset + 0.5) % step;
        scanY = (scanY + 2) % canvas.height;
        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', resize);
    preview.addEventListener('load', resize);
    resize();
    animate();
});

