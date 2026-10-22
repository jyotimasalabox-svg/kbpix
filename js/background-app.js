/**
 * PhotoResize Pro — AI Background Remover Controller
 * Wires file upload, progress bar, color replacement & high-res download
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const dropzone = document.getElementById('bgDropzone');
  const fileInput = document.getElementById('bgFileInput');
  const progressCard = document.getElementById('bgProgressCard');
  const progressBar = document.getElementById('bgProgressBar');
  const progressText = document.getElementById('bgProgressText');
  const workspace = document.getElementById('bgWorkspace');
  const canvas = document.getElementById('bgResultCanvas');

  const colorPills = document.querySelectorAll('.preset-btn[data-bg]');
  const customColorPicker = document.getElementById('customColorPicker');
  const customBgFileInput = document.getElementById('customBgFileInput');
  const btnSelectCustomBg = document.getElementById('btnSelectCustomBg');
  const edgeSlider = document.getElementById('edgeFeatherSlider');
  const edgeVal = document.getElementById('edgeFeatherVal');
  const formatSelect = document.getElementById('exportFormatSelect');
  const btnDownload = document.getElementById('btnDownloadBgCutout');
  const btnChange = document.getElementById('btnChangeOriginal');

  // Camera
  const btnCamera = document.getElementById('btnBgCamera');
  const cameraModal = document.getElementById('cameraModal');
  const btnCloseCamera = document.getElementById('btnCloseCamera');
  const cameraVideo = document.getElementById('cameraVideo');
  const btnSnapPhoto = document.getElementById('btnSnapPhoto');
  let mediaStream = null;

  // Sidebar toggle
  const btnToggleSidebar = document.getElementById('btnToggleSidebar');
  const appSidebar = document.getElementById('appSidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');

  if (btnToggleSidebar && appSidebar) {
    btnToggleSidebar.addEventListener('click', () => {
      appSidebar.classList.toggle('drawer-open');
      if (sidebarBackdrop) sidebarBackdrop.classList.toggle('active');
    });
    if (sidebarBackdrop) {
      sidebarBackdrop.addEventListener('click', () => {
        appSidebar.classList.remove('drawer-open');
        sidebarBackdrop.classList.remove('active');
      });
    }
  }

  // Dark Mode Toggle
  const themeBtn = document.getElementById('themeToggleBtn');
  const themeIcon = document.getElementById('themeIcon');
  const themeText = document.getElementById('themeText');

  function initTheme() {
    const saved = localStorage.getItem('photo_theme') || 'light';
    if (saved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      if (themeIcon) themeIcon.textContent = '☀️';
      if (themeText) themeText.textContent = 'Light';
    }
  }
  initTheme();

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('photo_theme', 'light');
        if (themeIcon) themeIcon.textContent = '🌙';
        if (themeText) themeText.textContent = 'Dark';
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('photo_theme', 'dark');
        if (themeIcon) themeIcon.textContent = '☀️';
        if (themeText) themeText.textContent = 'Light';
      }
    });
  }

  let originalImg = null;
  let rawAlphaCanvas = null;
  let activeBgColor = 'transparent';
  let activeBgImage = null;
  let activeFeather = 0;

  // --- Upload Handlers ---
  dropzone.addEventListener('click', (e) => {
    if (e.target.closest('#btnBgCamera')) return;
    fileInput.click();
  });

  ['dragenter', 'dragover'].forEach(n => {
    dropzone.addEventListener(n, (e) => { e.preventDefault(); dropzone.classList.add('drag-active'); });
  });
  ['dragleave', 'drop'].forEach(n => {
    dropzone.addEventListener(n, (e) => { e.preventDefault(); dropzone.classList.remove('drag-active'); });
  });

  dropzone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processPhoto(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      processPhoto(e.target.files[0]);
    }
  });

  if (btnChange) {
    btnChange.addEventListener('click', () => {
      workspace.style.display = 'none';
      dropzone.style.display = 'block';
      fileInput.click();
    });
  }

  async function processPhoto(file) {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }

    dropzone.style.display = 'none';
    progressCard.classList.add('active');
    progressBar.style.width = '10%';
    progressText.textContent = 'Loading AI segmentation model...';

    try {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise(r => img.onload = r);
      originalImg = img;

      rawAlphaCanvas = await window.AIBackgroundRemover.removeBackground(file, {
        onProgress: (pct, msg) => {
          progressBar.style.width = `${pct}%`;
          progressText.textContent = msg;
        }
      });

      renderComposite();

      progressCard.classList.remove('active');
      workspace.style.display = 'block';
    } catch (err) {
      console.error(err);
      alert('Background removal error: ' + err.message);
      progressCard.classList.remove('active');
      dropzone.style.display = 'block';
    }
  }

  function renderComposite() {
    if (!rawAlphaCanvas || !canvas) return;

    const composite = window.AIBackgroundRemover.compositeBackground(
      rawAlphaCanvas,
      activeBgColor,
      activeBgImage,
      activeFeather
    );

    canvas.width = composite.width;
    canvas.height = composite.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(composite, 0, 0);
  }

  // --- Background Color Selection ---
  colorPills.forEach(pill => {
    pill.addEventListener('click', () => {
      colorPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeBgColor = pill.dataset.bg;
      activeBgImage = null;

      // Auto update format suggestion
      if (activeBgColor === 'transparent') {
        formatSelect.value = 'image/png';
      }
      renderComposite();
    });
  });

  if (customColorPicker) {
    customColorPicker.addEventListener('input', (e) => {
      colorPills.forEach(p => p.classList.remove('active'));
      document.getElementById('btnCustomColorPill').classList.add('active');
      activeBgColor = e.target.value;
      activeBgImage = null;
      renderComposite();
    });
  }

  if (btnSelectCustomBg) {
    btnSelectCustomBg.addEventListener('click', () => customBgFileInput.click());
    customBgFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        const bgImg = new Image();
        bgImg.onload = () => {
          activeBgImage = bgImg;
          activeBgColor = 'image';
          colorPills.forEach(p => p.classList.remove('active'));
          renderComposite();
        };
        bgImg.src = URL.createObjectURL(e.target.files[0]);
      }
    });
  }

  // Edge Feathering
  if (edgeSlider) {
    edgeSlider.addEventListener('input', (e) => {
      activeFeather = parseInt(e.target.value, 10);
      edgeVal.textContent = `${activeFeather}px`;
      renderComposite();
    });
  }

  // --- Download Handler ---
  btnDownload.addEventListener('click', () => {
    if (!canvas) return;

    const format = formatSelect.value;
    const ext = format === 'image/png' ? 'png' : (format === 'image/webp' ? 'webp' : 'jpg');
    const quality = format === 'image/png' ? undefined : 0.95;

    const url = canvas.toDataURL(format, quality);
    const a = document.createElement('a');
    a.href = url;
    a.download = `photo_bg_removed.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  // --- Camera Capture Modal ---
  if (btnCamera) {
    btnCamera.addEventListener('click', async () => {
      try {
        cameraModal.classList.add('active');
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        cameraVideo.srcObject = mediaStream;
      } catch (err) {
        alert('Camera access denied or unavailable: ' + err.message);
        cameraModal.classList.remove('active');
      }
    });
  }

  function stopCamera() {
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      mediaStream = null;
    }
    cameraModal.classList.remove('active');
  }

  if (btnCloseCamera) btnCloseCamera.addEventListener('click', stopCamera);

  if (btnSnapPhoto) {
    btnSnapPhoto.addEventListener('click', () => {
      if (!cameraVideo.videoWidth) return;
      const c = document.createElement('canvas');
      c.width = cameraVideo.videoWidth;
      c.height = cameraVideo.videoHeight;
      c.getContext('2d').drawImage(cameraVideo, 0, 0);

      c.toBlob(blob => {
        const file = new File([blob], 'camera_portrait.jpg', { type: 'image/jpeg' });
        stopCamera();
        processPhoto(file);
      }, 'image/jpeg', 0.95);
    });
  }
});
