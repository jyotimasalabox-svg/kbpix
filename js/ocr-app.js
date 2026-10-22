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
    currentTab: 'inplace', // Default to In-Place Document Editor so user edits directly on the paper!
    
    // Editor State
    docWidth: 0,
    docHeight: 0,
    scale: 1.0,
    activeOverlay: null,
    isWhiteoutMode: false,
    showGuides: true,
    fontSize: 16,
    fontColor: '#000000',
    fontFamily: 'Arial, sans-serif',
    isBold: false,
    
    // Layers
    detectedLines: [],  // Original detected OCR lines with bounding boxes
    textOverlays: [],   // Array of active user edits { id, lineIdx, x, y, width, height, text, fontSize, color, fontFamily, isBold, bgFill }
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

  // Fields Panel
  const btnToggleGuides = document.getElementById('btnToggleGuides');
  const detectedFieldsList = document.getElementById('detectedFieldsList');
  const detectedFieldsCount = document.getElementById('detectedFieldsCount');

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



  // Theme
  if (window.ThemeManager) {
    window.ThemeManager.init();
  } else {
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

    if (themeToggleBtn && !themeToggleBtn.dataset.themeBound) {
      themeToggleBtn.dataset.themeBound = 'true';
      themeToggleBtn.addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        setTheme(isDark ? 'light' : 'dark');
      });
    }

    initTheme();
  }

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
    if (tabRawText) tabRawText.classList.toggle('active', t === 'rawtext');
    if (tabInPlace) tabInPlace.classList.toggle('active', t === 'inplace');
    if (panelRawText) panelRawText.style.display = t === 'rawtext' ? 'block' : 'none';
    if (panelInPlace) panelInPlace.style.display = t === 'inplace' ? 'block' : 'none';
    if (t === 'inplace') {
      setTimeout(() => zoomToFit(), 50);
    }
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
    if (e.target.files && e.target.files[0]) {
      startSmartOCR(e.target.files[0]);
      ocrFileInput.value = '';
    }
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
      updateTextStats(result.text);

      const ocrSourceImg = document.getElementById('ocrSourceImg');
      if (ocrSourceImg) ocrSourceImg.src = img.src;
      const ocrConfidenceBadge = document.getElementById('ocrConfidenceBadge');
      if (ocrConfidenceBadge && result && result.confidence !== undefined) {
        ocrConfidenceBadge.textContent = `Confidence: ${Math.round(result.confidence)}%`;
      }

      // 4. Populate Detected Fields in right panel (Original document stays 100% clean and visible!)
      renderDetectedFieldsList(result.lines);

      ocrProgressCard.classList.remove('active');
      ocrWorkspace.style.display = 'block';

      // Switch to In-Place Document Editor so user can edit right on the paper
      switchTab('inplace');
      setTimeout(() => zoomToFit(), 60);

    } catch (err) {
      console.error('OCR Error', err);
      alert('Error during OCR recognition: ' + err.message);
      ocrProgressCard.classList.remove('active');
      ocrDropzone.style.display = 'block';
    }
  }

  // =========================================================================
  // 2. Detected Fields Management & Clean In-Place Overlay System
  // =========================================================================

  const ocrTextStatsBadge = document.getElementById('ocrTextStatsBadge');
  function updateTextStats(txt) {
    if (!ocrTextStatsBadge) return;
    const clean = (txt || '').trim();
    const words = clean ? clean.split(/\s+/).length : 0;
    const chars = (txt || '').length;
    ocrTextStatsBadge.textContent = `${words} Words • ${chars} Chars`;
  }

  if (ocrExtractedText) {
    ocrExtractedText.addEventListener('input', () => {
      updateTextStats(ocrExtractedText.value);
    });
  }

  // Populate list in right panel so user can choose which fields to edit
  function renderDetectedFieldsList(lines) {
    if (!detectedFieldsList) return;
    detectedFieldsList.innerHTML = '';
    state.detectedLines = lines || [];

    if (detectedFieldsCount) {
      detectedFieldsCount.textContent = state.detectedLines.length;
    }

    if (!lines || lines.length === 0) {
      detectedFieldsList.innerHTML = `
        <div style="color: var(--text-muted); font-size: 0.85rem; padding: 1.5rem 1rem; text-align: center;">
          <i class="ph-bold ph-info" style="font-size: 1.5rem; color: var(--primary); display: block; margin-bottom: 0.5rem;"></i>
          No text lines detected automatically. You can click <strong>Add Text</strong> above to type directly on any part of the document.
        </div>`;
      return;
    }

    lines.forEach((line, idx) => {
      const row = document.createElement('div');
      row.className = 'doc-field-row';
      row.id = `doc_field_row_${idx}`;

      const numBadge = document.createElement('span');
      numBadge.textContent = `#${idx + 1}`;
      numBadge.style.cssText = 'font-size: 0.72rem; font-weight: 800; color: #2563eb; background: rgba(37, 99, 235, 0.1); padding: 0.15rem 0.45rem; border-radius: 4px; flex-shrink: 0;';

      const textDiv = document.createElement('div');
      textDiv.className = 'doc-field-text';
      textDiv.textContent = line.text;
      textDiv.title = line.text;

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'button secondary small doc-field-edit-btn';
      editBtn.innerHTML = '<i class="ph-bold ph-pencil-simple"></i> Edit';
      editBtn.title = 'Edit or replace this text on the document';

      editBtn.addEventListener('click', () => {
        activateTextOverlayForLine(line, idx);
      });

      row.appendChild(numBadge);
      row.appendChild(textDiv);
      row.appendChild(editBtn);
      detectedFieldsList.appendChild(row);
    });

    updateGuidesDisplay();
  }

  // Activate an editable replacement box ONLY for the clicked field
  function activateTextOverlayForLine(line, idx) {
    const existingId = `overlay_line_${idx}`;
    let existingItem = state.textOverlays.find(o => o.id === existingId);

    if (existingItem) {
      const el = document.getElementById(existingId);
      if (el) {
        el.focus();
        selectElementContents(el);
      }
      return;
    }

    const bbox = line.bbox || { x0: 50, y0: 50, x1: 200, y1: 80 };
    const w = Math.max(50, (bbox.x1 - bbox.x0) + 10);
    const h = Math.max(18, (bbox.y1 - bbox.y0) + 4);
    const estFontSize = Math.max(12, Math.min(30, Math.round((bbox.y1 - bbox.y0) * 0.85)));

    const overlayItem = {
      id: existingId,
      lineIdx: idx,
      x: Math.max(0, bbox.x0 - 4),
      y: Math.max(0, bbox.y0 - 2),
      width: Math.round(w),
      height: Math.round(h),
      text: line.text,
      fontSize: estFontSize,
      color: state.fontColor || '#000000',
      fontFamily: state.fontFamily || 'Arial, sans-serif',
      isBold: false,
      bgFill: '#ffffff' // Whiteout background to cleanly cover old text
    };

    state.textOverlays.push(overlayItem);
    renderTextOverlayElement(overlayItem);

    // Focus and select contents
    const el = document.getElementById(existingId);
    if (el) {
      el.focus();
      selectElementContents(el);
    }

    // Highlight row in sidebar
    const row = document.getElementById(`doc_field_row_${idx}`);
    if (row) {
      row.style.borderColor = '#2563eb';
      row.style.background = 'rgba(37, 99, 235, 0.08)';
    }

    // Update guide box if visible
    updateGuidesDisplay();
  }

  function renderTextOverlayElement(item) {
    const el = document.createElement('div');
    el.className = 'doc-text-overlay';
    el.id = item.id;

    // Positioning
    el.style.left = `${item.x}px`;
    el.style.top = `${item.y}px`;
    el.style.minWidth = `${item.width}px`;
    el.style.backgroundColor = item.bgFill || '#ffffff';

    // Drag handle
    const dragHandle = document.createElement('span');
    dragHandle.className = 'doc-overlay-drag-handle';
    dragHandle.innerHTML = '<i class="ph-bold ph-dots-six-vertical"></i>';
    dragHandle.title = 'Drag to reposition';

    // Content box
    const content = document.createElement('span');
    content.className = 'doc-text-content';
    content.contentEditable = 'true';
    content.spellcheck = false;
    content.textContent = item.text;
    content.style.fontSize = `${item.fontSize}px`;
    content.style.color = item.color || '#000000';
    content.style.fontFamily = item.fontFamily || 'Arial, sans-serif';
    content.style.fontWeight = item.isBold ? 'bold' : 'normal';

    // Delete badge
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'doc-overlay-del-btn';
    delBtn.innerHTML = '&times;';
    delBtn.title = 'Remove this edit';
    delBtn.addEventListener('mousedown', (e) => e.stopPropagation());
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      el.remove();
      const idx = state.textOverlays.findIndex(o => o.id === item.id);
      if (idx !== -1) state.textOverlays.splice(idx, 1);
      if (item.lineIdx !== undefined) {
        const row = document.getElementById(`doc_field_row_${item.lineIdx}`);
        if (row) {
          row.style.borderColor = '';
          row.style.background = '';
        }
      }
      updateGuidesDisplay();
      syncExtractedText();
    });

    el.appendChild(dragHandle);
    el.appendChild(content);
    el.appendChild(delBtn);

    // Listen for edits
    content.addEventListener('input', () => {
      item.text = content.innerText;
      syncExtractedText();
    });

    content.addEventListener('focus', () => {
      state.activeOverlay = item;
      updateToolbarForActiveOverlay();
    });

    // Make draggable via drag handle
    makeDraggableWithHandle(el, dragHandle, item);

    docOverlayLayer.appendChild(el);
  }

  function selectElementContents(el) {
    const c = el.querySelector('.doc-text-content') || el;
    const range = document.createRange();
    range.selectNodeContents(c);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  // Render or clear transparent dashed guide outlines
  function updateGuidesDisplay() {
    const existingGuides = docOverlayLayer.querySelectorAll('.doc-guide-box');
    existingGuides.forEach(g => g.remove());

    if (!state.showGuides) return;

    (state.detectedLines || []).forEach((line, idx) => {
      if (state.textOverlays.some(o => o.lineIdx === idx)) return;
      const bbox = line.bbox;
      if (!bbox) return;

      const guide = document.createElement('div');
      guide.className = 'doc-guide-box';
      guide.style.left = `${bbox.x0}px`;
      guide.style.top = `${bbox.y0}px`;
      guide.style.width = `${Math.max(30, bbox.x1 - bbox.x0)}px`;
      guide.style.height = `${Math.max(16, bbox.y1 - bbox.y0)}px`;
      guide.title = `Click to edit on document: "${line.text}"`;

      guide.addEventListener('click', (e) => {
        e.stopPropagation();
        activateTextOverlayForLine(line, idx);
      });

      docOverlayLayer.appendChild(guide);
    });
  }

  if (btnToggleGuides) {
    btnToggleGuides.addEventListener('click', () => {
      state.showGuides = !state.showGuides;
      btnToggleGuides.classList.toggle('active', state.showGuides);
      updateGuidesDisplay();
    });
  }

  function syncExtractedText() {
    const allText = state.textOverlays.map(o => o.text.trim()).filter(Boolean).join('\n');
    if (allText) {
      ocrExtractedText.value = allText;
    }
  }

  function updateToolbarForActiveOverlay() {
    if (!state.activeOverlay) return;
    if (fontSizeLabel) fontSizeLabel.textContent = `${state.activeOverlay.fontSize}px`;
    if (fontFamilySelect) fontFamilySelect.value = state.activeOverlay.fontFamily;
    if (btnToggleBold) btnToggleBold.classList.toggle('active', state.activeOverlay.isBold);
  }

  function addNewTextAtPosition(posX, posY) {
    const newId = 'overlay_custom_' + Date.now();
    const x = Math.max(10, Math.min(state.docWidth - 160, posX));
    const y = Math.max(10, Math.min(state.docHeight - 40, posY));

    const newItem = {
      id: newId,
      x: Math.round(x),
      y: Math.round(y),
      width: 140,
      height: 28,
      text: 'Click to type',
      fontSize: state.fontSize || 16,
      color: state.fontColor || '#000000',
      fontFamily: state.fontFamily || 'Arial, sans-serif',
      isBold: state.isBold || false,
      bgFill: '#ffffff'
    };

    state.textOverlays.push(newItem);
    renderTextOverlayElement(newItem);

    const el = document.getElementById(newId);
    if (el) {
      el.focus();
      selectElementContents(el);
    }
    updateGuidesDisplay();
    syncExtractedText();
  }

  // Direct click anywhere on the document image to edit that text or add new text!
  if (docCanvasWrapper) {
    docCanvasWrapper.addEventListener('click', (e) => {
      if (state.isWhiteoutMode) return;
      if (e.target.closest('.doc-text-overlay') || e.target.closest('.doc-photo-overlay')) return;

      const rect = docCanvasWrapper.getBoundingClientRect();
      const clickX = (e.clientX - rect.left) / state.scale;
      const clickY = (e.clientY - rect.top) / state.scale;

      // Check if clicked near any detected line
      const matchedLineIdx = state.detectedLines.findIndex(l => {
        const b = l.bbox;
        if (!b) return false;
        return clickX >= (b.x0 - 8) && clickX <= (b.x1 + 8) &&
               clickY >= (b.y0 - 6) && clickY <= (b.y1 + 6);
      });

      if (matchedLineIdx !== -1) {
        activateTextOverlayForLine(state.detectedLines[matchedLineIdx], matchedLineIdx);
      } else {
        addNewTextAtPosition(Math.round(clickX), Math.round(clickY));
      }
    });
  }

  // Search Field Input Filter
  const searchFieldInput = document.getElementById('searchFieldInput');
  if (searchFieldInput) {
    searchFieldInput.addEventListener('input', () => {
      const q = searchFieldInput.value.toLowerCase().trim();
      const rows = document.querySelectorAll('.doc-field-row');
      rows.forEach(r => {
        const txt = r.textContent.toLowerCase();
        r.style.display = txt.includes(q) ? 'flex' : 'none';
      });
    });
  }

  // Edit All Fields Button
  const btnEditAllFields = document.getElementById('btnEditAllFields');
  if (btnEditAllFields) {
    btnEditAllFields.addEventListener('click', () => {
      (state.detectedLines || []).forEach((line, idx) => {
        activateTextOverlayForLine(line, idx);
      });
    });
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
    makePhotoDraggable(el, item);

    docOverlayLayer.appendChild(el);
  }

  function makeDraggableWithHandle(element, handle, dataItem) {
    let isDragging = false;
    let startX = 0, startY = 0;
    let origX = 0, origY = 0;

    handle.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      origX = dataItem.x;
      origY = dataItem.y;
      e.preventDefault();
      e.stopPropagation();
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = (e.clientX - startX) / state.scale;
      const dy = (e.clientY - startY) / state.scale;
      dataItem.x = Math.max(0, Math.min(state.docWidth - 30, Math.round(origX + dx)));
      dataItem.y = Math.max(0, Math.min(state.docHeight - 20, Math.round(origY + dy)));
      element.style.left = `${dataItem.x}px`;
      element.style.top = `${dataItem.y}px`;
    });

    window.addEventListener('mouseup', () => { isDragging = false; });
  }

  function makePhotoDraggable(element, dataItem) {
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
        if (el) {
          const c = el.querySelector('.doc-text-content') || el;
          c.style.fontSize = `${state.activeOverlay.fontSize}px`;
        }
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
        if (el) {
          const c = el.querySelector('.doc-text-content') || el;
          c.style.fontSize = `${state.activeOverlay.fontSize}px`;
        }
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
        if (el) {
          const c = el.querySelector('.doc-text-content') || el;
          c.style.color = col;
        }
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
        if (el) {
          const c = el.querySelector('.doc-text-content') || el;
          c.style.fontFamily = fam;
        }
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
        if (el) {
          const c = el.querySelector('.doc-text-content') || el;
          c.style.fontWeight = state.activeOverlay.isBold ? 'bold' : 'normal';
        }
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
        state.textOverlays.forEach(o => {
          const el = document.getElementById(o.id);
          if (el) el.remove();
        });
        state.textOverlays = [];
        const rows = document.querySelectorAll('.doc-field-row');
        rows.forEach(r => { r.style.borderColor = ''; r.style.background = ''; });
        updateGuidesDisplay();
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
      let currentText = item.text;
      if (el) {
        const c = el.querySelector('.doc-text-content');
        currentText = c ? c.innerText : item.text;
      }
      if (!currentText.trim()) return;

      // Fill white background to cleanly hide old printed text underneath
      ctx.fillStyle = item.bgFill || '#ffffff';
      ctx.fillRect(item.x - 2, item.y - 2, item.width + 6, item.height + 4);

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
