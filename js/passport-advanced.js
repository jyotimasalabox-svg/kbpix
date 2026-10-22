/**
 * Advanced AI Passport Photo Maker & Multi-Photo Print Sheet Studio
 * Professional BGrade-style on-device photo generator with Biometric Guide,
 * Retouching, Background Color Replacement, DOP Name/Date Stamp, and A4/4x6 Sheet Generator.
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // --- State ---
  const state = {
    file: null,
    img: null,
    origUrl: null,
    
    // Crop & Transform
    zoom: 1.0,
    panX: 0,
    panY: 0,
    rotation: 0,
    flipH: 1,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,

    // Dimensions (in cm and px at 300 DPI: 1 cm ≈ 118.11 px)
    widthCm: 3.5,
    heightCm: 4.5,
    targetKB: 50,

    // Enhancements
    bgColor: '#ffffff',
    removeBgAI: false,
    brightness: 100,
    contrast: 100,
    saturation: 100,

    // Stamp
    enableStamp: false,
    stampName: '',
    stampDate: '',

    // Border
    enableBorder: true,
    borderWidth: 2,
    borderColor: '#d1d5db',

    // Sheet Print Config
    paperSize: 'a4', // 'a4', '4x6', 'letter'
    copiesCount: 8,
    showCutLines: true,

    // Active View Mode
    activeMode: 'single' // 'single' or 'sheet'
  };

  const DPI = 300;
  const CM_TO_PX = DPI / 2.54; // ≈ 118.11 px per cm

  // --- DOM Elements ---
  const dropzone = document.getElementById('passportDropzone');
  const fileInput = document.getElementById('passportFileInput');
  const workspaceArea = document.getElementById('passportWorkspace');
  
  const previewCanvas = document.getElementById('passportPreviewCanvas');
  const sheetCanvas = document.getElementById('sheetPrintCanvas');
  const canvasBox = document.getElementById('previewCanvasBox');
  const biometricGuide = document.getElementById('biometricGuide');

  // Format presets
  const presetPills = document.querySelectorAll('.format-pill-btn[data-preset]');
  const customWidthInput = document.getElementById('customWidthCm');
  const customHeightInput = document.getElementById('customHeightCm');
  const targetKbInput = document.getElementById('passportTargetKb');

  // Background colors
  const colorDots = document.querySelectorAll('.color-dot[data-color]');
  const customColorPicker = document.getElementById('customColorPicker');
  const btnRemoveBg = document.getElementById('btnAiBgRemove');

  // Retouch sliders
  const sliderBrightness = document.getElementById('sliderBrightness');
  const valBrightness = document.getElementById('valBrightness');
  const sliderContrast = document.getElementById('sliderContrast');
  const valContrast = document.getElementById('valContrast');
  const sliderSaturation = document.getElementById('sliderSaturation');
  const valSaturation = document.getElementById('valSaturation');
  const btnResetFilters = document.getElementById('btnResetFilters');

  // DOP Stamp inputs
  const checkDopStamp = document.getElementById('checkDopStamp');
  const dopFieldsWrap = document.getElementById('dopFieldsWrap');
  const dopNameInput = document.getElementById('dopNameInput');
  const dopDateInput = document.getElementById('dopDateInput');

  // Border toggle
  const checkBorder = document.getElementById('checkBorder');

  // Transform toolbar
  const btnZoomIn = document.getElementById('btnZoomIn');
  const btnZoomOut = document.getElementById('btnZoomOut');
  const btnRotateLeft = document.getElementById('btnRotateLeft');
  const btnRotateRight = document.getElementById('btnRotateRight');
  const btnFlipH = document.getElementById('btnFlipH');
  const btnResetTransform = document.getElementById('btnResetTransform');
  const btnToggleGuide = document.getElementById('btnToggleGuide');

  // Mode tabs (Single Photo vs Multi-Photo Sheet)
  const tabSingleView = document.getElementById('tabSingleView');
  const tabSheetView = document.getElementById('tabSheetView');
  const singleControls = document.getElementById('singleControlsSection');
  const sheetControls = document.getElementById('sheetControlsSection');

  // Sheet config inputs
  const paperSelect = document.getElementById('sheetPaperSelect');
  const copyPills = document.querySelectorAll('.copy-pill[data-copies]');
  const checkCutLines = document.getElementById('checkCutLines');

  // Action buttons
  const btnDownloadSingle = document.getElementById('btnDownloadSingle');
  const btnDownloadSheetPdf = document.getElementById('btnDownloadSheetPdf');
  const btnPrintSheet = document.getElementById('btnPrintSheet');
  const btnDownloadSheetImage = document.getElementById('btnDownloadSheetImage');

  // --- Theme initialization ---
  if (window.ThemeManager) {
    window.ThemeManager.init();
  } else {
    function initTheme() {
      const saved = localStorage.getItem('photo_theme') || 'light';
      if (saved === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        const themeIcon = document.getElementById('themeIcon');
        const themeText = document.getElementById('themeText');
        if (themeIcon) themeIcon.textContent = '☀️';
        if (themeText) themeText.textContent = 'Light';
      }
    }
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn && !themeToggleBtn.dataset.themeBound) {
      themeToggleBtn.dataset.themeBound = 'true';
      themeToggleBtn.addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const themeIcon = document.getElementById('themeIcon');
        const themeText = document.getElementById('themeText');
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
    initTheme();
  }

  // Mobile nav toggle
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const navLinks = document.getElementById('navLinks');
  if (mobileMenuToggle && navLinks) {
    mobileMenuToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
  }

  // --- Presets Dictionary ---
  const PRESETS = {
    'india-passport': { w: 3.5, h: 4.5, kb: 50, name: 'Indian Passport (3.5 × 4.5 cm)' },
    'standard-passport': { w: 3.0, h: 4.0, kb: 50, name: 'Standard Passport (3.0 × 4.0 cm)' },
    'us-visa': { w: 5.1, h: 5.1, kb: 100, name: 'US Visa (2 × 2 inch / 5.1 × 5.1 cm)' },
    'aadhaar': { w: 2.5, h: 3.0, kb: 30, name: 'Aadhaar Card (2.5 × 3.0 cm)' },
    'pan-card': { w: 2.5, h: 3.5, kb: 40, name: 'PAN Card (2.5 × 3.5 cm)' },
    'stamp': { w: 2.0, h: 2.5, kb: 20, name: 'Stamp Size (2.0 × 2.5 cm)' },
    'custom': { w: 3.5, h: 4.5, kb: 50, name: 'Custom Size' }
  };

  // --- Event: File Upload ---
  if (dropzone && fileInput) {
    const btnSelectFile = dropzone.querySelector('.btn-select-file');
    if (btnSelectFile) {
      btnSelectFile.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
      });
    }

    dropzone.addEventListener('click', () => fileInput.click());
    
    ['dragenter', 'dragover'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-active');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-active');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        loadInputFile(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        loadInputFile(e.target.files[0]);
        fileInput.value = '';
      }
    });
  }

  // Paste image directly via clipboard
  window.addEventListener('paste', (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (const item of items) {
      if (item.type.indexOf('image') === 0) {
        const file = item.getAsFile();
        loadInputFile(file);
        break;
      }
    }
  });

  function loadInputFile(file) {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (JPG, PNG, or WEBP).');
      return;
    }
    state.file = file;
    state.origUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      state.img = img;
      resetTransform();
      if (dropzone) dropzone.style.display = 'none';
      if (workspaceArea) workspaceArea.style.display = 'block';
      renderView();
    };
    img.src = state.origUrl;
  }

  // --- Preset Pill Selection ---
  presetPills.forEach(pill => {
    pill.addEventListener('click', () => {
      presetPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const key = pill.dataset.preset;
      const data = PRESETS[key];
      if (data) {
        state.widthCm = data.w;
        state.heightCm = data.h;
        state.targetKB = data.kb;

        if (customWidthInput) customWidthInput.value = data.w;
        if (customHeightInput) customHeightInput.value = data.h;
        if (targetKbInput) targetKbInput.value = data.kb;

        renderView();
      }
    });
  });

  if (customWidthInput) {
    customWidthInput.addEventListener('input', () => {
      state.widthCm = parseFloat(customWidthInput.value) || 3.5;
      renderView();
    });
  }
  if (customHeightInput) {
    customHeightInput.addEventListener('input', () => {
      state.heightCm = parseFloat(customHeightInput.value) || 4.5;
      renderView();
    });
  }
  if (targetKbInput) {
    targetKbInput.addEventListener('input', () => {
      state.targetKB = parseInt(targetKbInput.value, 10) || 50;
    });
  }

  // --- Background Color Selection ---
  colorDots.forEach(dot => {
    dot.addEventListener('click', () => {
      colorDots.forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      state.bgColor = dot.dataset.color;
      state.removeBgAI = (dot.dataset.color !== 'transparent' && dot.dataset.color !== '#ffffff-original');
      renderView();
    });
  });

  if (customColorPicker) {
    customColorPicker.addEventListener('input', (e) => {
      state.bgColor = e.target.value;
      state.removeBgAI = true;
      renderView();
    });
  }

  if (btnRemoveBg) {
    btnRemoveBg.addEventListener('click', () => {
      state.removeBgAI = !state.removeBgAI;
      btnRemoveBg.classList.toggle('active', state.removeBgAI);
      renderView();
    });
  }

  // --- Retouch Sliders ---
  function updateFilters() {
    state.brightness = parseInt(sliderBrightness.value, 10);
    valBrightness.textContent = state.brightness + '%';

    state.contrast = parseInt(sliderContrast.value, 10);
    valContrast.textContent = state.contrast + '%';

    state.saturation = parseInt(sliderSaturation.value, 10);
    valSaturation.textContent = state.saturation + '%';

    renderView();
  }

  if (sliderBrightness) sliderBrightness.addEventListener('input', updateFilters);
  if (sliderContrast) sliderContrast.addEventListener('input', updateFilters);
  if (sliderSaturation) sliderSaturation.addEventListener('input', updateFilters);

  if (btnResetFilters) {
    btnResetFilters.addEventListener('click', () => {
      if (sliderBrightness) sliderBrightness.value = 100;
      if (sliderContrast) sliderContrast.value = 100;
      if (sliderSaturation) sliderSaturation.value = 100;
      updateFilters();
    });
  }

  // --- DOP Stamp ---
  if (checkDopStamp) {
    // Default today's date in DD-MM-YYYY format
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    if (dopDateInput) dopDateInput.value = `${dd}-${mm}-${yyyy}`;

    checkDopStamp.addEventListener('change', () => {
      state.enableStamp = checkDopStamp.checked;
      if (dopFieldsWrap) dopFieldsWrap.style.display = state.enableStamp ? 'flex' : 'none';
      state.stampName = dopNameInput ? dopNameInput.value.trim() : '';
      state.stampDate = dopDateInput ? dopDateInput.value.trim() : '';
      renderView();
    });

    if (dopNameInput) {
      dopNameInput.addEventListener('input', () => {
        state.stampName = dopNameInput.value.trim();
        renderView();
      });
    }
    if (dopDateInput) {
      dopDateInput.addEventListener('input', () => {
        state.stampDate = dopDateInput.value.trim();
        renderView();
      });
    }
  }

  // --- Border Checkbox ---
  if (checkBorder) {
    checkBorder.addEventListener('change', () => {
      state.enableBorder = checkBorder.checked;
      renderView();
    });
  }

  // --- Transform & Pan/Zoom Controls ---
  function resetTransform() {
    state.zoom = 1.0;
    state.panX = 0;
    state.panY = 0;
    state.rotation = 0;
    state.flipH = 1;
  }

  if (btnZoomIn) btnZoomIn.addEventListener('click', () => { state.zoom = Math.min(state.zoom + 0.1, 3.0); renderView(); });
  if (btnZoomOut) btnZoomOut.addEventListener('click', () => { state.zoom = Math.max(state.zoom - 0.1, 0.4); renderView(); });
  if (btnRotateLeft) btnRotateLeft.addEventListener('click', () => { state.rotation = (state.rotation - 90 + 360) % 360; renderView(); });
  if (btnRotateRight) btnRotateRight.addEventListener('click', () => { state.rotation = (state.rotation + 90) % 360; renderView(); });
  if (btnFlipH) btnFlipH.addEventListener('click', () => { state.flipH *= -1; renderView(); });
  if (btnResetTransform) btnResetTransform.addEventListener('click', () => { resetTransform(); renderView(); });

  if (btnToggleGuide) {
    btnToggleGuide.addEventListener('click', () => {
      if (biometricGuide) {
        biometricGuide.classList.toggle('active');
        btnToggleGuide.classList.toggle('active', biometricGuide.classList.contains('active'));
      }
    });
  }

  // Interactive Drag & Pan on Preview Canvas
  if (previewCanvas) {
    previewCanvas.addEventListener('mousedown', (e) => {
      state.isDragging = true;
      state.dragStartX = e.clientX - state.panX;
      state.dragStartY = e.clientY - state.panY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!state.isDragging) return;
      state.panX = e.clientX - state.dragStartX;
      state.panY = e.clientY - state.dragStartY;
      renderSingleCanvas();
    });

    window.addEventListener('mouseup', () => {
      state.isDragging = false;
    });

    // Mouse wheel zoom
    previewCanvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 0.05 : -0.05;
      state.zoom = Math.min(Math.max(state.zoom + zoomFactor, 0.4), 3.0);
      renderSingleCanvas();
    });

    // Touch support for mobile devices
    let touchStartDist = 0;
    previewCanvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        state.isDragging = true;
        state.dragStartX = e.touches[0].clientX - state.panX;
        state.dragStartY = e.touches[0].clientY - state.panY;
      } else if (e.touches.length === 2) {
        touchStartDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    });

    previewCanvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (state.isDragging && e.touches.length === 1) {
        state.panX = e.touches[0].clientX - state.dragStartX;
        state.panY = e.touches[0].clientY - state.dragStartY;
        renderSingleCanvas();
      } else if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (touchStartDist > 0) {
          const factor = (dist - touchStartDist) * 0.005;
          state.zoom = Math.min(Math.max(state.zoom + factor, 0.4), 3.0);
          renderSingleCanvas();
        }
      }
    }, { passive: false });

    previewCanvas.addEventListener('touchend', () => {
      state.isDragging = false;
      touchStartDist = 0;
    });
  }

  // --- View Mode Switcher (Single Photo vs Sheet) ---
  if (tabSingleView && tabSheetView) {
    tabSingleView.addEventListener('click', () => {
      state.activeMode = 'single';
      tabSingleView.classList.add('active');
      tabSheetView.classList.remove('active');
      if (singleControls) singleControls.style.display = 'block';
      if (sheetControls) sheetControls.style.display = 'none';
      if (previewCanvas) previewCanvas.style.display = 'block';
      if (sheetCanvas) sheetCanvas.style.display = 'none';
      if (biometricGuide) biometricGuide.style.display = 'block';
      renderView();
    });

    tabSheetView.addEventListener('click', () => {
      state.activeMode = 'sheet';
      tabSheetView.classList.add('active');
      tabSingleView.classList.remove('active');
      if (singleControls) singleControls.style.display = 'none';
      if (sheetControls) sheetControls.style.display = 'block';
      if (previewCanvas) previewCanvas.style.display = 'none';
      if (sheetCanvas) sheetCanvas.style.display = 'block';
      if (biometricGuide) biometricGuide.style.display = 'none';
      renderView();
    });
  }

  // Sheet config events
  if (paperSelect) {
    paperSelect.addEventListener('change', () => {
      state.paperSize = paperSelect.value;
      renderSheetCanvas();
    });
  }

  copyPills.forEach(pill => {
    pill.addEventListener('click', () => {
      copyPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.copiesCount = parseInt(pill.dataset.copies, 10) || 8;
      renderSheetCanvas();
    });
  });

  if (checkCutLines) {
    checkCutLines.addEventListener('change', () => {
      state.showCutLines = checkCutLines.checked;
      renderSheetCanvas();
    });
  }

  // --- Master Render Function ---
  function renderView() {
    if (!state.img) return;
    if (state.activeMode === 'single') {
      renderSingleCanvas();
    } else {
      renderSheetCanvas();
    }
  }

  // --- Render Single Passport Photo Canvas ---
  function renderSingleCanvas() {
    if (!state.img || !previewCanvas) return;

    // Target pixels at 300 DPI
    const targetW = Math.round(state.widthCm * CM_TO_PX);
    const targetH = Math.round(state.heightCm * CM_TO_PX);

    previewCanvas.width = targetW;
    previewCanvas.height = targetH;
    const ctx = previewCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 1. Fill background
    ctx.fillStyle = state.bgColor === 'transparent' ? '#ffffff' : state.bgColor;
    ctx.fillRect(0, 0, targetW, targetH);

    // 2. Prepare filter string
    ctx.save();
    ctx.filter = `brightness(${state.brightness}%) contrast(${state.contrast}%) saturate(${state.saturation}%)`;

    // 3. Transformations: Center origin for rotation, scale, pan
    ctx.translate(targetW / 2 + state.panX, targetH / 2 + state.panY);
    ctx.rotate((state.rotation * Math.PI) / 180);
    ctx.scale(state.zoom * state.flipH, state.zoom);

    // Fit image to cover canvas area nicely
    const imgRatio = state.img.width / state.img.height;
    const targetRatio = targetW / targetH;
    let drawW, drawH;
    if (imgRatio > targetRatio) {
      drawH = targetH;
      drawW = targetH * imgRatio;
    } else {
      drawW = targetW;
      drawH = targetW / imgRatio;
    }

    ctx.drawImage(state.img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    // 4. Background color replacement if requested
    if (state.removeBgAI) {
      applySmartBackgroundReplace(ctx, targetW, targetH, state.bgColor);
    }

    // 5. DOP Name & Date of Photo Stamp
    if (state.enableStamp) {
      renderDopStamp(ctx, targetW, targetH, state.stampName, state.stampDate);
    }

    // 6. Passport Border
    if (state.enableBorder) {
      ctx.strokeStyle = state.borderColor;
      ctx.lineWidth = state.borderWidth;
      ctx.strokeRect(
        state.borderWidth / 2,
        state.borderWidth / 2,
        targetW - state.borderWidth,
        targetH - state.borderWidth
      );
    }

    // Update dimensions display chip
    const infoChip = document.getElementById('passportDimChip');
    if (infoChip) {
      infoChip.textContent = `${state.widthCm} × ${state.heightCm} cm (${targetW} × ${targetH} px)`;
    }
  }

  // --- Smart Client-Side Background Replacement ---
  function applySmartBackgroundReplace(ctx, w, h, targetBgColor) {
    if (targetBgColor === 'transparent') return;
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // Parse target hex color
    const targetR = parseInt(targetBgColor.slice(1, 3), 16) || 255;
    const targetG = parseInt(targetBgColor.slice(3, 5), 16) || 255;
    const targetB = parseInt(targetBgColor.slice(5, 7), 16) || 255;

    // Sample top corners to detect dominant background tint
    const samples = [
      { r: data[0], g: data[1], b: data[2] },
      { r: data[(w - 1) * 4], g: data[(w - 1) * 4 + 1], b: data[(w - 1) * 4 + 2] }
    ];
    const avgBgR = (samples[0].r + samples[1].r) / 2;
    const avgBgG = (samples[0].g + samples[1].g) / 2;
    const avgBgB = (samples[0].b + samples[1].b) / 2;

    const threshold = 45;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const diff = Math.sqrt(
        (r - avgBgR) ** 2 +
        (g - avgBgG) ** 2 +
        (b - avgBgB) ** 2
      );

      if (diff < threshold) {
        data[i] = targetR;
        data[i + 1] = targetG;
        data[i + 2] = targetB;
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  // --- Render DOP Name and Date Banner ---
  function renderDopStamp(ctx, w, h, name, date) {
    const bannerH = Math.round(h * 0.17); // 17% height at bottom
    const bannerY = h - bannerH;

    // Crisp white strip
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, bannerY, w, bannerH);

    // Separator line
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, bannerY);
    ctx.lineTo(w, bannerY);
    ctx.stroke();

    // Text configuration
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const fontSize = Math.round(bannerH * 0.32);
    ctx.font = `bold ${fontSize}px sans-serif`;

    const centerY = bannerY + bannerH / 2;
    if (name && date) {
      ctx.fillText(name.toUpperCase(), w / 2, centerY - fontSize * 0.55);
      ctx.font = `600 ${Math.round(fontSize * 0.88)}px sans-serif`;
      ctx.fillText(`D.O.P. : ${date}`, w / 2, centerY + fontSize * 0.65);
    } else if (name) {
      ctx.fillText(name.toUpperCase(), w / 2, centerY);
    } else if (date) {
      ctx.fillText(`D.O.P. : ${date}`, w / 2, centerY);
    }
  }

  // --- Render Printable Sheet Canvas (A4 / 4x6 inch) ---
  function renderSheetCanvas() {
    if (!state.img || !sheetCanvas) return;

    // First ensure single photo is up to date
    renderSingleCanvas();

    // Paper dimensions in cm
    let paperW_cm, paperH_cm;
    if (state.paperSize === '4x6') {
      paperW_cm = 10.16; // 4 inch
      paperH_cm = 15.24; // 6 inch
    } else if (state.paperSize === 'letter') {
      paperW_cm = 21.59;
      paperH_cm = 27.94;
    } else {
      // Default A4 portrait
      paperW_cm = 21.0;
      paperH_cm = 29.7;
    }

    const sheetW = Math.round(paperW_cm * CM_TO_PX);
    const sheetH = Math.round(paperH_cm * CM_TO_PX);

    sheetCanvas.width = sheetW;
    sheetCanvas.height = sheetH;

    const ctx = sheetCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Pure white paper background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, sheetW, sheetH);

    // Photo dimensions in pixels
    const photoW = Math.round(state.widthCm * CM_TO_PX);
    const photoH = Math.round(state.heightCm * CM_TO_PX);

    // Margins and gap
    const marginX = Math.round(1.0 * CM_TO_PX); // 1 cm margin
    const marginY = Math.round(1.2 * CM_TO_PX);
    const gapX = Math.round(0.3 * CM_TO_PX);    // 3 mm gap
    const gapY = Math.round(0.4 * CM_TO_PX);    // 4 mm gap

    const cols = Math.floor((sheetW - 2 * marginX + gapX) / (photoW + gapX));
    const rows = Math.floor((sheetH - 2 * marginY + gapY) / (photoH + gapY));

    const totalPossible = cols * rows;
    const copiesToDraw = Math.min(state.copiesCount, totalPossible);

    let drawn = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (drawn >= copiesToDraw) break;

        const posX = marginX + c * (photoW + gapX);
        const posY = marginY + r * (photoH + gapY);

        // Draw the single photo from the preview canvas
        ctx.drawImage(previewCanvas, posX, posY, photoW, photoH);

        // Optional cutting dashed guide around photo
        if (state.showCutLines) {
          ctx.save();
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(posX - 1, posY - 1, photoW + 2, photoH + 2);
          ctx.restore();
        }

        drawn++;
      }
      if (drawn >= copiesToDraw) break;
    }

    // Sheet Info banner
    const sheetInfo = document.getElementById('sheetInfoChip');
    if (sheetInfo) {
      sheetInfo.textContent = `${drawn} Photos on ${state.paperSize.toUpperCase()} Sheet (1:1 Exact Print Scale)`;
    }
  }

  // Helper function to update KB labels across UI
  function updateKbLabels() {
    const stageTargetKb = document.getElementById('stageTargetKb');
    const btnKbLabel = document.getElementById('btnKbLabel');
    if (stageTargetKb) stageTargetKb.textContent = state.targetKB;
    if (btnKbLabel) btnKbLabel.textContent = state.targetKB;
  }

  // --- Action: Download Single Photo (JPEG with Target KB) ---
  async function executeDownloadSingle() {
    if (!state.img) {
      alert('Please select or upload your photo first!');
      const fi = document.getElementById('passportFileInput');
      if (fi) fi.click();
      return;
    }
    const btns = [btnDownloadSingle, document.getElementById('btnStageDownloadSingle')].filter(Boolean);
    btns.forEach(b => {
      b.disabled = true;
      b.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> Compressing & Downloading...';
    });

    renderSingleCanvas();

    previewCanvas.toBlob(async (blob) => {
      try {
        const rawFile = new File([blob], 'passport.jpg', { type: 'image/jpeg' });
        let finalBlob = blob;

        // If ImageCompressor is available, compress under target KB
        if (typeof ImageCompressor !== 'undefined' && ImageCompressor.compressImage) {
          const res = await ImageCompressor.compressImage(rawFile, {
            targetKB: state.targetKB,
            format: 'image/jpeg',
            strictUnder: true
          });
          finalBlob = res.blob;
        }

        // Trigger download
        const url = URL.createObjectURL(finalBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `passport_photo_${state.targetKB}KB.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error(err);
        alert('Download error: ' + err.message);
      } finally {
        btns.forEach(b => {
          b.disabled = false;
          b.innerHTML = `<i class="ph-bold ph-download-simple"></i> Download Photo (JPG &bull; &lt;${state.targetKB}KB)`;
        });
      }
    }, 'image/jpeg', 0.95);
  }

  if (btnDownloadSingle) btnDownloadSingle.addEventListener('click', executeDownloadSingle);
  const btnStageDownloadSingle = document.getElementById('btnStageDownloadSingle');
  if (btnStageDownloadSingle) btnStageDownloadSingle.addEventListener('click', executeDownloadSingle);

  // --- Action: Download Printable Sheet as High-Res PDF (1:1 Actual Scale) ---
  function executeDownloadSheetPdf() {
    if (!state.img || !sheetCanvas) {
      alert('Please upload your photo first!');
      const fi = document.getElementById('passportFileInput');
      if (fi) fi.click();
      return;
    }
    renderSheetCanvas();

    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert('PDF generator library is loading, please try again in a moment.');
      return;
    }

    const btns = [btnDownloadSheetPdf, document.getElementById('btnStageDownloadSheet')].filter(Boolean);
    btns.forEach(b => {
      b.disabled = true;
      b.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> Generating PDF...';
    });

    try {
      const format = state.paperSize === '4x6' ? [101.6, 152.4] : (state.paperSize === 'letter' ? 'letter' : 'a4');
      const doc = new window.jspdf.jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: format
      });

      const imgData = sheetCanvas.toDataURL('image/jpeg', 0.95);
      const pdfW = doc.internal.pageSize.getWidth();
      const pdfH = doc.internal.pageSize.getHeight();

      doc.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH);
      doc.save(`passport_sheet_${state.paperSize}_${state.copiesCount}_photos.pdf`);
    } catch (err) {
      alert('PDF generation error: ' + err.message);
    } finally {
      btns.forEach(b => {
        b.disabled = false;
        b.innerHTML = '<i class="ph-bold ph-file-pdf" style="color: #ef4444;"></i> Download A4 PDF';
      });
    }
  }

  if (btnDownloadSheetPdf) btnDownloadSheetPdf.addEventListener('click', executeDownloadSheetPdf);
  const btnStageDownloadSheet = document.getElementById('btnStageDownloadSheet');
  if (btnStageDownloadSheet) btnStageDownloadSheet.addEventListener('click', executeDownloadSheetPdf);

  // --- Action: Direct 1-Click Print (Window Print) ---
  function executePrintSheet() {
    if (!state.img) {
      alert('Please upload your photo first!');
      const fi = document.getElementById('passportFileInput');
      if (fi) fi.click();
      return;
    }
    renderSheetCanvas();
    window.print();
  }

  if (btnPrintSheet) btnPrintSheet.addEventListener('click', executePrintSheet);
  const btnStagePrintSheet = document.getElementById('btnStagePrintSheet');
  if (btnStagePrintSheet) btnStagePrintSheet.addEventListener('click', executePrintSheet);

  // --- Action: Download Sheet as PNG/JPG ---
  if (btnDownloadSheetImage) {
    btnDownloadSheetImage.addEventListener('click', () => {
      if (!sheetCanvas || !state.img) return;
      renderSheetCanvas();
      const url = sheetCanvas.toDataURL('image/jpeg', 0.95);
      const a = document.createElement('a');
      a.href = url;
      a.download = `passport_sheet_${state.paperSize}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }

  // Listen to target KB changes to update text
  if (targetKbInput) {
    targetKbInput.addEventListener('input', updateKbLabels);
  }
  updateKbLabels();
});
