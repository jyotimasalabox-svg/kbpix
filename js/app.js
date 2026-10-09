/**
 * Main Application Script for Pi7 Style Image Reducer
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
    activeCompareId: null
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

  // Theme Toggle
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIcon = document.getElementById('themeIcon');
  const themeText = document.getElementById('themeText');

  // Mobile Menu
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const navLinks = document.getElementById('navLinks');

  // ==========================================
  // Initialization & Theme
  // ==========================================
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

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      setTheme(isDark ? 'light' : 'dark');
    });
  }

  if (mobileMenuToggle && navLinks) {
    mobileMenuToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
  }

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
  dropzone.addEventListener('click', () => fileInput.click());

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
      const isError = item.status === 'error';

      // Savings calculation
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
        <div class="file-actions">
          ${isDone ? `
            <button class="btn-card-action" onclick="window.openCompare('${item.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
              Compare
            </button>
            <button class="btn-card-download" onclick="window.downloadSingle('${item.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download
            </button>
          ` : isProcessing ? `
            <span style="font-size: 0.9rem; font-weight: 600; color: var(--primary);">Compressing...</span>
          ` : `
            <span style="font-size: 0.85rem; color: var(--text-muted);">Ready to compress</span>
          `}
          <button class="btn-card-remove" onclick="window.removeFile('${item.id}')" title="Remove">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      `;

      fileCardsList.appendChild(card);
    });

    // Check if all files are done to show batch download
    const doneCount = state.files.filter(f => f.status === 'done').length;
    downloadAllBtn.style.display = doneCount > 0 ? 'inline-flex' : 'none';
  }

  function updateUIState() {
    const hasFiles = state.files.length > 0;
    compressBtn.disabled = !hasFiles || state.isProcessing;
    clearAllBtn.style.display = hasFiles ? 'inline-block' : 'none';
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
  // Compression Execution
  // ==========================================
  compressBtn.addEventListener('click', async () => {
    if (state.files.length === 0 || state.isProcessing) return;

    state.isProcessing = true;
    updateUIState();
    progressCard.classList.add('active');

    // Calculate options
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

    setTimeout(() => {
      progressCard.classList.remove('active');
      state.isProcessing = false;
      updateUIState();
      renderFileList();
    }, 1200);
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

    // Build nice filename: name-reduced-50kb.jpg
    const ext = item.compBlob.type === 'image/webp' ? '.webp' : (item.compBlob.type === 'image/png' ? '.png' : '.jpg');
    const baseName = item.file.name.replace(/\.[^/.]+$/, '');
    const filename = `${baseName}_reduced_${state.targetSize}${state.unit}${ext}`;

    triggerDownload(item.compUrl, filename);
  };

  downloadAllBtn.addEventListener('click', async () => {
    const doneItems = state.files.filter(f => f.status === 'done' && f.compBlob);
    if (doneItems.length === 0) return;

    if (doneItems.length === 1) {
      window.downloadSingle(doneItems[0].id);
      return;
    }

    // Multiple files: Zip them using local JSZip
    downloadAllBtn.disabled = true;
    downloadAllBtn.textContent = 'Creating ZIP...';

    try {
      if (typeof JSZip === 'undefined') {
        // Fallback if JSZip is somehow missing: download each file
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
