/**
 * Main Application Script for PhotoResize Pro
 * Features: Batch Compression, Precision KB/MB, Interactive Cropper & Transform,
 * Image Enhancements (Brightness, Contrast, Sharpness), Camera Capture, Bilingual Support.
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // State
  const state = {
    files: [], // Array of { id, file, origUrl, compBlob, compUrl, origSize, compSize, origW, origH, compW, compH, status }
    targetSize: 100,
    unit: 'KB',
    format: 'auto',
    strictUnder: true,
    maxWidth: null,
    maxHeight: null,
    isProcessing: false,
    activeCompareId: null,
    activeEditingId: null
  };

  // DOM Elements
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const sizeInput = document.getElementById('sizeInput');
  const unitSelect = document.getElementById('unitSelect');
  const stepUpBtn = document.getElementById('stepUpBtn');
  const stepDownBtn = document.getElementById('stepDownBtn');
  const presetBtns = document.querySelectorAll('.preset-btn');
  const examSelect = document.getElementById('examSelect');
  const accordionToggle = document.getElementById('accordionToggle');
  const accordionContent = document.getElementById('accordionContent');
  const formatSelect = document.getElementById('formatSelect');
  const maxWidthInput = document.getElementById('maxWidthInput');
  const maxHeightInput = document.getElementById('maxHeightInput');
  const strictCheck = document.getElementById('strictCheck');
  
  const compressBtn = document.getElementById('compressBtn');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const progressCard = document.getElementById('progressCard');
  const progressStatus = document.getElementById('progressStatus');
  const progressBarFill = document.getElementById('progressBarFill');

  const resultsSection = document.getElementById('resultsSection');
  const fileCardsList = document.getElementById('fileCardsList');
  const fileCountBadge = document.getElementById('fileCountBadge');
  const downloadAllBtn = document.getElementById('downloadAllBtn');

  // Compare Modal Elements
  const compareModal = document.getElementById('compareModal');
  const compareCloseBtn = document.getElementById('compareCloseBtn');
  const compareOrigImg = document.getElementById('compareOrigImg');
  const compareCompImg = document.getElementById('compareCompImg');
  const compareSliderLine = document.getElementById('compareSliderLine');
  const compareContainer = document.getElementById('compareContainer');
  const compareOrigSize = document.getElementById('compareOrigSize');
  const compareCompSize = document.getElementById('compareCompSize');
  const compareSavedPct = document.getElementById('compareSavedPct');

  // Theme & Language
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIcon = document.getElementById('themeIcon');
  const themeText = document.getElementById('themeText');
  const langToggleBtn = document.querySelectorAll('.lang-toggle-btn');

  // Sidebar Drawer for Mobile
  const btnToggleSidebar = document.getElementById('btnToggleSidebar');
  const appSidebar = document.getElementById('appSidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');

  // Camera Elements
  const btnOpenMainCamera = document.getElementById('btnOpenMainCamera');
  const mainCameraModal = document.getElementById('mainCameraModal');
  const mainCameraVideo = document.getElementById('mainCameraVideo');
  const btnCameraClose = document.getElementById('btnCameraClose');
  const btnCameraSwitch = document.getElementById('btnCameraSwitch');
  const btnCameraSnap = document.getElementById('btnCameraSnap');
  let cameraStream = null;
  let currentCameraFacing = 'environment';

  // Editor Modal Elements
  const editorModal = document.getElementById('editorModal');
  const editorCanvas = document.getElementById('editorCanvas');
  const btnEditorClose = document.getElementById('btnEditorClose');
  const btnEditorCancel = document.getElementById('btnEditorCancel');
  const btnEditorApply = document.getElementById('btnEditorApply');
  const editorFineRotate = document.getElementById('editorFineRotate');
  const editorFineRotateVal = document.getElementById('editorFineRotateVal');
  let activeCropper = null;

  // ==========================================
  // Sidebar & Theme Initialization
  // ==========================================
  if (btnToggleSidebar && appSidebar && sidebarBackdrop) {
    btnToggleSidebar.addEventListener('click', () => {
      const isOpen = appSidebar.classList.toggle('drawer-open');
      sidebarBackdrop.classList.toggle('active', isOpen);
    });
    sidebarBackdrop.addEventListener('click', () => {
      appSidebar.classList.remove('drawer-open');
      sidebarBackdrop.classList.remove('active');
    });
  }

  if (window.ThemeManager) {
    window.ThemeManager.init();
  } else {
    function initTheme() {
      const savedTheme = localStorage.getItem('photo_theme') || 
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      setTheme(savedTheme);
    }

    function setTheme(theme) {
      if (theme === 'dark') {
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

    initTheme();
  }

  // Language Toggle
  langToggleBtn.forEach(btn => {
    btn.addEventListener('click', () => {
      if (window.I18nManager) {
        window.I18nManager.toggleLanguage();
      }
    });
  });

  initTheme();

  // ==========================================
  // Accordion & Options
  // ==========================================
  if (accordionToggle && accordionContent) {
    accordionToggle.addEventListener('click', () => {
      const isOpen = accordionContent.classList.toggle('open');
      accordionToggle.classList.toggle('open', isOpen);
    });
  }

  // ==========================================
  // Preset Controls
  // ==========================================
  function updateTargetSizeFromInput() {
    let val = parseFloat(sizeInput.value);
    if (isNaN(val) || val <= 0) val = 100;
    state.targetSize = val;
    state.unit = unitSelect.value;
    highlightMatchingPreset();
    const mainBtnKbLabel = document.getElementById('mainBtnKbLabel');
    if (mainBtnKbLabel) mainBtnKbLabel.textContent = `${state.targetSize} ${state.unit}`;
  }

  function highlightMatchingPreset() {
    presetBtns.forEach(btn => {
      const presetVal = parseFloat(btn.dataset.size);
      const presetUnit = btn.dataset.unit;
      if (presetVal === state.targetSize && presetUnit === state.unit) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  sizeInput.addEventListener('input', updateTargetSizeFromInput);
  unitSelect.addEventListener('change', updateTargetSizeFromInput);

  stepUpBtn.addEventListener('click', () => {
    let step = state.unit === 'MB' ? 0.5 : 10;
    sizeInput.value = Math.max(1, Math.round(parseFloat(sizeInput.value || 0) + step));
    updateTargetSizeFromInput();
  });

  stepDownBtn.addEventListener('click', () => {
    let step = state.unit === 'MB' ? 0.5 : 10;
    sizeInput.value = Math.max(1, Math.round(parseFloat(sizeInput.value || 0) - step));
    updateTargetSizeFromInput();
  });

  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const s = parseFloat(btn.dataset.size);
      const u = btn.dataset.unit;
      sizeInput.value = s;
      unitSelect.value = u;
      updateTargetSizeFromInput();
    });
  });

  // Exam Presets
  if (examSelect) {
    examSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      if (!val) return;
      if (val === 'ssc-photo' || val === 'upsc-photo' || val === 'ibps-photo') {
        sizeInput.value = 45; // Under 50 KB
        unitSelect.value = 'KB';
      } else if (val === 'ssc-sign' || val === 'upsc-sign' || val === 'ibps-sign') {
        sizeInput.value = 18; // Under 20 KB
        unitSelect.value = 'KB';
      } else if (val === 'neet-photo') {
        sizeInput.value = 80;
        unitSelect.value = 'KB';
      } else if (val === 'pan-photo') {
        sizeInput.value = 45;
        unitSelect.value = 'KB';
      }
      updateTargetSizeFromInput();
    });
  }

  // ==========================================
  // Dropzone & File Handling
  // ==========================================
  dropzone.addEventListener('click', (e) => {
    // If clicking the camera button, don't trigger file input
    if (e.target.closest('#btnOpenMainCamera')) return;
    fileInput.click();
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('drag-active');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('drag-active');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
      fileInput.value = '';
    }
  });

  // Clipboard Paste Support (Ctrl+V)
  window.addEventListener('paste', (e) => {
    if (e.clipboardData && e.clipboardData.files.length > 0) {
      const files = Array.from(e.clipboardData.files).filter(f => f.type.startsWith('image/'));
      if (files.length > 0) {
        handleFiles(files);
      }
    }
  });

  function handleFiles(newFiles) {
    const validImages = newFiles.filter(f => f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(f.name));
    if (validImages.length === 0) {
      alert('Please select valid image files (JPG, PNG, WEBP, etc.).');
      return;
    }

    validImages.forEach(file => {
      const id = 'img_' + Math.random().toString(36).substring(2, 9);
      const origUrl = URL.createObjectURL(file);
      
      const item = {
        id,
        file,
        origUrl,
        compBlob: null,
        compUrl: null,
        origSize: file.size,
        compSize: null,
        origW: 0,
        origH: 0,
        compW: 0,
        compH: 0,
        status: 'pending' // 'pending' | 'processing' | 'done' | 'error'
      };

      // Read dimensions
      const img = new Image();
      img.onload = () => {
        item.origW = img.naturalWidth || img.width;
        item.origH = img.naturalHeight || img.height;
        renderFileList();
      };
      img.src = origUrl;

      state.files.push(item);
    });

    renderFileList();
    updateUIState();

    // Auto-scroll slightly to show images added
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ==========================================
  // Camera Capture Integration
  // ==========================================
  if (btnOpenMainCamera && mainCameraModal) {
    btnOpenMainCamera.addEventListener('click', (e) => {
      e.stopPropagation();
      openCamera();
    });

    if (btnCameraClose) {
      btnCameraClose.addEventListener('click', closeCamera);
    }

    if (btnCameraSwitch) {
      btnCameraSwitch.addEventListener('click', () => {
        currentCameraFacing = currentCameraFacing === 'user' ? 'environment' : 'user';
        closeCameraStream();
        startCameraStream();
      });
    }

    if (btnCameraSnap) {
      btnCameraSnap.addEventListener('click', () => {
        if (!mainCameraVideo.videoWidth) return;
        const c = document.createElement('canvas');
        c.width = mainCameraVideo.videoWidth;
        c.height = mainCameraVideo.videoHeight;
        const ctx = c.getContext('2d');
        ctx.drawImage(mainCameraVideo, 0, 0, c.width, c.height);

        c.toBlob((blob) => {
          if (blob) {
            const snapFile = new File([blob], `camera_photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
            handleFiles([snapFile]);
            closeCamera();
          }
        }, 'image/jpeg', 0.95);
      });
    }
  }

  async function openCamera() {
    mainCameraModal.classList.add('active');
    await startCameraStream();
  }

  async function startCameraStream() {
    try {
      const constraints = {
        video: {
          facingMode: { ideal: currentCameraFacing },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };
      cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
      mainCameraVideo.srcObject = cameraStream;
    } catch (err) {
      console.error('Camera access failed', err);
      alert('Could not access camera. Please allow camera permissions or upload an image file.');
      closeCamera();
    }
  }

  function closeCameraStream() {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      cameraStream = null;
    }
  }

  function closeCamera() {
    closeCameraStream();
    if (mainCameraModal) mainCameraModal.classList.remove('active');
  }

  // ==========================================
  // Render File Cards
  // ==========================================
  function renderFileList() {
    if (state.files.length === 0) {
      resultsSection.classList.remove('has-files');
      fileCardsList.innerHTML = '';
      return;
    }

    resultsSection.classList.add('has-files');
    fileCountBadge.textContent = `${state.files.length} Image${state.files.length > 1 ? 's' : ''}`;
    fileCardsList.innerHTML = '';

    state.files.forEach(item => {
      const card = document.createElement('div');
      card.className = 'file-card';
      card.id = `card_${item.id}`;

      const isDone = item.status === 'done';
      const isProcessing = item.status === 'processing';

      let savedText = '';
      if (isDone && item.compSize) {
        const pct = Math.max(0, Math.round(((item.origSize - item.compSize) / item.origSize) * 100));
        savedText = `<span class="saved-pill">${pct}% Saved</span>`;
      }

      card.innerHTML = `
        <div class="file-left">
          <img src="${item.compUrl || item.origUrl}" class="file-thumb" alt="${item.file.name}">
          <div class="file-meta">
            <div class="file-name" title="${item.file.name}">${item.file.name}</div>
            <div class="file-dimens">
              ${item.origW ? `${item.origW} × ${item.origH} px` : ''}
              ${isDone && item.compW ? ` → ${item.compW} × ${item.compH} px` : ''}
            </div>
            <div class="file-sizes">
              ${isDone ? `
                <span class="size-orig">${ImageCompressor.formatBytes(item.origSize)}</span>
                <span class="size-arrow">➔</span>
                <span class="size-comp">${ImageCompressor.formatBytes(item.compSize)}</span>
                ${savedText}
              ` : `
                <span>Original: ${ImageCompressor.formatBytes(item.origSize)}</span>
                <span style="color: var(--text-light); margin-left: 0.5rem;">Target: ~${state.targetSize} ${state.unit}</span>
              `}
            </div>
          </div>
        </div>
        <div class="file-actions" style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
          <button class="btn-card-action" onclick="window.openEditor('${item.id}')" title="Interactive Crop, Straighten & Enhance" style="cursor: pointer;">
            <i class="ph-bold ph-crop"></i> Edit &amp; Crop
          </button>
          ${isDone ? `
            <button class="btn-card-action" onclick="window.openCompare('${item.id}')" style="cursor: pointer;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
              Compare
            </button>
            <button class="btn-card-download" onclick="window.downloadSingle('${item.id}')" style="background: var(--accent); color: white; font-weight: 800; padding: 0.6rem 1.15rem; display: inline-flex; align-items: center; gap: 0.4rem; box-shadow: 0 4px 12px rgba(16,185,129,0.35); cursor: pointer; border: none; border-radius: var(--radius-sm);">
              <i class="ph-bold ph-check-circle" style="font-size: 1.15rem;"></i>
              <span>Download (${ImageCompressor.formatBytes(item.compSize)})</span>
            </button>
          ` : isProcessing ? `
            <span style="font-size: 0.9rem; font-weight: 700; color: var(--primary); display: inline-flex; align-items: center; gap: 0.35rem;">
              <i class="ph-bold ph-spinner ph-spin"></i> Compressing...
            </span>
          ` : `
            <button class="btn-card-download" onclick="window.compressAndDownloadSingle('${item.id}')" style="background: var(--primary); color: white; font-weight: 800; padding: 0.6rem 1.15rem; display: inline-flex; align-items: center; gap: 0.4rem; box-shadow: 0 4px 12px var(--primary-glow); cursor: pointer; border: none; border-radius: var(--radius-sm);">
              <i class="ph-bold ph-download-simple" style="font-size: 1.15rem;"></i>
              <span>Download (&lt;${state.targetSize} ${state.unit})</span>
            </button>
          `}
          <button class="btn-card-remove" onclick="window.removeFile('${item.id}')" title="Remove" style="cursor: pointer;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      `;

      fileCardsList.appendChild(card);
    });

    const doneCount = state.files.filter(f => f.status === 'done').length;
    downloadAllBtn.style.display = doneCount > 0 ? 'inline-flex' : 'none';
  }

  function updateUIState() {
    const hasFiles = state.files.length > 0;
    compressBtn.disabled = !hasFiles || state.isProcessing;
    clearAllBtn.style.display = hasFiles ? 'inline-block' : 'none';
    const quickHint = document.getElementById('quickDownloadHint');
    if (quickHint) quickHint.style.display = hasFiles ? 'block' : 'none';
  }

  // Window global handlers for inline onclicks
  window.removeFile = function(id) {
    const index = state.files.findIndex(f => f.id === id);
    if (index !== -1) {
      if (state.files[index].origUrl) URL.revokeObjectURL(state.files[index].origUrl);
      if (state.files[index].compUrl) URL.revokeObjectURL(state.files[index].compUrl);
      state.files.splice(index, 1);
      renderFileList();
      updateUIState();
    }
  };

  clearAllBtn.addEventListener('click', () => {
    state.files.forEach(f => {
      if (f.origUrl) URL.revokeObjectURL(f.origUrl);
      if (f.compUrl) URL.revokeObjectURL(f.compUrl);
    });
    state.files = [];
    renderFileList();
    updateUIState();
  });

  // ==========================================
  // Interactive Photo Editor (Crop, Transform, Enhance)
  // ==========================================
  window.openEditor = function(id) {
    const item = state.files.find(f => f.id === id);
    if (!item) return;

    state.activeEditingId = id;
    editorModal.classList.add('active');

    // Reset editor canvas
    activeCropper = new InteractiveCropper(editorCanvas);
    activeCropper.loadImage(item.origUrl).catch(err => {
      console.error('Failed to load image in cropper', err);
    });

    // Reset controls
    if (editorFineRotate) {
      editorFineRotate.value = 0;
      editorFineRotateVal.textContent = '0°';
    }

    // Reset enhancement sliders
    const enhBrightness = document.getElementById('enhBrightness');
    const enhContrast = document.getElementById('enhContrast');
    const enhSaturation = document.getElementById('enhSaturation');
    const enhSharpness = document.getElementById('enhSharpness');
    const enhGrayscale = document.getElementById('enhGrayscale');
    if (enhBrightness) enhBrightness.value = 0;
    if (enhContrast) enhContrast.value = 0;
    if (enhSaturation) enhSaturation.value = 0;
    if (enhSharpness) enhSharpness.value = 0;
    if (enhGrayscale) enhGrayscale.checked = false;
  };

  function closeEditor() {
    editorModal.classList.remove('active');
    state.activeEditingId = null;
    activeCropper = null;
  }

  if (btnEditorClose) btnEditorClose.addEventListener('click', closeEditor);
  if (btnEditorCancel) btnEditorCancel.addEventListener('click', closeEditor);

  // Aspect ratio handlers
  const ratioBtns = document.querySelectorAll('.editor-ratio-btn');
  ratioBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      ratioBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const r = btn.dataset.ratio;
      if (activeCropper) {
        activeCropper.setAspectRatio(r === 'free' ? null : parseFloat(r));
      }
    });
  });

  // Transform buttons
  const btnCCW = document.getElementById('btnEditorRotateCCW');
  const btnCW = document.getElementById('btnEditorRotateCW');
  const btnFlipH = document.getElementById('btnEditorFlipH');
  const btnFlipV = document.getElementById('btnEditorFlipV');
  const btnZoomIn = document.getElementById('btnEditorZoomIn');
  const btnZoomOut = document.getElementById('btnEditorZoomOut');
  const btnUndo = document.getElementById('btnEditorUndo');
  const btnReset = document.getElementById('btnEditorReset');

  if (btnCCW) btnCCW.addEventListener('click', () => activeCropper && activeCropper.rotate90(false));
  if (btnCW) btnCW.addEventListener('click', () => activeCropper && activeCropper.rotate90(true));
  if (btnFlipH) btnFlipH.addEventListener('click', () => activeCropper && activeCropper.toggleFlipH());
  if (btnFlipV) btnFlipV.addEventListener('click', () => activeCropper && activeCropper.toggleFlipV());
  if (btnZoomIn) btnZoomIn.addEventListener('click', () => activeCropper && activeCropper.adjustZoom(0.15));
  if (btnZoomOut) btnZoomOut.addEventListener('click', () => activeCropper && activeCropper.adjustZoom(-0.15));
  if (btnUndo) btnUndo.addEventListener('click', () => activeCropper && activeCropper.undo());
  if (btnReset) btnReset.addEventListener('click', () => activeCropper && activeCropper.resetTransform());

  if (editorFineRotate) {
    editorFineRotate.addEventListener('input', (e) => {
      const deg = parseFloat(e.target.value);
      editorFineRotateVal.textContent = `${deg > 0 ? '+' : ''}${deg}°`;
      if (activeCropper) activeCropper.setFineRotation(deg);
    });
  }

  const btnEnhAutoLevels = document.getElementById('btnEnhAutoLevels');
  let autoLevelsEnabled = false;
  if (btnEnhAutoLevels) {
    btnEnhAutoLevels.addEventListener('click', () => {
      autoLevelsEnabled = !autoLevelsEnabled;
      btnEnhAutoLevels.classList.toggle('active', autoLevelsEnabled);
    });
  }

  // Apply changes to file
  if (btnEditorApply) {
    btnEditorApply.addEventListener('click', async () => {
      if (!activeCropper || !state.activeEditingId) return;

      const item = state.files.find(f => f.id === state.activeEditingId);
      if (!item) return;

      btnEditorApply.disabled = true;
      btnEditorApply.textContent = 'Applying...';

      try {
        const croppedCanvas = activeCropper.getCroppedCanvas();
        if (!croppedCanvas) throw new Error('Could not crop canvas');

        // Apply image enhancements
        const enhBrightness = parseInt(document.getElementById('enhBrightness')?.value || 0, 10);
        const enhContrast = parseInt(document.getElementById('enhContrast')?.value || 0, 10);
        const enhSaturation = parseInt(document.getElementById('enhSaturation')?.value || 0, 10);
        const enhSharpness = parseInt(document.getElementById('enhSharpness')?.value || 0, 10);
        const enhGrayscale = document.getElementById('enhGrayscale')?.checked || false;

        const enhancedCanvas = ImageEnhancer.applyAdjustments(croppedCanvas, {
          brightness: enhBrightness,
          contrast: enhContrast,
          saturation: enhSaturation,
          sharpness: enhSharpness,
          grayscale: enhGrayscale,
          autoEnhance: autoLevelsEnabled
        });

        // Convert to Blob
        enhancedCanvas.toBlob((blob) => {
          if (!blob) return;

          // Replace item data
          const newFile = new File([blob], item.file.name, { type: 'image/jpeg' });
          if (item.origUrl) URL.revokeObjectURL(item.origUrl);
          if (item.compUrl) URL.revokeObjectURL(item.compUrl);

          item.file = newFile;
          item.origUrl = URL.createObjectURL(blob);
          item.origSize = blob.size;
          item.origW = enhancedCanvas.width;
          item.origH = enhancedCanvas.height;
          item.compBlob = null;
          item.compUrl = null;
          item.compSize = null;
          item.status = 'pending';

          closeEditor();
          renderFileList();
          updateUIState();
        }, 'image/jpeg', 0.95);

      } catch (err) {
        console.error('Error applying edits', err);
        alert('Could not apply edits: ' + err.message);
      } finally {
        btnEditorApply.disabled = false;
        btnEditorApply.innerHTML = '<i class="ph-bold ph-check"></i> Apply &amp; Update Photo';
      }
    });
  }

  // ==========================================
  // Compression Execution
  // ==========================================
  compressBtn.addEventListener('click', async () => {
    if (state.files.length === 0 || state.isProcessing) return;

    state.isProcessing = true;
    updateUIState();
    progressCard.classList.add('active');

    const targetKB = state.unit === 'MB' ? state.targetSize * 1024 : state.targetSize;
    const format = formatSelect ? formatSelect.value : 'auto';
    const strictUnder = strictCheck ? strictCheck.checked : true;
    const maxWidth = maxWidthInput && maxWidthInput.value ? parseInt(maxWidthInput.value, 10) : null;
    const maxHeight = maxHeightInput && maxHeightInput.value ? parseInt(maxHeightInput.value, 10) : null;

    const totalFiles = state.files.length;

    for (let i = 0; i < totalFiles; i++) {
      const item = state.files[i];
      item.status = 'processing';
      renderFileList();

      const progressOffset = (i / totalFiles) * 100;
      const progressChunk = (1 / totalFiles) * 100;

      try {
        const result = await ImageCompressor.compressImage(item.file, {
          targetKB,
          format,
          strictUnder,
          maxWidth,
          maxHeight,
          onProgress: (pct, text) => {
            const overallPct = Math.min(100, Math.round(progressOffset + (pct / 100) * progressChunk));
            progressBarFill.style.width = overallPct + '%';
            progressStatus.textContent = `[${i + 1}/${totalFiles}] ${item.file.name}: ${text}`;
          }
        });

        item.compBlob = result.blob;
        item.compUrl = URL.createObjectURL(result.blob);
        item.compSize = result.compressedSize;
        item.compW = result.width;
        item.compH = result.height;
        item.status = 'done';
      } catch (err) {
        console.error('Compression failed for', item.file.name, err);
        item.status = 'error';
      }

      renderFileList();
    }

    progressBarFill.style.width = '100%';
    progressStatus.textContent = `Completed! Successfully processed ${totalFiles} images.`;

    const doneItems = state.files.filter(f => f.status === 'done' && f.compBlob);
    if (doneItems.length === 1) {
      window.downloadSingle(doneItems[0].id);
    } else if (doneItems.length > 1) {
      setTimeout(() => {
        if (downloadAllBtn) downloadAllBtn.click();
      }, 300);
    }

    setTimeout(() => {
      progressCard.classList.remove('active');
      state.isProcessing = false;
      updateUIState();
      renderFileList();
    }, 1000);
  });

  // ==========================================
  // Download Actions
  // ==========================================
  function triggerDownload(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  window.downloadSingle = function(id) {
    const item = state.files.find(f => f.id === id);
    if (!item || !item.compBlob) return;

    const ext = item.compBlob.type === 'image/webp' ? '.webp' : (item.compBlob.type === 'image/png' ? '.png' : '.jpg');
    const baseName = item.file.name.replace(/\.[^/.]+$/, '');
    const filename = `${baseName}_reduced_${state.targetSize}${state.unit}${ext}`;

    triggerDownload(item.compUrl, filename);
  };

  window.compressAndDownloadSingle = async function(id) {
    const item = state.files.find(f => f.id === id);
    if (!item) return;

    if (item.status === 'done' && item.compBlob) {
      window.downloadSingle(id);
      return;
    }

    item.status = 'processing';
    renderFileList();

    const targetKB = state.unit === 'MB' ? state.targetSize * 1024 : state.targetSize;
    const format = formatSelect ? formatSelect.value : 'auto';
    const strictUnder = strictCheck ? strictCheck.checked : true;
    const maxWidth = maxWidthInput && maxWidthInput.value ? parseInt(maxWidthInput.value, 10) : null;
    const maxHeight = maxHeightInput && maxHeightInput.value ? parseInt(maxHeightInput.value, 10) : null;

    try {
      const result = await ImageCompressor.compressImage(item.file, {
        targetKB,
        format,
        strictUnder,
        maxWidth,
        maxHeight
      });

      item.compBlob = result.blob;
      item.compUrl = URL.createObjectURL(result.blob);
      item.compSize = result.compressedSize;
      item.compW = result.width;
      item.compH = result.height;
      item.status = 'done';
      renderFileList();

      window.downloadSingle(id);
    } catch (err) {
      console.error(err);
      alert('Compression error: ' + err.message);
      item.status = 'error';
      renderFileList();
    }
  };

  downloadAllBtn.addEventListener('click', async () => {
    const doneItems = state.files.filter(f => f.status === 'done' && f.compBlob);
    if (doneItems.length === 0) return;

    if (doneItems.length === 1) {
      window.downloadSingle(doneItems[0].id);
      return;
    }

    downloadAllBtn.disabled = true;
    downloadAllBtn.textContent = 'Creating ZIP...';

    try {
      if (typeof JSZip === 'undefined') {
        doneItems.forEach((it, idx) => {
          setTimeout(() => window.downloadSingle(it.id), idx * 300);
        });
        downloadAllBtn.disabled = false;
        downloadAllBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download All (ZIP)
        `;
        return;
      }

      const zip = new JSZip();
      doneItems.forEach(item => {
        const ext = item.compBlob.type === 'image/webp' ? '.webp' : (item.compBlob.type === 'image/png' ? '.png' : '.jpg');
        const baseName = item.file.name.replace(/\.[^/.]+$/, '');
        const filename = `${baseName}_reduced_${state.targetSize}${state.unit}${ext}`;
        zip.file(filename, item.compBlob);
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipUrl = URL.createObjectURL(zipBlob);
      triggerDownload(zipUrl, `reduced-images-${state.targetSize}${state.unit}.zip`);
      setTimeout(() => URL.revokeObjectURL(zipUrl), 10000);
    } catch (e) {
      console.error('Failed to create ZIP', e);
      alert('Could not create ZIP. Downloading files individually.');
      doneItems.forEach(it => window.downloadSingle(it.id));
    } finally {
      downloadAllBtn.disabled = false;
      downloadAllBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Download All (ZIP)
      `;
    }
  });

  // ==========================================
  // Image Comparison Modal & Slider
  // ==========================================
  window.openCompare = function(id) {
    const item = state.files.find(f => f.id === id);
    if (!item || !item.compUrl) return;

    state.activeCompareId = id;
    compareOrigImg.src = item.origUrl;
    compareCompImg.src = item.compUrl;

    compareOrigSize.textContent = `Original: ${ImageCompressor.formatBytes(item.origSize)} (${item.origW}×${item.origH}px)`;
    compareCompSize.textContent = `Compressed: ${ImageCompressor.formatBytes(item.compSize)} (${item.compW}×${item.compH}px)`;
    
    const pct = Math.max(0, Math.round(((item.origSize - item.compSize) / item.origSize) * 100));
    compareSavedPct.textContent = `${pct}% Smaller`;

    setSliderPosition(50);
    compareModal.classList.add('active');
  };

  function closeCompare() {
    compareModal.classList.remove('active');
    state.activeCompareId = null;
  }

  if (compareCloseBtn) compareCloseBtn.addEventListener('click', closeCompare);
  compareModal.addEventListener('click', (e) => {
    if (e.target === compareModal) closeCompare();
  });

  function setSliderPosition(percent) {
    percent = Math.max(0, Math.min(100, percent));
    compareSliderLine.style.left = percent + '%';
    compareOrigImg.style.clipPath = `polygon(0 0, ${percent}% 0, ${percent}% 100%, 0 100%)`;
  }

  let isDraggingSlider = false;

  function handleSliderMove(e) {
    if (!isDraggingSlider) return;
    const rect = compareContainer.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const x = clientX - rect.left;
    const percent = (x / rect.width) * 100;
    setSliderPosition(percent);
  }

  compareContainer.addEventListener('mousedown', (e) => {
    isDraggingSlider = true;
    handleSliderMove(e);
  });
  window.addEventListener('mousemove', handleSliderMove);
  window.addEventListener('mouseup', () => { isDraggingSlider = false; });

  compareContainer.addEventListener('touchstart', (e) => {
    isDraggingSlider = true;
    handleSliderMove(e);
  });
  window.addEventListener('touchmove', handleSliderMove);
  window.addEventListener('touchend', () => { isDraggingSlider = false; });

  // ==========================================
  // FAQ Accordion
  // ==========================================
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      faqItems.forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });

});
