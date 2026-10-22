/**
 * PhotoResize Pro — Modern Front Page Application Controller
 * Handles image selection, camera capture, presets, file size compression,
 * dimension resizing, format selection (JPG/PNG/WebP/PDF), cropping, and instant download.
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // --- Application State ---
  const state = {
    file: null,
    image: null,
    originalWidth: 0,
    originalHeight: 0,
    originalSize: 0,
    originalFormat: 'image/jpeg',
    
    // File Size Settings
    targetSize: 50,
    unit: 'KB',
    sizeMode: 'max', // 'max' (Strict under limit) or 'target' (Exact target)
    
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
    pdfPageSize: 'a4', // 'a4', 'letter', 'fit'
    pdfOrientation: 'portrait', // 'portrait', 'landscape'
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

  // Main Editor Card
  const editorSettingsCard = document.getElementById('editorSettingsCard');

  // Presets
  const presetChips = document.querySelectorAll('.preset-chip-btn');

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
  const cropRatioBtns = document.querySelectorAll('.crop-ratio-btn');
  const btnCropRotateCCW = document.getElementById('btnCropRotateCCW');
  const btnCropRotateCW = document.getElementById('btnCropRotateCW');
  const btnCropFlipH = document.getElementById('btnCropFlipH');
  const btnCropFlipV = document.getElementById('btnCropFlipV');
  const cropFineRotate = document.getElementById('cropFineRotate');
  const cropFineRotateVal = document.getElementById('cropFineRotateVal');
  const btnCropReset = document.getElementById('btnCropReset');

  // Process CTA
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

  // Camera Modal Elements
  const cameraModal = document.getElementById('cameraModal');
  const cameraVideo = document.getElementById('cameraVideo');
  const btnCloseCamera = document.getElementById('btnCloseCamera');
  const btnCapturePhoto = document.getElementById('btnCapturePhoto');
  const btnSwitchCamera = document.getElementById('btnSwitchCamera');
  let mediaStream = null;
  let currentFacingMode = 'environment';

  // Theme Toggle
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIcon = document.getElementById('themeIcon');
  const themeText = document.getElementById('themeText');

  // =========================================================================
  // 1. Theme & Localization
  // =========================================================================
  function initTheme() {
    const saved = localStorage.getItem('photo_theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(saved);
  }

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

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      setTheme(isDark ? 'light' : 'dark');
    });
  }

  initTheme();

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

      // Initialize Dimension Inputs
      dimWidthInput.value = state.dimWidth;
      dimHeightInput.value = state.dimHeight;
      updateCalculatedPixels();

      // Initialize Interactive Cropper
      if (window.InteractiveCropper && frontCropCanvas) {
        state.cropper = new InteractiveCropper(frontCropCanvas);
        state.cropper.loadImage(url);
      }

      // Smooth scroll to settings
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
  // 4. Quick Presets (Passport, Signature, Govt, etc.)
  // =========================================================================
  presetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      presetChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      const preset = chip.dataset.preset;
      applyPresetConfig(preset);
    });
  });

  function applyPresetConfig(preset) {
    switch (preset) {
      case 'passport':
        setTargetSize(50, 'KB');
        setFormat('image/jpeg');
        setDimensionUnit('cm');
        dimWidthInput.value = '3.5';
        dimHeightInput.value = '4.5';
        state.dimDpi = 300;
        if (dpiSelect) dpiSelect.value = '300';
        updateCalculatedPixels();
        if (state.cropper) state.cropper.setAspectRatio(3.5 / 4.5);
        break;

      case 'signature':
        setTargetSize(20, 'KB');
        setFormat('image/jpeg');
        setDimensionUnit('px');
        dimWidthInput.value = '280';
        dimHeightInput.value = '120';
        updateCalculatedPixels();
        if (state.cropper) state.cropper.setAspectRatio(280 / 120);
        break;

      case 'govt':
        setTargetSize(50, 'KB');
        setFormat('image/jpeg');
        setDimensionUnit('px');
        dimWidthInput.value = '800';
        dimHeightInput.value = '1000';
        updateCalculatedPixels();
        break;

      case 'aadhaar':
        setTargetSize(100, 'KB');
        setFormat('image/jpeg');
        setDimensionUnit('px');
        dimWidthInput.value = '1200';
        dimHeightInput.value = '1600';
        updateCalculatedPixels();
        break;

      case 'job':
        setTargetSize(100, 'KB');
        setFormat('image/jpeg');
        setDimensionUnit('px');
        dimWidthInput.value = '600';
        dimHeightInput.value = '800';
        updateCalculatedPixels();
        break;

      case 'college':
        setTargetSize(200, 'KB');
        setFormat('image/jpeg');
        setDimensionUnit('px');
        dimWidthInput.value = '800';
        dimHeightInput.value = '1000';
        updateCalculatedPixels();
        break;

      default:
        // Custom
        setTargetSize(100, 'KB');
        break;
    }
  }

  // =========================================================================
  // 5. File Size Controls
  // =========================================================================
  function setTargetSize(val, unit = 'KB') {
    state.targetSize = parseFloat(val) || 50;
    state.unit = unit;
    if (targetSizeInput) targetSizeInput.value = state.targetSize;
    if (targetUnitSelect) targetUnitSelect.value = state.unit;
    highlightMatchingSizePreset();
  }

  function highlightMatchingSizePreset() {
    sizePresetBtns.forEach(btn => {
      const s = parseFloat(btn.dataset.size);
      const u = btn.dataset.unit;
      if (s === state.targetSize && u === state.unit) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  if (targetSizeInput) {
    targetSizeInput.addEventListener('input', () => {
      let v = parseFloat(targetSizeInput.value);
      if (isNaN(v) || v <= 0) v = 50;
      state.targetSize = v;
      highlightMatchingSizePreset();
    });
  }

  if (targetUnitSelect) {
    targetUnitSelect.addEventListener('change', () => {
      state.unit = targetUnitSelect.value;
      highlightMatchingSizePreset();
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
  // 6. Dimension Settings & Calculation
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

    // Recalculate input values into the selected unit
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

  // Aspect ratio lock toggle
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

    // Check enlargement warning
    if (pxW > state.originalWidth || pxH > state.originalHeight) {
      enlargementAlertBox.style.display = 'flex';
    } else {
      enlargementAlertBox.style.display = 'none';
    }
  }

  // =========================================================================
  // 7. Output Format Selector (JPG, PNG, WebP, PDF)
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

    // Toggle format-specific panels
    optPanelJpg.style.display = (fmt === 'image/jpeg') ? 'block' : 'none';
    optPanelPng.style.display = (fmt === 'image/png') ? 'block' : 'none';
    optPanelWebp.style.display = (fmt === 'image/webp') ? 'block' : 'none';
    optPanelPdf.style.display = (fmt === 'application/pdf') ? 'block' : 'none';

    // Update process button label
    if (processBtnLabel) {
      processBtnLabel.textContent = fmt === 'application/pdf' ? 'Process & Create PDF' : 'Process Image & Download';
    }
  }

  if (jpgQualitySlider && jpgQualityVal) {
    jpgQualitySlider.addEventListener('input', (e) => {
      const q = parseInt(e.target.value, 10);
      jpgQualityVal.textContent = `${q}%`;
      state.jpgQuality = q / 100;
    });
  }

  if (jpgWhiteBgCheck) {
    jpgWhiteBgCheck.addEventListener('change', (e) => {
      state.jpgWhiteBg = e.target.checked;
    });
  }

  if (pngTransparencyCheck) {
    pngTransparencyCheck.addEventListener('change', (e) => {
      state.pngPreserveTransparency = e.target.checked;
    });
  }

  if (webpQualitySlider && webpQualityVal) {
    webpQualitySlider.addEventListener('input', (e) => {
      const q = parseInt(e.target.value, 10);
      webpQualityVal.textContent = `${q}%`;
      state.webpQuality = q / 100;
    });
  }

  webpModeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      state.webpLossless = radio.value === 'lossless';
    });
  });

  if (pdfPageSizeSelect) {
    pdfPageSizeSelect.addEventListener('change', () => {
      state.pdfPageSize = pdfPageSizeSelect.value;
    });
  }

  if (pdfOrientationSelect) {
    pdfOrientationSelect.addEventListener('change', () => {
      state.pdfOrientation = pdfOrientationSelect.value;
    });
  }

  if (pdfMarginSelect) {
    pdfMarginSelect.addEventListener('change', () => {
      state.pdfMarginMm = parseInt(pdfMarginSelect.value, 10);
    });
  }

  if (pdfFitCheck) {
    pdfFitCheck.addEventListener('change', (e) => {
      state.pdfFitToPage = e.target.checked;
    });
  }

  // =========================================================================
  // 8. Smart Cropping & Editing Controls
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

  if (btnCropRotateCCW) {
    btnCropRotateCCW.addEventListener('click', () => {
      if (state.cropper) {
        state.cropper.rotate90(false);
        state.cropModified = true;
      }
    });
  }

  if (btnCropRotateCW) {
    btnCropRotateCW.addEventListener('click', () => {
      if (state.cropper) {
        state.cropper.rotate90(true);
        state.cropModified = true;
      }
    });
  }

  if (btnCropFlipH) {
    btnCropFlipH.addEventListener('click', () => {
      if (state.cropper) {
        state.cropper.toggleFlipH();
        state.cropModified = true;
      }
    });
  }

  if (btnCropFlipV) {
    btnCropFlipV.addEventListener('click', () => {
      if (state.cropper) {
        state.cropper.toggleFlipV();
        state.cropModified = true;
      }
    });
  }

  if (cropFineRotate && cropFineRotateVal) {
    cropFineRotate.addEventListener('input', (e) => {
      const deg = parseFloat(e.target.value);
      cropFineRotateVal.textContent = `${deg > 0 ? '+' : ''}${deg}°`;
      if (state.cropper) {
        state.cropper.setFineRotation(deg);
        state.cropModified = true;
      }
    });
  }

  if (btnCropReset) {
    btnCropReset.addEventListener('click', () => {
      if (state.cropper) {
        state.cropper.resetTransform();
        state.cropModified = false;
        if (cropFineRotate) cropFineRotate.value = 0;
        if (cropFineRotateVal) cropFineRotateVal.textContent = '0°';
      }
    });
  }

  // =========================================================================
  // 9. Primary Action: Process Image & Download
  // =========================================================================
  if (btnProcessMain) {
    btnProcessMain.addEventListener('click', async () => {
      if (!state.image || state.isProcessing) return;

      state.isProcessing = true;
      btnProcessMain.disabled = true;
      processingProgressBar.style.display = 'block';
      processingProgressFill.style.width = '10%';
      processingProgressText.textContent = 'Validating settings & preparing photo...';

      try {
        // Step 1: Extract cropped canvas or use original image
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

        processingProgressFill.style.width = '35%';
        processingProgressText.textContent = 'Resizing dimensions to specified width and height...';

        // Step 2: Scale to specified dimensions
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

        processingProgressFill.style.width = '65%';
        processingProgressText.textContent = `Optimizing compression and encoding ${state.format.split('/')[1] || 'output'}...`;

        // Step 3: Handle Format & Compression
        let outBlob = null;

        if (state.format === 'application/pdf') {
          // --- PDF Generation via jsPDF ---
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

        } else if (state.format === 'image/png') {
          // --- PNG Export ---
          outBlob = await new Promise(res => scaledCanvas.toBlob(res, 'image/png'));

        } else {
          // --- JPEG / WebP Precision Compression ---
          const targetKB = state.unit === 'MB' ? state.targetSize * 1024 : state.targetSize;
          
          // Temporary image file to pass to ImageCompressor
          const tempBlob = await new Promise(res => scaledCanvas.toBlob(res, state.format, 0.95));
          const tempFile = new File([tempBlob], 'temp', { type: state.format });

          const compressResult = await ImageCompressor.compressImage(tempFile, {
            targetKB,
            format: state.format,
            strictUnder: state.sizeMode === 'max',
            onProgress: (pct, msg) => {
              processingProgressFill.style.width = `${65 + Math.round((pct / 100) * 30)}%`;
              processingProgressText.textContent = msg;
            }
          });

          outBlob = compressResult.blob;
        }

        processingProgressFill.style.width = '100%';
        processingProgressText.textContent = 'Processing completed successfully!';

        // Update State
        state.processedBlob = outBlob;
        if (state.processedUrl) URL.revokeObjectURL(state.processedUrl);
        state.processedUrl = URL.createObjectURL(outBlob);
        state.processedWidth = pxW;
        state.processedHeight = pxH;
        state.processedSize = outBlob.size;

        // Display Result Card
        displayResultCard();

      } catch (err) {
        console.error('Processing failed', err);
        alert('An error occurred during processing: ' + err.message);
      } finally {
        setTimeout(() => {
          processingProgressBar.style.display = 'none';
          btnProcessMain.disabled = false;
          state.isProcessing = false;
        }, 600);
      }
    });
  }

  function displayResultCard() {
    resultDisplayCard.style.display = 'flex';

    // Stats calculations
    const origKB = ImageCompressor.formatBytes(state.originalSize);
    const compKB = ImageCompressor.formatBytes(state.processedSize);
    let diffText = '';

    if (state.processedSize < state.originalSize) {
      const pct = Math.round(((state.originalSize - state.processedSize) / state.originalSize) * 100);
      diffText = `<span class="saved-pill" style="background: rgba(16, 185, 129, 0.15); color: #059669; padding: 0.2rem 0.6rem; border-radius: 9999px;">${pct}% Saved</span>`;
    }

    resultStatsSummary.innerHTML = `
      <span style="color: var(--text-muted);">Original: <strong>${origKB}</strong> (${state.originalWidth}×${state.originalHeight}px)</span>
      <span style="color: #2563eb;">➔</span>
      <span>Output: <strong style="color: var(--accent);">${compKB}</strong> (${state.processedWidth}×${state.processedHeight}px)</span>
      ${diffText}
    `;

    // Download button label
    const ext = state.format === 'application/pdf' ? 'PDF' : (state.format.split('/')[1] || 'Image').toUpperCase();
    btnDownloadResultLabel.textContent = `Download ${ext} (${compKB})`;

    // Comparison slider setup
    if (state.format !== 'application/pdf') {
      resCompareContainer.style.display = 'block';
      resCompareOrigImg.src = state.cropper ? state.cropper.canvas.toDataURL() : state.image.src;
      resCompareCompImg.src = state.processedUrl;
      setSliderPosition(50);
    } else {
      resCompareContainer.style.display = 'none';
    }

    // Scroll to result card
    resultDisplayCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // =========================================================================
  // 10. Instant Download Actions
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

  // Comparison slider dragging
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

  // Dynamic script loader helper
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
