/**
 * PhotoResize Pro — Image to Text (OCR) Controller
 * Runs Tesseract worker, populates editable text, handles TXT/DOCX/PDF downloads
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const dropzone = document.getElementById('ocrDropzone');
  const fileInput = document.getElementById('ocrFileInput');
  const progressCard = document.getElementById('ocrProgressCard');
  const progressBar = document.getElementById('ocrProgressBar');
  const progressText = document.getElementById('ocrProgressText');
  const workspace = document.getElementById('ocrWorkspace');
  const sourceImg = document.getElementById('ocrSourceImg');
  const extractedText = document.getElementById('ocrExtractedText');
  const confidenceBadge = document.getElementById('ocrConfidenceBadge');

  const langPills = document.querySelectorAll('.preset-btn[data-ocr-lang]');
  const btnCopy = document.getElementById('btnCopyText');
  const btnTxt = document.getElementById('btnDownloadTxt');
  const btnDocx = document.getElementById('btnDownloadDocx');
  const btnPdf = document.getElementById('btnDownloadSearchablePdf');
  const btnAnother = document.getElementById('btnOcrAnother');

  // Camera
  const btnCamera = document.getElementById('btnOcrCamera');
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

  // Dark Mode
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

  let selectedLang = 'eng';
  let loadedFile = null;

  // Language selection
  langPills.forEach(pill => {
    pill.addEventListener('click', () => {
      langPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      selectedLang = pill.dataset.ocrLang;
      if (loadedFile && workspace.style.display !== 'none') {
        runOCR(loadedFile);
      }
    });
  });

  // Upload
  dropzone.addEventListener('click', (e) => {
    if (e.target.closest('#btnOcrCamera')) return;
    fileInput.click();
  });

  ['dragenter', 'dragover'].forEach(n => {
    dropzone.addEventListener(n, (e) => { e.preventDefault(); dropzone.classList.add('drag-active'); });
  });
  ['dragleave', 'drop'].forEach(n => {
    dropzone.addEventListener(n, (e) => { e.preventDefault(); dropzone.classList.remove('drag-active'); });
  });

  dropzone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files && e.dataTransfer.files[0]) runOCR(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) runOCR(e.target.files[0]);
  });

  if (btnAnother) {
    btnAnother.addEventListener('click', () => {
      workspace.style.display = 'none';
      dropzone.style.display = 'block';
      fileInput.click();
    });
  }

  async function runOCR(file) {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG, WebP).');
      return;
    }

    loadedFile = file;
    dropzone.style.display = 'none';
    progressCard.classList.add('active');
    progressBar.style.width = '10%';
    progressText.textContent = 'Initializing Tesseract OCR worker...';

    try {
      sourceImg.src = URL.createObjectURL(file);

      const result = await window.OCREngine.recognizeImage(file, {
        language: selectedLang,
        onProgress: (pct, msg) => {
          progressBar.style.width = `${pct}%`;
          progressText.textContent = msg;
        }
      });

      extractedText.value = result.text.trim();
      const conf = Math.round(result.confidence || 90);
      confidenceBadge.textContent = `Confidence: ${conf}%`;

      progressCard.classList.remove('active');
      workspace.style.display = 'block';
    } catch (err) {
      console.error(err);
      alert('OCR recognition error: ' + err.message);
      progressCard.classList.remove('active');
      dropzone.style.display = 'block';
    }
  }

  // Copy Text
  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      if (!extractedText.value) return;
      navigator.clipboard.writeText(extractedText.value).then(() => {
        const origHtml = btnCopy.innerHTML;
        btnCopy.innerHTML = '<i class="ph-bold ph-check"></i> Copied!';
        setTimeout(() => { btnCopy.innerHTML = origHtml; }, 2000);
      });
    });
  }

  // Export Downloads
  if (btnTxt) {
    btnTxt.addEventListener('click', () => {
      if (!extractedText.value) return;
      window.OCREngine.downloadTXT(extractedText.value, 'ocr_extracted_text.txt');
    });
  }

  if (btnDocx) {
    btnDocx.addEventListener('click', () => {
      if (!extractedText.value) return;
      window.OCREngine.downloadDOCX(extractedText.value, 'ocr_extracted_document.doc');
    });
  }

  if (btnPdf) {
    btnPdf.addEventListener('click', () => {
      if (!extractedText.value) return;
      window.OCREngine.downloadSearchablePDF(extractedText.value, 'searchable_ocr_document.pdf');
    });
  }

  // Camera
  if (btnCamera) {
    btnCamera.addEventListener('click', async () => {
      try {
        cameraModal.classList.add('active');
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
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
        const file = new File([blob], 'camera_text.jpg', { type: 'image/jpeg' });
        stopCamera();
        runOCR(file);
      }, 'image/jpeg', 0.95);
    });
  }
});
