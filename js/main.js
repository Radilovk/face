// js/main.js

document.addEventListener("DOMContentLoaded", () => {
  const fileUpload = document.getElementById("file-upload");
  const imagePreview = document.getElementById("image-preview");
  const analyzeBtn = document.getElementById("analyze-btn");

  let base64Image = null;

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
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          // Експортираме преоразмереното изображение като base64 JPEG с високо качество
          resolve(canvas.toDataURL("image/jpeg", 0.9));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // --- Слушател за качване на файл ---
  fileUpload.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file || !file.type.startsWith("image/")) {
      alert("Моля, изберете валиден файл с изображение.");
      return;
    }

    try {
      // Деактивираме бутона, докато трае обработката
      analyzeBtn.disabled = true;
      analyzeBtn.textContent = "Обработка...";

      // Извикваме новата функция за преоразмеряване
      const resizedImage = await resizeImage(file);

      base64Image = resizedImage;
      imagePreview.src = base64Image;

      // Активираме бутона след успешна обработка
      analyzeBtn.disabled = false;
      analyzeBtn.textContent = "АНАЛИЗИРАЙ СЕГА";
    } catch (error) {
      console.error("Грешка при преоразмеряване на изображението:", error);
      alert(
        "Възникна грешка при обработката на вашата снимка. Моля, опитайте с друг файл.",
      );
      analyzeBtn.textContent = "АНАЛИЗИРАЙ СЕГА";
    }
  });

  // --- Слушател за бутона "Анализирай" (без промяна) ---
  analyzeBtn.addEventListener("click", () => {
    const answers = {
      birthdate: document.getElementById("birthdate").value,
      sleep: document.getElementById("sleep").value,
      stress: document.getElementById("stress").value,
      sun_exposure: document.getElementById("sun_exposure").value,
    };

    if (
      !base64Image ||
      !answers.birthdate ||
      !answers.sleep ||
      !answers.stress
    ) {
      alert("Моля, попълнете всички полета и качете снимка.");
      return;
    }

    const payload = {
      image: base64Image,
      answers: answers,
    };

    sessionStorage.setItem("analysisPayload", JSON.stringify(payload));
    sessionStorage.setItem("userImage", base64Image);

    window.location.href = "loading.html";
  });

  // --- Камера функционалности ---
  const video = document.getElementById("video");
  const overlay = document.getElementById("overlay");
  const startStopBtn = document.getElementById("start-stop-btn");
  const switchBtn = document.getElementById("switch-btn");
  const screenshotBtn = document.getElementById("screenshot-btn");
  const landmarksBtn = document.getElementById("landmarks-btn");

  let stream = null;
  let usingFront = true;
  let showLandmarks = false;

  if (startStopBtn) {
    startStopBtn.addEventListener("click", async () => {
      if (stream) {
        stopCamera();
      } else {
        await startCamera();
      }
    });
  }

  if (switchBtn) {
    switchBtn.addEventListener("click", async () => {
      await switchCamera();
    });
  }

  if (screenshotBtn) {
    screenshotBtn.addEventListener("click", takeScreenshot);
  }

  if (landmarksBtn) {
    landmarksBtn.addEventListener("click", toggleLandmarks);
  }

  async function startCamera() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: usingFront ? "user" : "environment" },
      });
      if (video) {
        video.srcObject = stream;
      }
      if (startStopBtn) {
        startStopBtn.textContent = "Stop";
      }
    } catch (err) {
      console.error("Camera start error:", err);
    }
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    if (video) {
      video.srcObject = null;
    }
    if (startStopBtn) {
      startStopBtn.textContent = "Start";
    }
  }

  async function switchCamera() {
    usingFront = !usingFront;
    if (stream) {
      stopCamera();
      await startCamera();
    }
  }

  function takeScreenshot() {
    if (!video || !stream) {
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/png");
    imagePreview.src = dataUrl;
    base64Image = dataUrl;
  }

  function toggleLandmarks() {
    showLandmarks = !showLandmarks;
    if (overlay) {
      overlay.style.display = showLandmarks ? "block" : "none";
    }
  }
});
