/**
 * PhotoResize Pro — Smart Document Editor & OCR Controller
 * In-Place Document Editing: Edit text directly on the document image,
 * add/replace candidate photo/stamp, whiteout mistakes, and export as JPG/PDF.
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // --- State ---
  const state = {
    file: null,
    image: null,
    ocrResult: null,
    selectedLang: 'eng',
    currentTab: 'inplace', // 'inplace' or 'rawtext'
    
    // Editor State
    docWidth: 0,
    docHeight: 0,
    scale: 1.0,
    activeOverlay: null,
    isWhiteoutMode: false,
    fontSize: 16,
    fontColor: '#000000',
    fontFamily: 'Arial, sans-serif',
    isBold: false,
    
    // Layers
    textOverlays: [],   // Array of { id, x, y, width, height, text, fontSize, color, fontFamily, isBold, bgFill }
    photoOverlays: [],  // Array of { id, x, y, width, height, imgElement }
    whiteoutRects: []   // Array of { x, y, width, height, color }
  };

  // --- DOM Elements ---
  const ocrDropzone = document.getElementById('ocrDropzone');
  const ocrFileInput = document.getElementById('ocrFileInput');
  const ocrProgressCard = document.getElementById('ocrProgressCard');
  const ocrProgressBar = document.getElementById('ocrProgressBar');
  const ocrProgressText = document.getElementById('ocrProgressText');
  const ocrWorkspace = document.getElementById('ocrWorkspace');

  // Tabs
  const tabInPlace = document.getElementById('tabInPlace');
  const tabRawText = document.getElementById('tabRawText');
  const panelInPlace = document.getElementById('panelInPlace');
  const panelRawText = document.getElementById('panelRawText');

  // In-Place Editor Canvas & Overlays
  const docCanvasWrapper = document.getElementById('docCanvasWrapper');
  const docBgCanvas = document.getElementById('docBgCanvas');
  const docOverlayLayer = document.getElementById('docOverlayLayer');

  // Toolbar Buttons
  const btnAddText = document.getElementById('btnAddText');
  const btnAddPhoto = document.getElementById('btnAddPhoto');
  const photoFileInput = document.getElementById('photoFileInput');
  const btnWhiteout = document.getElementById('btnWhiteout');
  const btnFontDec = document.getElementById('btnFontDec');
  const btnFontInc = document.getElementById('btnFontInc');
  const fontSizeLabel = document.getElementById('fontSizeLabel');
  const colorPickerBtns = document.querySelectorAll('.doc-color-btn');
  const fontFamilySelect = document.getElementById('fontFamilySelect');
  const btnToggleBold = document.getElementById('btnToggleBold');
  const btnClearEdits = document.getElementById('btnClearEdits');
  const btnZoomIn = document.getElementById('btnZoomIn');
  const btnZoomOut = document.getElementById('btnZoomOut');
  const btnZoomFit = document.getElementById('btnZoomFit');

  // Downloads
  const btnDownloadEditedJpg = document.getElementById('btnDownloadEditedJpg');
  const btnDownloadEditedPng = document.getElementById('btnDownloadEditedPng');
  const btnDownloadEditedPdf = document.getElementById('btnDownloadEditedPdf');

  // Raw Text Elements
  const ocrExtractedText = document.getElementById('ocrExtractedText');
  const btnCopyText = document.getElementById('btnCopyText');
  const btnDownloadTxt = document.getElementById('btnDownloadTxt');
  const btnDownloadDocx = document.getElementById('btnDownloadDocx');
  const btnDownloadSearchablePdf = document.getElementById('btnDownloadSearchablePdf');
  const btnOcrAnother = document.getElementById('btnOcrAnother');

  // Language Pills
  const langPills = document.querySelectorAll('.preset-btn[data-ocr-lang]');

  // Camera
  const btnOcrCamera = document.getElementById('btnOcrCamera');
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

  // Theme
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIcon = document.getElementById('themeIcon');
  const themeText = document.getElementById('themeText');

  function initTheme() {
    const saved = localStorage.getItem('photo_theme') || 'light';
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

  // Language selection
  langPills.forEach(pill => {
    pill.addEventListener('click', () => {
      langPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.selectedLang = pill.dataset.ocrLang;
      if (state.file && ocrWorkspace.style.display !== 'none') {
        startSmartOCR(state.file);
      }
    });
  });

  // Tab switching
  if (tabInPlace && tabRawText) {
    tabInPlace.addEventListener('click', () => switchTab('inplace'));
    tabRawText.addEventListener('click', () => switchTab('rawtext'));
  }

  function switchTab(t) {
    state.currentTab = t;
    tabInPlace.classList.toggle('active', t === 'inplace');
    tabRawText.classList.toggle('active', t === 'rawtext');
    panelInPlace.style.display = t === 'inplace' ? 'block' : 'none';
    panelRawText.style.display = t === 'rawtext' ? 'block' : 'none';
  }

  // =========================================================================
  // 1. Upload & Smart OCR Execution
  // =========================================================================
  ocrDropzone.addEventListener('click', (e) => {
    if (e.target.closest('#btnOcrCamera')) return;
    ocrFileInput.click();
  });

  ['dragenter', 'dragover'].forEach(n => {
    ocrDropzone.addEventListener(n, (e) => { e.preventDefault(); ocrDropzone.classList.add('drag-active'); });
  });
  ['dragleave', 'drop'].forEach(n => {
    ocrDropzone.addEventListener(n, (e) => { e.preventDefault(); ocrDropzone.classList.remove('drag-active'); });
  });

  ocrDropzone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files && e.dataTransfer.files[0]) startSmartOCR(e.dataTransfer.files[0]);
  });
  ocrFileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) startSmartOCR(e.target.files[0]);
  });

  if (btnOcrAnother) {
    btnOcrAnother.addEventListener('click', () => {
      ocrWorkspace.style.display = 'none';
      ocrDropzone.style.display = 'block';
      ocrFileInput.click();
    });
  }

  async function startSmartOCR(file) {
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    state.file = file;
    state.textOverlays = [];
    state.photoOverlays = [];
    state.whiteoutRects = [];
    docOverlayLayer.innerHTML = '';

    ocrDropzone.style.display = 'none';
    ocrProgressCard.classList.add('active');
    ocrProgressBar.style.width = '15%';
    ocrProgressText.textContent = 'Loading and enhancing document clarity...';

    try {
      // 1. Load image
      const img = new Image();
      const imgLoaded = new Promise(resolve => { img.onload = resolve; });
      img.src = URL.createObjectURL(file);
      await imgLoaded;

      state.image = img;
      state.docWidth = img.naturalWidth || img.width;
      state.docHeight = img.naturalHeight || img.height;

      // 2. Initialize Canvas
      docBgCanvas.width = state.docWidth;
      docBgCanvas.height = state.docHeight;
      const ctx = docBgCanvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      // Wrapper match
      docCanvasWrapper.style.width = `${state.docWidth}px`;
      docCanvasWrapper.style.height = `${state.docHeight}px`;

      // 3. Run Smart OCR with preprocessing
      const result = await window.OCREngine.recognizeImage(img, {
        language: state.selectedLang,
        usePreprocessing: true,
        onProgress: (pct, msg) => {
          ocrProgressBar.style.width = `${pct}%`;
          ocrProgressText.textContent = msg;
        }
      });

      state.ocrResult = result;
      ocrExtractedText.value = result.text;

      const ocrSourceImg = document.getElementById('ocrSourceImg');
      if (ocrSourceImg) ocrSourceImg.src = img.src;
      const ocrConfidenceBadge = document.getElementById('ocrConfidenceBadge');
      if (ocrConfidenceBadge && result && result.confidence !== undefined) {
        ocrConfidenceBadge.textContent = `Confidence: ${Math.round(result.confidence)}%`;
      }

      // 4. Populate in-place editable overlays
      buildInPlaceTextOverlays(result.lines);

      ocrProgressCard.classList.remove('active');
      ocrWorkspace.style.display = 'block';

      // Auto zoom to fit viewport
      zoomToFit();

    } catch (err) {
      console.error('OCR Error', err);
      alert('Error during OCR recognition: ' + err.message);
      ocrProgressCard.classList.remove('active');
      ocrDropzone.style.display = 'block';
    }
  }

  // =========================================================================
  // 2. Build In-Place Editable Text Overlays on the Document
  // =========================================================================
  function buildInPlaceTextOverlays(lines) {
    docOverlayLayer.innerHTML = '';
    state.textOverlays = [];

    lines.forEach((line, idx) => {
      const bbox = line.bbox;
      if (!bbox) return;

      const x = bbox.x0;
      const y = bbox.y0;
      const w = Math.max(20, bbox.x1 - bbox.x0);
      const h = Math.max(14, bbox.y1 - bbox.y0);

      // Estimate font size based on bounding box height
      const estFontSize = Math.max(11, Math.min(36, Math.round(h * 0.85)));

      const overlayItem = {
        id: 'overlay_' + idx,
        x,
        y,
        width: w,
        height: h,
        text: line.text,
        fontSize: estFontSize,
        color: '#000000',
        fontFamily: 'Arial, sans-serif',
        isBold: false,
        bgFill: '#ffffff'
      };

      state.textOverlays.push(overlayItem);
      renderTextOverlayElement(overlayItem);
    });
  }

  function renderTextOverlayElement(item) {
    const el = document.createElement('div');
    el.className = 'doc-text-overlay';
    el.id = item.id;
    el.contentEditable = 'true';
    el.spellcheck = false;
    el.textContent = item.text;

    // Positioning
    el.style.left = `${item.x}px`;
    el.style.top = `${item.y}px`;
    el.style.minWidth = `${item.width}px`;
    el.style.minHeight = `${item.height}px`;
    el.style.fontSize = `${item.fontSize}px`;
    el.style.color = item.color;
    el.style.fontFamily = item.fontFamily;
    el.style.fontWeight = item.isBold ? 'bold' : 'normal';
    el.style.backgroundColor = item.bgFill;

    // Listen for edits
    el.addEventListener('input', () => {
      item.text = el.innerText;
      syncExtractedText();
    });

    el.addEventListener('focus', () => {
      state.activeOverlay = item;
      updateToolbarForActiveOverlay();
    });

    docOverlayLayer.appendChild(el);
  }

  function syncExtractedText() {
    const allText = state.textOverlays.map(o => o.text.trim()).filter(Boolean).join('\n');
    ocrExtractedText.value = allText;
  }

  function updateToolbarForActiveOverlay() {
    if (!state.activeOverlay) return;
    if (fontSizeLabel) fontSizeLabel.textContent = `${state.activeOverlay.fontSize}px`;
    if (fontFamilySelect) fontFamilySelect.value = state.activeOverlay.fontFamily;
    if (btnToggleBold) btnToggleBold.classList.toggle('active', state.activeOverlay.isBold);
  }

  // =========================================================================
  // 3. Interactive In-Place Toolbar Tools
  // =========================================================================

  // A. Add New Text anywhere
  if (btnAddText) {
    btnAddText.addEventListener('click', () => {
      const newId = 'overlay_custom_' + Date.now();
      const scrollLeft = docCanvasWrapper.parentElement.scrollLeft || 0;
      const scrollTop = docCanvasWrapper.parentElement.scrollTop || 0;

      // Position in center of current visible view
      const centerX = Math.max(40, Math.min(state.docWidth - 200, (scrollLeft + 150) / state.scale));
      const centerY = Math.max(40, Math.min(state.docHeight - 60, (scrollTop + 150) / state.scale));

      const newItem = {
        id: newId,
        x: Math.round(centerX),
        y: Math.round(centerY),
        width: 140,
        height: 28,
        text: 'नया टेक्स्ट / New Text',
        fontSize: state.fontSize,
        color: state.fontColor,
        fontFamily: state.fontFamily,
        isBold: state.isBold,
        bgFill: '#ffffff'
      };

      state.textOverlays.push(newItem);
      renderTextOverlayElement(newItem);

      const el = document.getElementById(newId);
      if (el) {
        el.focus();
        // Select all text in element
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
    });
  }

  // B. Add / Replace Photo (Candidate photo, stamp, signature)
  if (btnAddPhoto && photoFileInput) {
    btnAddPhoto.addEventListener('click', () => photoFileInput.click());

    photoFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        const pFile = e.target.files[0];
        const pImg = new Image();
        pImg.onload = () => {
          addPhotoOverlayToDoc(pImg);
        };
        pImg.src = URL.createObjectURL(pFile);
        photoFileInput.value = '';
      }
    });
  }

  function addPhotoOverlayToDoc(imgElement) {
    const id = 'photo_overlay_' + Date.now();
    const defaultW = Math.min(220, Math.round(state.docWidth * 0.25));
    const defaultH = Math.round(defaultW * (imgElement.height / imgElement.width));

    const item = {
      id,
      x: Math.round(state.docWidth - defaultW - 40),
      y: 60,
      width: defaultW,
      height: defaultH,
      imgElement
    };

    state.photoOverlays.push(item);

    const el = document.createElement('div');
    el.className = 'doc-photo-overlay';
    el.id = id;
    el.style.left = `${item.x}px`;
    el.style.top = `${item.y}px`;
    el.style.width = `${item.width}px`;
    el.style.height = `${item.height}px`;

    const img = document.createElement('img');
    img.src = imgElement.src;
    el.appendChild(img);

    // Delete badge
    const delBtn = document.createElement('button');
    delBtn.className = 'doc-overlay-del-btn';
    delBtn.innerHTML = '&times;';
    delBtn.title = 'Remove Photo';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      el.remove();
      const idx = state.photoOverlays.findIndex(p => p.id === id);
      if (idx !== -1) state.photoOverlays.splice(idx, 1);
    });
    el.appendChild(delBtn);

    // Dragging support
    makeElementDraggable(el, item);

    docOverlayLayer.appendChild(el);
  }

  function makeElementDraggable(element, dataItem) {
    let isDragging = false;
    let startX = 0, startY = 0;
    let origX = 0, origY = 0;

    element.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('doc-overlay-del-btn')) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      origX = dataItem.x;
      origY = dataItem.y;
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = (e.clientX - startX) / state.scale;
      const dy = (e.clientY - startY) / state.scale;
      dataItem.x = Math.max(0, Math.min(state.docWidth - dataItem.width, Math.round(origX + dx)));
      dataItem.y = Math.max(0, Math.min(state.docHeight - dataItem.height, Math.round(origY + dy)));
      element.style.left = `${dataItem.x}px`;
      element.style.top = `${dataItem.y}px`;
    });

    window.addEventListener('mouseup', () => { isDragging = false; });
  }

  // C. Whiteout / Eraser Mode
  if (btnWhiteout) {
    btnWhiteout.addEventListener('click', () => {
      state.isWhiteoutMode = !state.isWhiteoutMode;
      btnWhiteout.classList.toggle('active', state.isWhiteoutMode);
      docCanvasWrapper.style.cursor = state.isWhiteoutMode ? 'crosshair' : 'default';
    });

    // Whiteout draw drag on canvas
    let isDrawingWhiteout = false;
    let woStartX = 0, woStartY = 0;

    docCanvasWrapper.addEventListener('mousedown', (e) => {
      if (!state.isWhiteoutMode) return;
      if (e.target !== docBgCanvas) return;
      const rect = docCanvasWrapper.getBoundingClientRect();
      woStartX = (e.clientX - rect.left) / state.scale;
      woStartY = (e.clientY - rect.top) / state.scale;
      isDrawingWhiteout = true;
      e.preventDefault();
    });

    docCanvasWrapper.addEventListener('mouseup', (e) => {
      if (!isDrawingWhiteout) return;
      isDrawingWhiteout = false;
      const rect = docCanvasWrapper.getBoundingClientRect();
      const curX = (e.clientX - rect.left) / state.scale;
      const curY = (e.clientY - rect.top) / state.scale;

      const rx = Math.round(Math.min(woStartX, curX));
      const ry = Math.round(Math.min(woStartY, curY));
      const rw = Math.round(Math.abs(curX - woStartX));
      const rh = Math.round(Math.abs(curY - woStartY));

      if (rw > 5 && rh > 5) {
        state.whiteoutRects.push({ x: rx, y: ry, width: rw, height: rh, color: '#ffffff' });
        // Draw whiteout on canvas
        const ctx = docBgCanvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(rx, ry, rw, rh);
      }
    });
  }

  // D. Font Size Controls
  if (btnFontInc) {
    btnFontInc.addEventListener('click', () => {
      if (state.activeOverlay) {
        state.activeOverlay.fontSize = Math.min(60, state.activeOverlay.fontSize + 2);
        const el = document.getElementById(state.activeOverlay.id);
        if (el) el.style.fontSize = `${state.activeOverlay.fontSize}px`;
        if (fontSizeLabel) fontSizeLabel.textContent = `${state.activeOverlay.fontSize}px`;
      } else {
        state.fontSize = Math.min(60, state.fontSize + 2);
        if (fontSizeLabel) fontSizeLabel.textContent = `${state.fontSize}px`;
      }
    });
  }

  if (btnFontDec) {
    btnFontDec.addEventListener('click', () => {
      if (state.activeOverlay) {
        state.activeOverlay.fontSize = Math.max(9, state.activeOverlay.fontSize - 2);
        const el = document.getElementById(state.activeOverlay.id);
        if (el) el.style.fontSize = `${state.activeOverlay.fontSize}px`;
        if (fontSizeLabel) fontSizeLabel.textContent = `${state.activeOverlay.fontSize}px`;
      } else {
        state.fontSize = Math.max(9, state.fontSize - 2);
        if (fontSizeLabel) fontSizeLabel.textContent = `${state.fontSize}px`;
      }
    });
  }

  // E. Color Selection
  colorPickerBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      colorPickerBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const col = btn.dataset.color;
      state.fontColor = col;
      if (state.activeOverlay) {
        state.activeOverlay.color = col;
        const el = document.getElementById(state.activeOverlay.id);
        if (el) el.style.color = col;
      }
    });
  });

  // F. Font Family Selection
  if (fontFamilySelect) {
    fontFamilySelect.addEventListener('change', () => {
      const fam = fontFamilySelect.value;
      state.fontFamily = fam;
      if (state.activeOverlay) {
        state.activeOverlay.fontFamily = fam;
        const el = document.getElementById(state.activeOverlay.id);
        if (el) el.style.fontFamily = fam;
      }
    });
  }

  // G. Bold Toggle
  if (btnToggleBold) {
    btnToggleBold.addEventListener('click', () => {
      if (state.activeOverlay) {
        state.activeOverlay.isBold = !state.activeOverlay.isBold;
        btnToggleBold.classList.toggle('active', state.activeOverlay.isBold);
        const el = document.getElementById(state.activeOverlay.id);
        if (el) el.style.fontWeight = state.activeOverlay.isBold ? 'bold' : 'normal';
      } else {
        state.isBold = !state.isBold;
        btnToggleBold.classList.toggle('active', state.isBold);
      }
    });
  }

  // H. Reset Edits
  if (btnClearEdits) {
    btnClearEdits.addEventListener('click', () => {
      if (!confirm('Revert all edits back to original scanned document?')) return;
      if (state.image) {
        const ctx = docBgCanvas.getContext('2d');
        ctx.drawImage(state.image, 0, 0);
        state.whiteoutRects = [];
        state.photoOverlays.forEach(p => {
          const el = document.getElementById(p.id);
          if (el) el.remove();
        });
        state.photoOverlays = [];
        if (state.ocrResult && state.ocrResult.lines) {
          buildInPlaceTextOverlays(state.ocrResult.lines);
        }
      }
    });
  }

  // I. Zoom Controls
  if (btnZoomIn) btnZoomIn.addEventListener('click', () => setZoom(state.scale + 0.15));
  if (btnZoomOut) btnZoomOut.addEventListener('click', () => setZoom(state.scale - 0.15));
  if (btnZoomFit) btnZoomFit.addEventListener('click', zoomToFit);

  function setZoom(val) {
    state.scale = Math.max(0.3, Math.min(2.5, val));
    docCanvasWrapper.style.transform = `scale(${state.scale})`;
    docCanvasWrapper.style.transformOrigin = 'top center';
  }

  function zoomToFit() {
    const parentW = docCanvasWrapper.parentElement.clientWidth - 40;
    if (parentW > 0 && state.docWidth > 0) {
      const fitScale = Math.min(1.0, parentW / state.docWidth);
      setZoom(fitScale);
    }
  }

  window.addEventListener('resize', () => {
    if (state.docWidth > 0) zoomToFit();
  });

  // =========================================================================
  // 4. Final Render & High-Resolution Export
  // =========================================================================

  // Combine background canvas + whiteouts + all text overlays + photo overlays into 1 high-res canvas
  function renderCompositeCanvas() {
    const outCanvas = document.createElement('canvas');
    outCanvas.width = state.docWidth;
    outCanvas.height = state.docHeight;
    const ctx = outCanvas.getContext('2d');

    // 1. Draw base document image
    ctx.drawImage(state.image, 0, 0);

    // 2. Draw whiteouts
    state.whiteoutRects.forEach(r => {
      ctx.fillStyle = r.color || '#ffffff';
      ctx.fillRect(r.x, r.y, r.width, r.height);
    });

    // 3. Draw text overlays (with whiteout background fill to hide original text)
    state.textOverlays.forEach(item => {
      const el = document.getElementById(item.id);
      const currentText = el ? el.innerText : item.text;
      if (!currentText.trim()) return;

      // Fill white background to cleanly hide old printed text underneath
      ctx.fillStyle = item.bgFill || '#ffffff';
      ctx.fillRect(item.x - 2, item.y - 2, item.width + 4, item.height + 4);

      // Draw updated text
      ctx.fillStyle = item.color || '#000000';
      ctx.font = `${item.isBold ? 'bold ' : ''}${item.fontSize}px ${item.fontFamily || 'Arial'}`;
      ctx.textBaseline = 'top';

      // Split lines if any
      const lines = currentText.split('\n');
      let curY = item.y + 1;
      lines.forEach(l => {
        ctx.fillText(l, item.x + 2, curY);
        curY += (item.fontSize * 1.2);
      });
    });

    // 4. Draw photo overlays (candidate photos, stamps, signatures)
    state.photoOverlays.forEach(p => {
      if (p.imgElement) {
        ctx.drawImage(p.imgElement, p.x, p.y, p.width, p.height);
      }
    });

    return outCanvas;
  }

  // Export 1: JPG
  if (btnDownloadEditedJpg) {
    btnDownloadEditedJpg.addEventListener('click', () => {
      if (!state.image) return;
      const composite = renderCompositeCanvas();
      composite.toBlob((blob) => {
        const base = state.file ? state.file.name.replace(/\.[^/.]+$/, '') : 'document';
        window.OCREngine.saveBlob(blob, `${base}_edited.jpg`);
      }, 'image/jpeg', 0.95);
    });
  }

  // Export 2: PNG
  if (btnDownloadEditedPng) {
    btnDownloadEditedPng.addEventListener('click', () => {
      if (!state.image) return;
      const composite = renderCompositeCanvas();
      composite.toBlob((blob) => {
        const base = state.file ? state.file.name.replace(/\.[^/.]+$/, '') : 'document';
        window.OCREngine.saveBlob(blob, `${base}_edited.png`);
      }, 'image/png');
    });
  }

  // Export 3: High-Res PDF
  if (btnDownloadEditedPdf) {
    btnDownloadEditedPdf.addEventListener('click', async () => {
      if (!state.image) return;

      if (!window.jspdf || !window.jspdf.jsPDF) {
        await window.OCREngine.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      }

      const composite = renderCompositeCanvas();
      const imgData = composite.toDataURL('image/jpeg', 0.95);

      const isLandscape = state.docWidth > state.docHeight;
      const doc = new window.jspdf.jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 10;
      const availW = pageW - margin * 2;
      const availH = pageH - margin * 2;

      const imgRatio = state.docWidth / state.docHeight;
      let drawW = availW;
      let drawH = drawW / imgRatio;

      if (drawH > availH) {
        drawH = availH;
        drawW = drawH * imgRatio;
      }

      const posX = margin + (availW - drawW) / 2;
      const posY = margin + (availH - drawH) / 2;

      doc.addImage(imgData, 'JPEG', posX, posY, drawW, drawH);

      const base = state.file ? state.file.name.replace(/\.[^/.]+$/, '') : 'document';
      doc.save(`${base}_edited.pdf`);
    });
  }

  // =========================================================================
  // 5. Raw Text Panel Handlers (Copy, TXT, DOCX, Searchable PDF)
  // =========================================================================
  if (btnCopyText) {
    btnCopyText.addEventListener('click', () => {
      if (!ocrExtractedText.value) return;
      navigator.clipboard.writeText(ocrExtractedText.value).then(() => {
        const orig = btnCopyText.innerHTML;
        btnCopyText.innerHTML = '<i class="ph-bold ph-check"></i> Copied!';
        setTimeout(() => { btnCopyText.innerHTML = orig; }, 2000);
      });
    });
  }

  if (btnDownloadTxt) {
    btnDownloadTxt.addEventListener('click', () => {
      if (!ocrExtractedText.value) return;
      window.OCREngine.downloadTXT(ocrExtractedText.value, 'extracted_text.txt');
    });
  }

  if (btnDownloadDocx) {
    btnDownloadDocx.addEventListener('click', () => {
      if (!ocrExtractedText.value) return;
      window.OCREngine.downloadDOCX(ocrExtractedText.value, 'extracted_document.doc');
    });
  }

  if (btnDownloadSearchablePdf) {
    btnDownloadSearchablePdf.addEventListener('click', () => {
      if (!ocrExtractedText.value) return;
      window.OCREngine.downloadSearchablePDF(ocrExtractedText.value, 'searchable_ocr_document.pdf');
    });
  }

  // =========================================================================
  // 6. Camera Support
  // =========================================================================
  if (btnOcrCamera) {
    btnOcrCamera.addEventListener('click', async () => {
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
        const file = new File([blob], 'camera_document.jpg', { type: 'image/jpeg' });
        stopCamera();
        startSmartOCR(file);
      }, 'image/jpeg', 0.95);
    });
  }

});
