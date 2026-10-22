/**
 * Increase Image Size in KB/MB/GB - Application Controller
 * High-performance padding engine guaranteeing exact requested file size.
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const state = {
    file: null,
    origUrl: null,
    paddedBlob: null,
    paddedUrl: null,
    targetSize: 100,
    unit: 'KB',
    isProcessing: false
  };

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const sizeInput = document.getElementById('sizeInput');
  const increaseUnitSelect = document.getElementById('increaseUnitSelect');
  const stepUpBtn = document.getElementById('stepUpBtn');
  const stepDownBtn = document.getElementById('stepDownBtn');
  const presetBtns = document.querySelectorAll('.preset-btn');
  const increaseBtn = document.getElementById('increaseBtn');
  const progressCard = document.getElementById('progressCard');
  const progressStatus = document.getElementById('progressStatus');
  const resultCard = document.getElementById('resultCard');

  const origSizeEl = document.getElementById('origSizeEl');
  const targetSizeEl = document.getElementById('targetSizeEl');
  const newSizeEl = document.getElementById('newSizeEl');
  const previewImg = document.getElementById('previewImg');
  const downloadBtn = document.getElementById('downloadBtn');

  // Theme
  if (window.ThemeManager) {
    window.ThemeManager.init();
  } else {
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeIcon = document.getElementById('themeIcon');
    const themeText = document.getElementById('themeText');

    function initTheme() {
      const savedTheme = localStorage.getItem('photo_theme') || 'light';
      if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (themeIcon) themeIcon.textContent = '☀️';
        if (themeText) themeText.textContent = 'Light';
      }
    }

    if (themeToggleBtn && !themeToggleBtn.dataset.themeBound) {
      themeToggleBtn.dataset.themeBound = 'true';
      themeToggleBtn.addEventListener('click', () => {
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

    initTheme();
  }

  // Presets & Size Input
  function updateTargetSize() {
    let val = parseFloat(sizeInput.value);
    if (isNaN(val) || val <= 0) val = 100;
    state.targetSize = val;
    if (increaseUnitSelect) state.unit = increaseUnitSelect.value || 'KB';

    presetBtns.forEach(btn => {
      const bSize = parseFloat(btn.dataset.size);
      const bUnit = btn.dataset.unit || 'KB';
      if (bSize === val && bUnit === state.unit) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const increaseBtnKbLabel = document.getElementById('increaseBtnKbLabel');
    if (increaseBtnKbLabel) increaseBtnKbLabel.textContent = `${val} ${state.unit}`;
    if (targetSizeEl) targetSizeEl.textContent = `${val} ${state.unit}`;
  }

  if (sizeInput) sizeInput.addEventListener('input', updateTargetSize);
  if (increaseUnitSelect) increaseUnitSelect.addEventListener('change', updateTargetSize);

  if (stepUpBtn) {
    stepUpBtn.addEventListener('click', () => {
      sizeInput.value = parseFloat(sizeInput.value || 0) + (state.unit === 'GB' ? 1 : (state.unit === 'MB' ? 1 : 10));
      updateTargetSize();
    });
  }

  if (stepDownBtn) {
    stepDownBtn.addEventListener('click', () => {
      const step = (state.unit === 'GB' ? 1 : (state.unit === 'MB' ? 1 : 10));
      sizeInput.value = Math.max(1, parseFloat(sizeInput.value || 0) - step);
      updateTargetSize();
    });
  }

  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      sizeInput.value = btn.dataset.size;
      if (btn.dataset.unit && increaseUnitSelect) {
        increaseUnitSelect.value = btn.dataset.unit;
      }
      updateTargetSize();
    });
  });

  // Dropzone & Select File Button
  const btnSelectFile = dropzone ? dropzone.querySelector('.btn-select-file') : null;
  if (btnSelectFile) {
    btnSelectFile.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });
  }
  if (dropzone) {
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
        handleFile(e.dataTransfer.files[0]);
      }
    });
  }
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
        fileInput.value = '';
      }
    });
  }

  function handleFile(file) {
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      return;
    }
    state.file = file;
    state.origUrl = URL.createObjectURL(file);
    state.paddedBlob = null;
    state.paddedUrl = null;
    previewImg.src = state.origUrl;
    origSizeEl.textContent = ImageCompressor.formatBytes(file.size);
    targetSizeEl.textContent = `${state.targetSize} ${state.unit}`;
    increaseBtn.disabled = false;
    resultCard.style.display = 'block';
    newSizeEl.textContent = 'Ready to download';
    downloadBtn.style.display = 'inline-flex';

    // If current file is already larger than target size, suggest a higher target
    let curUnitBytes = 1024;
    if (state.unit === 'MB') curUnitBytes = 1024 * 1024;
    else if (state.unit === 'GB') curUnitBytes = 1024 * 1024 * 1024;

    const currentValInUnits = file.size / curUnitBytes;
    if (currentValInUnits >= state.targetSize) {
      const suggested = Math.ceil(currentValInUnits + (state.unit === 'KB' ? 20 : 1));
      sizeInput.value = suggested;
      updateTargetSize();
    }
  }

  // Increase Execution
  async function executeIncreaseAndDownload(autoTriggerDownload = true) {
    if (!state.file || state.isProcessing) return;

    let targetBytes = state.targetSize * 1024;
    if (state.unit === 'MB') targetBytes = state.targetSize * 1024 * 1024;
    else if (state.unit === 'GB') targetBytes = state.targetSize * 1024 * 1024 * 1024;
    targetBytes = Math.min(2147480000, Math.round(targetBytes));

    if (targetBytes <= state.file.size) {
      alert(`Target size (${state.targetSize} ${state.unit}) must be greater than current file size (${ImageCompressor.formatBytes(state.file.size)}). Please increase target.`);
      return;
    }

    state.isProcessing = true;
    increaseBtn.disabled = true;
    progressCard.classList.add('active');
    progressStatus.textContent = `Safely expanding file structure to exactly ${ImageCompressor.formatBytes(targetBytes)}...`;

    try {
      const paddedBlob = await ImageCompressor.padJpegBlob(state.file, targetBytes);
      state.paddedBlob = paddedBlob;
      state.paddedUrl = URL.createObjectURL(paddedBlob);

      setTimeout(() => {
        progressCard.classList.remove('active');
        newSizeEl.textContent = ImageCompressor.formatBytes(paddedBlob.size);
        downloadBtn.style.display = 'inline-flex';
        state.isProcessing = false;
        increaseBtn.disabled = false;

        if (autoTriggerDownload) {
          triggerFileDownload();
        }
      }, 400);
    } catch (e) {
      console.error(e);
      alert('Failed to increase image size: ' + e.message);
      state.isProcessing = false;
      increaseBtn.disabled = false;
      progressCard.classList.remove('active');
    }
  }

  increaseBtn.addEventListener('click', () => executeIncreaseAndDownload(true));

  function triggerFileDownload() {
    if (!state.paddedUrl || !state.paddedBlob) return;
    const baseName = state.file.name.replace(/\.[^/.]+$/, '');
    const filename = `${baseName}_increased_${state.targetSize}${state.unit}.jpg`;
    const a = document.createElement('a');
    a.href = state.paddedUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // Direct Download Button click
  downloadBtn.addEventListener('click', () => {
    if (state.paddedBlob && state.paddedUrl) {
      triggerFileDownload();
    } else {
      executeIncreaseAndDownload(true);
    }
  });
});
