/**
 * PhotoResize Pro — High-Performance Front Page Controller
 * Direct 1-Click Fast Downloads, Interactive Goal Selector, Auto-Download on Process.
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // --- State ---
  const state = {
    file: null,
    image: null,
    originalWidth: 0,
    originalHeight: 0,
    originalSize: 0,
    originalFormat: 'image/jpeg',
    
    // Goal & Preset
    activeGoal: 'reduce-kb',
    
    // File Size Settings
    targetSize: 50,
    unit: 'KB',
    sizeMode: 'max', // 'max' or 'target'
    
    // Dimension Settings
    dimUnit: 'px', // 'px', '%', 'cm', 'mm', 'in'
    dimWidth: 0,
    dimHeight: 0,
    dimPercent: 100,
    dimDpi: 300,
    aspectRatioLocked: true,
    aspectRatio: 1.0,

    // Output Format
    format: 'image/jpeg', // 'image/jpeg', 'image/png', 'image/webp', 'application/pdf'
    jpgQuality: 0.85,
    jpgWhiteBg: true,
    pngPreserveTransparency: true,
    webpQuality: 0.85,
    webpLossless: false,
    
    // PDF Settings
    pdfPageSize: 'a4',
    pdfOrientation: 'portrait',
    pdfMarginMm: 10,
    pdfFitToPage: true,

    // Cropper State
    cropper: null,
    cropModified: false,

    // Processing Result
    isProcessing: false,
    processedBlob: null,
    processedUrl: null,
    processedWidth: 0,
    processedHeight: 0,
    processedSize: 0
  };

  // --- DOM Elements ---
  const mainFileInput = document.getElementById('mainFileInput');
  const uploadCardBox = document.getElementById('uploadCardBox');
  const btnSelectPhoto = document.getElementById('btnSelectPhoto');
  const btnTakePhoto = document.getElementById('btnTakePhoto');

  // Active Photo Card
  const activePhotoCard = document.getElementById('activePhotoCard');
  const activePhotoThumb = document.getElementById('activePhotoThumb');
  const activePhotoName = document.getElementById('activePhotoName');
  const metaOriginalSize = document.getElementById('metaOriginalSize');
  const metaOriginalDim = document.getElementById('metaOriginalDim');
  const metaOriginalFormat = document.getElementById('metaOriginalFormat');
  const btnReplacePhoto = document.getElementById('btnReplacePhoto');
  const btnRemovePhoto = document.getElementById('btnRemovePhoto');

  // 1-Click Fast Download Buttons
  const btnFastDl20kb = document.getElementById('btnFastDl20kb');
  const btnFastDl50kb = document.getElementById('btnFastDl50kb');
  const btnFastDl100kb = document.getElementById('btnFastDl100kb');
  const btnFastDlPdf = document.getElementById('btnFastDlPdf');
  const btnFastDlJpg = document.getElementById('btnFastDlJpg');
  const btnFastDlPng = document.getElementById('btnFastDlPng');

  // Main Editor Card
  const editorSettingsCard = document.getElementById('editorSettingsCard');

  // File Size Elements
  const targetSizeInput = document.getElementById('targetSizeInput');
  const targetUnitSelect = document.getElementById('targetUnitSelect');
  const sizePresetBtns = document.querySelectorAll('.size-preset-chip');
  const sizeModeRadios = document.querySelectorAll('input[name="sizeMode"]');

  // Dimensions Elements
  const unitTabBtns = document.querySelectorAll('.unit-tab-btn');
  const dimWidthInput = document.getElementById('dimWidthInput');
  const dimHeightInput = document.getElementById('dimHeightInput');
  const dimWidthUnitLabel = document.getElementById('dimWidthUnitLabel');
  const dimHeightUnitLabel = document.getElementById('dimHeightUnitLabel');
  const btnToggleRatioLock = document.getElementById('btnToggleRatioLock');
  const ratioLockIcon = document.getElementById('ratioLockIcon');
  const dpiSelectorGroup = document.getElementById('dpiSelectorGroup');
  const dpiSelect = document.getElementById('dpiSelect');
  const calculatedPixelsNote = document.getElementById('calculatedPixelsNote');
  const enlargementAlertBox = document.getElementById('enlargementAlertBox');
  const percentShortcutBtns = document.querySelectorAll('.percent-shortcut-btn');
  const percentShortcutRow = document.getElementById('percentShortcutRow');

  // Format Elements
  const formatCardBtns = document.querySelectorAll('.format-card-btn');
  const optPanelJpg = document.getElementById('optPanelJpg');
  const optPanelPng = document.getElementById('optPanelPng');
  const optPanelWebp = document.getElementById('optPanelWebp');
  const optPanelPdf = document.getElementById('optPanelPdf');
  const jpgQualitySlider = document.getElementById('jpgQualitySlider');
  const jpgQualityVal = document.getElementById('jpgQualityVal');
  const jpgWhiteBgCheck = document.getElementById('jpgWhiteBgCheck');
  const pngTransparencyCheck = document.getElementById('pngTransparencyCheck');
  const webpQualitySlider = document.getElementById('webpQualitySlider');
  const webpQualityVal = document.getElementById('webpQualityVal');
  const webpModeRadios = document.querySelectorAll('input[name="webpMode"]');
  const pdfPageSizeSelect = document.getElementById('pdfPageSizeSelect');
  const pdfOrientationSelect = document.getElementById('pdfOrientationSelect');
  const pdfMarginSelect = document.getElementById('pdfMarginSelect');
  const pdfFitCheck = document.getElementById('pdfFitCheck');

  // Cropper & Edit Elements
  const frontCropCanvas = document.getElementById('frontCropCanvas');
  const cropDetailsSection = document.getElementById('cropDetailsSection');
  const cropRatioBtns = document.querySelectorAll('.crop-ratio-btn');
  const btnCropRotateCCW = document.getElementById('btnCropRotateCCW');
  const btnCropRotateCW = document.getElementById('btnCropRotateCW');
  const btnCropFlipH = document.getElementById('btnCropFlipH');
  const btnCropFlipV = document.getElementById('btnCropFlipV');
  const cropFineRotate = document.getElementById('cropFineRotate');
  const cropFineRotateVal = document.getElementById('cropFineRotateVal');
  const btnCropReset = document.getElementById('btnCropReset');

  // Primary Action Button
  const btnProcessMain = document.getElementById('btnProcessMain');
  const processBtnLabel = document.getElementById('processBtnLabel');
  const processingProgressBar = document.getElementById('processingProgressBar');
  const processingProgressFill = document.getElementById('processingProgressFill');
  const processingProgressText = document.getElementById('processingProgressText');

  // Result Card Elements
  const resultDisplayCard = document.getElementById('resultDisplayCard');
  const resultStatsSummary = document.getElementById('resultStatsSummary');
  const btnDownloadResult = document.getElementById('btnDownloadResult');
  const btnDownloadResultLabel = document.getElementById('btnDownloadResultLabel');
  const btnEditAgain = document.getElementById('btnEditAgain');
  const btnStartNewPhoto = document.getElementById('btnStartNewPhoto');

  // Comparison Elements
  const resCompareContainer = document.getElementById('resCompareContainer');
  const resCompareOrigImg = document.getElementById('resCompareOrigImg');
  const resCompareCompImg = document.getElementById('resCompareCompImg');
  const resCompareSliderLine = document.getElementById('resCompareSliderLine');

  // Camera Modal
  const cameraModal = document.getElementById('cameraModal');
  const cameraVideo = document.getElementById('cameraVideo');
  const btnCloseCamera = document.getElementById('btnCloseCamera');
  const btnCapturePhoto = document.getElementById('btnCapturePhoto');
  const btnSwitchCamera = document.getElementById('btnSwitchCamera');
  let mediaStream = null;
  let currentFacingMode = 'environment';

  // =========================================================================
  // 1. Theme Management (Delegated to window.ThemeManager in i18n.js)
  // =========================================================================
  if (window.ThemeManager) {
    window.ThemeManager.init();
  } else {
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeIcon = document.getElementById('themeIcon');
    const themeText = document.getElementById('themeText');

    function setTheme(t) {
      if (t === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (themeIcon) themeIcon.textContent = '☀️';
        if (themeText) themeText.textContent = 'Light';
        localStorage.setItem('photo_theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
        if (themeIcon) themeIcon.textContent = '🌙';
        if (themeText) themeText.textContent = 'Dark';
        localStorage.setItem('photo_theme', 'light');
      }
    }

    if (themeToggleBtn && !themeToggleBtn.dataset.themeBound) {
      themeToggleBtn.dataset.themeBound = 'true';
      themeToggleBtn.addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        setTheme(isDark ? 'light' : 'dark');
      });
    }

    const saved = localStorage.getItem('photo_theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(saved);
  }

  // Sidebar Mobile Toggle
  const btnToggleSidebar = document.getElementById('btnToggleSidebar');
  const btnCloseSidebar = document.getElementById('btnCloseSidebar');
  const appSidebar = document.getElementById('appSidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');

  function toggleSidebar() {
    if (appSidebar) {
      const isOpen = appSidebar.classList.toggle('drawer-open');
      if (sidebarBackdrop) sidebarBackdrop.classList.toggle('active', isOpen);
    }
  }

  function closeSidebar() {
    if (appSidebar) appSidebar.classList.remove('drawer-open');
    if (sidebarBackdrop) sidebarBackdrop.classList.remove('active');
  }

  if (btnToggleSidebar) btnToggleSidebar.addEventListener('click', toggleSidebar);
  if (btnCloseSidebar) btnCloseSidebar.addEventListener('click', closeSidebar);
  if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeSidebar);

  document.querySelectorAll('.sidebar-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (window.innerWidth <= 900) closeSidebar();
    });
  });

  // =========================================================================
  // 2. Upload & File Handling
  // =========================================================================
  if (btnSelectPhoto) {
    btnSelectPhoto.addEventListener('click', (e) => {
      e.stopPropagation();
      mainFileInput.click();
    });
  }

  if (uploadCardBox) {
    uploadCardBox.addEventListener('click', () => mainFileInput.click());

    ['dragenter', 'dragover'].forEach(name => {
      uploadCardBox.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadCardBox.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      uploadCardBox.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadCardBox.classList.remove('dragover');
      });
    });

    uploadCardBox.addEventListener('drop', (e) => {
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    });
  }

  if (mainFileInput) {
    mainFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
        mainFileInput.value = '';
      }
    });
  }

  // Clipboard Paste (Ctrl+V)
  window.addEventListener('paste', (e) => {
    if (e.clipboardData && e.clipboardData.files.length > 0) {
      const file = Array.from(e.clipboardData.files).find(f => f.type.startsWith('image/'));
      if (file) handleFileSelect(file);
    }
  });

  if (btnReplacePhoto) btnReplacePhoto.addEventListener('click', () => mainFileInput.click());
  if (btnRemovePhoto) btnRemovePhoto.addEventListener('click', resetWorkspace);

  async function handleFileSelect(file) {
    if (!file.type.startsWith('image/') && !/\.(jpe?g|png|webp|bmp|gif|heic|heif)$/i.test(file.name)) {
      alert('Please select a valid image file (JPG, PNG, WebP, etc.).');
      return;
    }

    state.file = file;
    state.originalSize = file.size;
    state.originalFormat = file.type || 'image/jpeg';

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      state.image = img;
      state.originalWidth = img.naturalWidth || img.width;
      state.originalHeight = img.naturalHeight || img.height;
      state.dimWidth = state.originalWidth;
      state.dimHeight = state.originalHeight;
      state.aspectRatio = state.originalWidth / state.originalHeight;

      // Update Active Photo Meta Bar
      activePhotoThumb.src = url;
      activePhotoName.textContent = file.name;
      metaOriginalSize.textContent = ImageCompressor.formatBytes(file.size);
      metaOriginalDim.textContent = `${state.originalWidth} × ${state.originalHeight} px`;
      metaOriginalFormat.textContent = (file.type.split('/')[1] || 'JPG').toUpperCase();

      // Show Photo Card & Settings Card, hide empty upload card
      activePhotoCard.style.display = 'flex';
      editorSettingsCard.style.display = 'flex';
      uploadCardBox.style.display = 'none';
      resultDisplayCard.style.display = 'none';
      switchWorkspaceTab('tab-size');

      // Initialize Dimension Inputs
      dimWidthInput.value = state.dimWidth;
      dimHeightInput.value = state.dimHeight;
      updateCalculatedPixels();
      updateProcessButtonLabel();

      // Initialize Interactive Cropper
      if (window.InteractiveCropper && frontCropCanvas) {
        state.cropper = new InteractiveCropper(frontCropCanvas);
        state.cropper.loadImage(url);
      }

      // Smooth scroll to active photo card
      activePhotoCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };
    img.src = url;
  }

  function resetWorkspace() {
    if (state.processedUrl) URL.revokeObjectURL(state.processedUrl);
    state.file = null;
    state.image = null;
    state.cropper = null;
    state.processedBlob = null;
    state.processedUrl = null;

    activePhotoCard.style.display = 'none';
    editorSettingsCard.style.display = 'none';
    resultDisplayCard.style.display = 'none';
    uploadCardBox.style.display = 'block';

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // =========================================================================
  // 3. Camera Capture
  // =========================================================================
  if (btnTakePhoto) btnTakePhoto.addEventListener('click', openCameraModal);
  if (btnCloseCamera) btnCloseCamera.addEventListener('click', closeCameraModal);

  async function openCameraModal() {
    cameraModal.classList.add('active');
    await startCameraStream();
  }

  async function startCameraStream() {
    try {
      const constraints = {
        video: {
          facingMode: { ideal: currentFacingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };
      mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      cameraVideo.srcObject = mediaStream;
    } catch (err) {
      console.error('Camera stream error', err);
      alert('Could not access device camera. Please check camera permissions in your browser.');
      closeCameraModal();
    }
  }

  function stopCameraStream() {
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      mediaStream = null;
    }
  }

  function closeCameraModal() {
    stopCameraStream();
    cameraModal.classList.remove('active');
  }

  if (btnSwitchCamera) {
    btnSwitchCamera.addEventListener('click', () => {
      currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
      stopCameraStream();
      startCameraStream();
    });
  }

  if (btnCapturePhoto) {
    btnCapturePhoto.addEventListener('click', () => {
      if (!cameraVideo.videoWidth) return;
      const c = document.createElement('canvas');
      c.width = cameraVideo.videoWidth;
      c.height = cameraVideo.videoHeight;
      const ctx = c.getContext('2d');
      ctx.drawImage(cameraVideo, 0, 0, c.width, c.height);

      c.toBlob((blob) => {
        if (blob) {
          const snapFile = new File([blob], `camera-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
          closeCameraModal();
          handleFileSelect(snapFile);
        }
      }, 'image/jpeg', 0.95);
    });
  }

  // =========================================================================
  // 4. Horizontal Scrollable Workspace Tabs (Size, Format, Crop, Dimensions)
  // =========================================================================
  const wsTabBtns = document.querySelectorAll('.ws-tab-btn');
  const wsTabPanes = document.querySelectorAll('.ws-tab-pane');

  function switchWorkspaceTab(tabId) {
    wsTabBtns.forEach(btn => {
      const isTarget = btn.dataset.tab === tabId;
      btn.classList.toggle('active', isTarget);
      btn.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    });

    wsTabPanes.forEach(pane => {
      if (pane.id === tabId) {
        pane.style.display = 'block';
      } else {
        pane.style.display = 'none';
      }
    });

    if (tabId === 'tab-crop' && state.cropper) {
      setTimeout(() => {
        if (state.cropper && state.cropper.render) state.cropper.render();
      }, 50);
    }
  }

  wsTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      switchWorkspaceTab(btn.dataset.tab);
    });
  });

  // =========================================================================
  // 5. DIRECT 1-CLICK FAST DOWNLOAD PRESETS
  // =========================================================================
  async function triggerDirectDownload(presetOptions) {
    if (!state.image) {
      mainFileInput.click();
      return;
    }

    const { targetKB, format, unit = 'KB' } = presetOptions;
    btnProcessMain.disabled = true;
    processingProgressBar.style.display = 'block';
    processingProgressFill.style.width = '20%';
    processingProgressText.textContent = `Instant Download: Preparing ${format.split('/')[1] || 'image'} (${targetKB ? targetKB + ' ' + unit : 'Original'})...`;

    try {
      let canvas = null;
      if (state.cropper) {
        canvas = state.cropper.getCroppedCanvas({ maxWidth: 2400 });
      }
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.width = state.originalWidth;
        canvas.height = state.originalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(state.image, 0, 0);
      }

      processingProgressFill.style.width = '60%';

      let blob = null;
      let filenameExt = '.jpg';

      if (format === 'application/pdf') {
        if (!window.jspdf || !window.jspdf.jsPDF) {
          await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
        }
        const doc = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const ratio = canvas.width / canvas.height;
        const availW = pageW - 20;
        let drawW = availW;
        let drawH = drawW / ratio;
        if (drawH > pageH - 20) {
          drawH = pageH - 20;
          drawW = drawH * ratio;
        }
        doc.addImage(imgData, 'JPEG', 10, 10, drawW, drawH);
        blob = doc.output('blob');
        filenameExt = '.pdf';

      } else if (format === 'image/png') {
        blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
        filenameExt = '.png';

      } else {
        // JPEG
        let tKB = targetKB || 100;
        if (unit === 'MB') tKB = (targetKB || 1) * 1024;
        else if (unit === 'GB') tKB = (targetKB || 1) * 1024 * 1024;

        const tempBlob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.98));
        const tempFile = new File([tempBlob], 'temp.jpg', { type: 'image/jpeg' });

        const res = await ImageCompressor.compressImage(tempFile, {
          targetKB: tKB,
          format: 'image/jpeg',
          strictUnder: true,
          allowIncrease: true,
          targetExact: true
        });
        blob = res.blob;
        filenameExt = '.jpg';
      }

      processingProgressFill.style.width = '100%';
      processingProgressText.textContent = 'Ready! Downloading now...';

      // Immediate Download Trigger!
      const base = state.file ? state.file.name.replace(/\.[^/.]+$/, '') : 'photo';
      const label = targetKB ? `_${targetKB}${unit}` : '';
      const filename = `${base}_resized${label}${filenameExt}`;

      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = dlUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Also display result card
      state.processedBlob = blob;
      state.processedUrl = dlUrl;
      state.processedSize = blob.size;
      state.processedWidth = canvas.width;
      state.processedHeight = canvas.height;
      displayResultCard();

    } catch (err) {
      console.error(err);
      alert('Error during instant download: ' + err.message);
    } finally {
      setTimeout(() => {
        processingProgressBar.style.display = 'none';
        btnProcessMain.disabled = false;
      }, 500);
    }
  }

  if (btnFastDl20kb) btnFastDl20kb.addEventListener('click', () => triggerDirectDownload({ targetKB: 20, format: 'image/jpeg', unit: 'KB' }));
  if (btnFastDl50kb) btnFastDl50kb.addEventListener('click', () => triggerDirectDownload({ targetKB: 50, format: 'image/jpeg', unit: 'KB' }));
  if (btnFastDl100kb) btnFastDl100kb.addEventListener('click', () => triggerDirectDownload({ targetKB: 100, format: 'image/jpeg', unit: 'KB' }));
  if (btnFastDlPdf) btnFastDlPdf.addEventListener('click', () => triggerDirectDownload({ format: 'application/pdf' }));
  if (btnFastDlJpg) btnFastDlJpg.addEventListener('click', () => triggerDirectDownload({ targetKB: state.targetSize || 100, format: 'image/jpeg' }));
  if (btnFastDlPng) btnFastDlPng.addEventListener('click', () => triggerDirectDownload({ format: 'image/png' }));

  // =========================================================================
  // 6. File Size Controls
  // =========================================================================
  function setTargetSize(val, unit = 'KB') {
    state.targetSize = parseFloat(val) || 50;
    state.unit = unit;
    if (targetSizeInput) targetSizeInput.value = state.targetSize;
    if (targetUnitSelect) targetUnitSelect.value = state.unit;
    highlightMatchingSizePreset();
    updateProcessButtonLabel();
  }

  function highlightMatchingSizePreset() {
    sizePresetBtns.forEach(btn => {
      const s = parseFloat(btn.dataset.size);
      const u = btn.dataset.unit;
      btn.classList.toggle('active', s === state.targetSize && u === state.unit);
    });
  }

  if (targetSizeInput) {
    targetSizeInput.addEventListener('input', () => {
      let v = parseFloat(targetSizeInput.value);
      if (isNaN(v) || v <= 0) v = 50;
      state.targetSize = v;
      highlightMatchingSizePreset();
      updateProcessButtonLabel();
    });
  }

  if (targetUnitSelect) {
    targetUnitSelect.addEventListener('change', () => {
      state.unit = targetUnitSelect.value;
      highlightMatchingSizePreset();
      updateProcessButtonLabel();
    });
  }

  sizePresetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const s = parseFloat(btn.dataset.size);
      const u = btn.dataset.unit;
      setTargetSize(s, u);
    });
  });

  sizeModeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      state.sizeMode = radio.value;
    });
  });

  // =========================================================================
  // 7. Dimension Settings & Calculation
  // =========================================================================
  unitTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      unitTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setDimensionUnit(btn.dataset.unit);
    });
  });

  function setDimensionUnit(unit) {
    state.dimUnit = unit;
    dimWidthUnitLabel.textContent = unit;
    dimHeightUnitLabel.textContent = unit;

    const isPhysical = (unit === 'cm' || unit === 'mm' || unit === 'in');
    dpiSelectorGroup.style.display = isPhysical ? 'flex' : 'none';
    percentShortcutRow.style.display = (unit === '%') ? 'flex' : 'none';

    if (unit === 'px') {
      dimWidthInput.value = Math.round(state.dimWidth || state.originalWidth);
      dimHeightInput.value = Math.round(state.dimHeight || state.originalHeight);
    } else if (unit === '%') {
      dimWidthInput.value = 100;
      dimHeightInput.value = 100;
    } else if (unit === 'in') {
      dimWidthInput.value = ((state.dimWidth || state.originalWidth) / state.dimDpi).toFixed(2);
      dimHeightInput.value = ((state.dimHeight || state.originalHeight) / state.dimDpi).toFixed(2);
    } else if (unit === 'cm') {
      dimWidthInput.value = (((state.dimWidth || state.originalWidth) / state.dimDpi) * 2.54).toFixed(2);
      dimHeightInput.value = (((state.dimHeight || state.originalHeight) / state.dimDpi) * 2.54).toFixed(2);
    } else if (unit === 'mm') {
      dimWidthInput.value = (((state.dimWidth || state.originalWidth) / state.dimDpi) * 25.4).toFixed(1);
      dimHeightInput.value = (((state.dimHeight || state.originalHeight) / state.dimDpi) * 25.4).toFixed(1);
    }

    updateCalculatedPixels();
  }

  if (btnToggleRatioLock) {
    btnToggleRatioLock.addEventListener('click', () => {
      state.aspectRatioLocked = !state.aspectRatioLocked;
      btnToggleRatioLock.classList.toggle('locked', state.aspectRatioLocked);
      if (ratioLockIcon) {
        ratioLockIcon.className = state.aspectRatioLocked ? 'ph-bold ph-lock' : 'ph-bold ph-lock-simple-open';
      }
    });
  }

  if (dimWidthInput) {
    dimWidthInput.addEventListener('input', () => {
      const wVal = parseFloat(dimWidthInput.value);
      if (state.aspectRatioLocked && !isNaN(wVal) && state.aspectRatio) {
        dimHeightInput.value = (wVal / state.aspectRatio).toFixed(state.dimUnit === 'px' ? 0 : 2);
      }
      updateCalculatedPixels();
    });
  }

  if (dimHeightInput) {
    dimHeightInput.addEventListener('input', () => {
      const hVal = parseFloat(dimHeightInput.value);
      if (state.aspectRatioLocked && !isNaN(hVal) && state.aspectRatio) {
        dimWidthInput.value = (hVal * state.aspectRatio).toFixed(state.dimUnit === 'px' ? 0 : 2);
      }
      updateCalculatedPixels();
    });
  }

  if (dpiSelect) {
    dpiSelect.addEventListener('change', () => {
      state.dimDpi = parseInt(dpiSelect.value, 10) || 300;
      updateCalculatedPixels();
    });
  }

  percentShortcutBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      percentShortcutBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const pct = parseFloat(btn.dataset.percent);
      dimWidthInput.value = pct;
      dimHeightInput.value = pct;
      updateCalculatedPixels();
    });
  });

  function getCalculatedPixels() {
    const wVal = parseFloat(dimWidthInput.value) || 0;
    const hVal = parseFloat(dimHeightInput.value) || 0;

    let pxW = wVal;
    let pxH = hVal;

    if (state.dimUnit === '%') {
      pxW = Math.round((state.originalWidth * wVal) / 100);
      pxH = Math.round((state.originalHeight * hVal) / 100);
    } else if (state.dimUnit === 'in') {
      pxW = Math.round(wVal * state.dimDpi);
      pxH = Math.round(hVal * state.dimDpi);
    } else if (state.dimUnit === 'cm') {
      pxW = Math.round((wVal / 2.54) * state.dimDpi);
      pxH = Math.round((hVal / 2.54) * state.dimDpi);
    } else if (state.dimUnit === 'mm') {
      pxW = Math.round((wVal / 25.4) * state.dimDpi);
      pxH = Math.round((hVal / 25.4) * state.dimDpi);
    }

    return { pxW: Math.max(1, pxW), pxH: Math.max(1, pxH) };
  }

  function updateCalculatedPixels() {
    const { pxW, pxH } = getCalculatedPixels();
    state.dimWidth = pxW;
    state.dimHeight = pxH;

    if (calculatedPixelsNote) {
      calculatedPixelsNote.textContent = `Result: ${pxW} × ${pxH} px (Aspect ${((pxW / pxH) || 1).toFixed(2)}:1)`;
    }

    if (enlargementAlertBox) {
      enlargementAlertBox.style.display = (pxW > state.originalWidth || pxH > state.originalHeight) ? 'flex' : 'none';
    }
  }

  // =========================================================================
  // 8. Output Format Selector (JPG, PNG, WebP, PDF)
  // =========================================================================
  formatCardBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      setFormat(btn.dataset.format);
    });
  });

  function setFormat(fmt) {
    state.format = fmt;
    formatCardBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.format === fmt);
    });

    optPanelJpg.style.display = (fmt === 'image/jpeg') ? 'block' : 'none';
    optPanelPng.style.display = (fmt === 'image/png') ? 'block' : 'none';
    optPanelWebp.style.display = (fmt === 'image/webp') ? 'block' : 'none';
    optPanelPdf.style.display = (fmt === 'application/pdf') ? 'block' : 'none';

    updateProcessButtonLabel();
  }

  function updateProcessButtonLabel() {
    if (!processBtnLabel) return;
    if (state.format === 'application/pdf') {
      processBtnLabel.innerHTML = '⚡ PDF में बदलें व डाउनलोड करें (CREATE &amp; DOWNLOAD PDF)';
    } else {
      const ext = state.format === 'image/png' ? 'PNG' : (state.format === 'image/webp' ? 'WebP' : 'JPG');
      processBtnLabel.innerHTML = `⬇️ अभी डाउनलोड करें (PROCESS &amp; DOWNLOAD NOW — ${state.targetSize} ${state.unit} ${ext})`;
    }
  }

  if (jpgQualitySlider && jpgQualityVal) {
    jpgQualitySlider.addEventListener('input', (e) => {
      const q = parseInt(e.target.value, 10);
      jpgQualityVal.textContent = `${q}%`;
      state.jpgQuality = q / 100;
    });
  }

  if (jpgWhiteBgCheck) jpgWhiteBgCheck.addEventListener('change', (e) => state.jpgWhiteBg = e.target.checked);
  if (pngTransparencyCheck) pngTransparencyCheck.addEventListener('change', (e) => state.pngPreserveTransparency = e.target.checked);

  if (webpQualitySlider && webpQualityVal) {
    webpQualitySlider.addEventListener('input', (e) => {
      const q = parseInt(e.target.value, 10);
      webpQualityVal.textContent = `${q}%`;
      state.webpQuality = q / 100;
    });
  }

  webpModeRadios.forEach(r => r.addEventListener('change', () => state.webpLossless = r.value === 'lossless'));

  if (pdfPageSizeSelect) pdfPageSizeSelect.addEventListener('change', () => state.pdfPageSize = pdfPageSizeSelect.value);
  if (pdfOrientationSelect) pdfOrientationSelect.addEventListener('change', () => state.pdfOrientation = pdfOrientationSelect.value);
  if (pdfMarginSelect) pdfMarginSelect.addEventListener('change', () => state.pdfMarginMm = parseInt(pdfMarginSelect.value, 10));
  if (pdfFitCheck) pdfFitCheck.addEventListener('change', (e) => state.pdfFitToPage = e.target.checked);

  // =========================================================================
  // 9. Smart Cropping & Editing Controls
  // =========================================================================
  cropRatioBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      cropRatioBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const r = btn.dataset.ratio;
      if (state.cropper) {
        state.cropper.setAspectRatio(r === 'free' ? null : parseFloat(r));
        state.cropModified = true;
      }
    });
  });

  if (btnCropRotateCCW) btnCropRotateCCW.addEventListener('click', () => state.cropper && state.cropper.rotate90(false));
  if (btnCropRotateCW) btnCropRotateCW.addEventListener('click', () => state.cropper && state.cropper.rotate90(true));
  if (btnCropFlipH) btnCropFlipH.addEventListener('click', () => state.cropper && state.cropper.toggleFlipH());
  if (btnCropFlipV) btnCropFlipV.addEventListener('click', () => state.cropper && state.cropper.toggleFlipV());

  if (cropFineRotate && cropFineRotateVal) {
    cropFineRotate.addEventListener('input', (e) => {
      const deg = parseFloat(e.target.value);
      cropFineRotateVal.textContent = `${deg > 0 ? '+' : ''}${deg}°`;
      if (state.cropper) state.cropper.setFineRotation(deg);
    });
  }

  if (btnCropReset) {
    btnCropReset.addEventListener('click', () => {
      if (state.cropper) {
        state.cropper.resetTransform();
        if (cropFineRotate) cropFineRotate.value = 0;
        if (cropFineRotateVal) cropFineRotateVal.textContent = '0°';
      }
    });
  }

  // =========================================================================
  // 10. Primary Action: Process Image & Direct Download
  // =========================================================================
  if (btnProcessMain) {
    btnProcessMain.addEventListener('click', async () => {
      if (!state.image || state.isProcessing) return;

      state.isProcessing = true;
      btnProcessMain.disabled = true;
      processingProgressBar.style.display = 'block';
      processingProgressFill.style.width = '15%';
      processingProgressText.textContent = 'Applying crop, transform & dimensions...';

      try {
        let workingCanvas = null;
        if (state.cropper) {
          workingCanvas = state.cropper.getCroppedCanvas({ maxWidth: 3000 });
        }
        if (!workingCanvas) {
          workingCanvas = document.createElement('canvas');
          workingCanvas.width = state.originalWidth;
          workingCanvas.height = state.originalHeight;
          const ctx = workingCanvas.getContext('2d');
          ctx.drawImage(state.image, 0, 0);
        }

        processingProgressFill.style.width = '40%';
        processingProgressText.textContent = 'Scaling pixels & setting aspect ratio...';

        const { pxW, pxH } = getCalculatedPixels();
        const scaledCanvas = document.createElement('canvas');
        scaledCanvas.width = pxW;
        scaledCanvas.height = pxH;
        const sCtx = scaledCanvas.getContext('2d', { alpha: state.format !== 'image/jpeg' });
        sCtx.imageSmoothingEnabled = true;
        sCtx.imageSmoothingQuality = 'high';

        if (state.format === 'image/jpeg' && state.jpgWhiteBg) {
          sCtx.fillStyle = '#FFFFFF';
          sCtx.fillRect(0, 0, pxW, pxH);
        }
        sCtx.drawImage(workingCanvas, 0, 0, pxW, pxH);

        processingProgressFill.style.width = '70%';
        processingProgressText.textContent = `Optimizing compression for ${state.format.split('/')[1] || 'output'}...`;

        let outBlob = null;
        let ext = '.jpg';

        if (state.format === 'application/pdf') {
          if (!window.jspdf || !window.jspdf.jsPDF) {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
          }
          const doc = new window.jspdf.jsPDF({
            orientation: state.pdfOrientation,
            unit: 'mm',
            format: state.pdfPageSize === 'fit' ? [pxW * 0.264583, pxH * 0.264583] : state.pdfPageSize
          });

          const pageW = doc.internal.pageSize.getWidth();
          const pageH = doc.internal.pageSize.getHeight();
          const margin = state.pdfPageSize === 'fit' ? 0 : state.pdfMarginMm;

          const availW = Math.max(10, pageW - margin * 2);
          const availH = Math.max(10, pageH - margin * 2);
          const imgRatio = pxW / pxH;

          let drawW = availW;
          let drawH = drawW / imgRatio;
          if (drawH > availH) {
            drawH = availH;
            drawW = drawH * imgRatio;
          }

          const posX = margin + (availW - drawW) / 2;
          const posY = margin + (availH - drawH) / 2;
          const imgData = scaledCanvas.toDataURL('image/jpeg', 0.92);
          doc.addImage(imgData, 'JPEG', posX, posY, drawW, drawH);
          outBlob = doc.output('blob');
          ext = '.pdf';

        } else if (state.format === 'image/png') {
          outBlob = await new Promise(r => scaledCanvas.toBlob(r, 'image/png'));
          ext = '.png';

        } else {
          // JPEG / WebP Precision Compression
          let targetKB = state.targetSize;
          if (state.unit === 'MB') targetKB = state.targetSize * 1024;
          else if (state.unit === 'GB') targetKB = state.targetSize * 1024 * 1024;

          const tempBlob = await new Promise(r => scaledCanvas.toBlob(r, state.format, 0.98));
          const tempFile = new File([tempBlob], 'temp', { type: state.format });

          const compressResult = await ImageCompressor.compressImage(tempFile, {
            targetKB,
            format: state.format,
            strictUnder: state.sizeMode === 'max',
            allowIncrease: true,
            targetExact: true,
            onProgress: (pct, msg) => {
              processingProgressFill.style.width = `${70 + Math.round((pct / 100) * 25)}%`;
              processingProgressText.textContent = msg;
            }
          });

          outBlob = compressResult.blob;
          ext = state.format === 'image/webp' ? '.webp' : '.jpg';
        }

        processingProgressFill.style.width = '100%';
        processingProgressText.textContent = 'Completed! Starting direct download...';

        state.processedBlob = outBlob;
        if (state.processedUrl) URL.revokeObjectURL(state.processedUrl);
        state.processedUrl = URL.createObjectURL(outBlob);
        state.processedWidth = pxW;
        state.processedHeight = pxH;
        state.processedSize = outBlob.size;

        // DIRECT AUTOMATIC DOWNLOAD TRIGGER: No waiting, instant download!
        const baseName = state.file ? state.file.name.replace(/\.[^/.]+$/, '') : 'photo';
        const filename = `${baseName}_resized_${state.targetSize}${state.unit}${ext}`;
        const a = document.createElement('a');
        a.href = state.processedUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Display Result Card with comparison and re-download options
        displayResultCard();

      } catch (err) {
        console.error('Processing failed', err);
        alert('An error occurred during processing: ' + err.message);
      } finally {
        setTimeout(() => {
          processingProgressBar.style.display = 'none';
          btnProcessMain.disabled = false;
          state.isProcessing = false;
        }, 500);
      }
    });
  }

  function displayResultCard() {
    resultDisplayCard.style.display = 'flex';

    const origKB = ImageCompressor.formatBytes(state.originalSize);
    const compKB = ImageCompressor.formatBytes(state.processedSize);
    let diffText = '';

    if (state.processedSize < state.originalSize) {
      const pct = Math.round(((state.originalSize - state.processedSize) / state.originalSize) * 100);
      diffText = `<span class="saved-pill" style="background: rgba(16, 185, 129, 0.15); color: #059669; padding: 0.25rem 0.75rem; border-radius: 9999px; font-weight:800;">${pct}% Saved</span>`;
    }

    resultStatsSummary.innerHTML = `
      <span style="color: var(--text-muted);">Original: <strong>${origKB}</strong> (${state.originalWidth}×${state.originalHeight}px)</span>
      <span style="color: #10b981;">➔</span>
      <span>Output: <strong style="color: #059669;">${compKB}</strong> (${state.processedWidth}×${state.processedHeight}px)</span>
      ${diffText}
    `;

    const ext = state.format === 'application/pdf' ? 'PDF' : (state.format.split('/')[1] || 'Image').toUpperCase();
    btnDownloadResultLabel.textContent = `Download Again (${ext} - ${compKB})`;

    if (state.format !== 'application/pdf') {
      resCompareContainer.style.display = 'block';
      resCompareOrigImg.src = state.cropper ? state.cropper.canvas.toDataURL() : state.image.src;
      resCompareCompImg.src = state.processedUrl;
      setSliderPosition(50);
    } else {
      resCompareContainer.style.display = 'none';
    }

    resultDisplayCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // =========================================================================
  // 11. Re-Download & Action Handlers
  // =========================================================================
  if (btnDownloadResult) {
    btnDownloadResult.addEventListener('click', () => {
      if (!state.processedBlob || !state.processedUrl) return;

      const baseName = state.file ? state.file.name.replace(/\.[^/.]+$/, '') : 'photo';
      let ext = '.jpg';
      if (state.format === 'image/png') ext = '.png';
      else if (state.format === 'image/webp') ext = '.webp';
      else if (state.format === 'application/pdf') ext = '.pdf';

      const filename = `${baseName}_resized_${state.targetSize}${state.unit}${ext}`;
      const a = document.createElement('a');
      a.href = state.processedUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }

  if (btnEditAgain) {
    btnEditAgain.addEventListener('click', () => {
      editorSettingsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  if (btnStartNewPhoto) {
    btnStartNewPhoto.addEventListener('click', resetWorkspace);
  }

  function setSliderPosition(percent) {
    percent = Math.max(0, Math.min(100, percent));
    resCompareSliderLine.style.left = percent + '%';
    resCompareOrigImg.style.clipPath = `polygon(0 0, ${percent}% 0, ${percent}% 100%, 0 100%)`;
  }

  let isDraggingSlider = false;
  if (resCompareContainer) {
    const handleMove = (e) => {
      if (!isDraggingSlider) return;
      const rect = resCompareContainer.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const x = clientX - rect.left;
      setSliderPosition((x / rect.width) * 100);
    };

    resCompareContainer.addEventListener('mousedown', (e) => {
      isDraggingSlider = true;
      handleMove(e);
    });
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', () => { isDraggingSlider = false; });

    resCompareContainer.addEventListener('touchstart', (e) => {
      isDraggingSlider = true;
      handleMove(e);
    });
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', () => { isDraggingSlider = false; });
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

});
