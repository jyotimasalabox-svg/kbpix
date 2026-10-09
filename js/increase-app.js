/**
 * Increase Image Size in KB - Application Controller
 * Inspired by Pi7 "Increase Image Size In KB"
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const state = {
    file: null,
    origUrl: null,
    paddedBlob: null,
    paddedUrl: null,
    targetSize: 45, // default KB
    isProcessing: false
  };

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const sizeInput = document.getElementById('sizeInput');
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

  if (themeToggleBtn) {
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

  // Presets & Size Input
  function updateTargetSize() {
    let val = parseInt(sizeInput.value, 10);
    if (isNaN(val) || val <= 1) val = 45;
    state.targetSize = val;
    presetBtns.forEach(btn => {
      if (parseInt(btn.dataset.size, 10) === val) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  sizeInput.addEventListener('input', updateTargetSize);
  stepUpBtn.addEventListener('click', () => {
    sizeInput.value = parseInt(sizeInput.value || 0, 10) + 5;
    updateTargetSize();
  });
  stepDownBtn.addEventListener('click', () => {
    sizeInput.value = Math.max(5, parseInt(sizeInput.value || 0, 10) - 5);
    updateTargetSize();
  });

  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      sizeInput.value = btn.dataset.size;
      updateTargetSize();
    });
  });

  // Dropzone
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
  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  });

  function handleFile(file) {
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      return;
    }
    state.file = file;
    state.origUrl = URL.createObjectURL(file);
    previewImg.src = state.origUrl;
    origSizeEl.textContent = ImageCompressor.formatBytes(file.size);
    targetSizeEl.textContent = `${state.targetSize} KB`;
    increaseBtn.disabled = false;
    resultCard.style.display = 'block';
    newSizeEl.textContent = 'Waiting for increase...';
    downloadBtn.style.display = 'none';

    // If current file is already larger than target size, suggest a higher target
    const currentKB = Math.ceil(file.size / 1024);
    if (currentKB >= state.targetSize) {
      const suggested = currentKB + 15;
      sizeInput.value = suggested;
      updateTargetSize();
      targetSizeEl.textContent = `${suggested} KB`;
    }
  }

  // Increase Execution
  increaseBtn.addEventListener('click', async () => {
    if (!state.file || state.isProcessing) return;

    const targetBytes = Math.round(state.targetSize * 1024);
    if (targetBytes <= state.file.size) {
      alert(`Target size (${state.targetSize} KB) must be greater than current size (${ImageCompressor.formatBytes(state.file.size)}). Please increase target KB.`);
      return;
    }

    state.isProcessing = true;
    increaseBtn.disabled = true;
    progressCard.classList.add('active');
    progressStatus.textContent = 'Padding image file structure safely...';

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
      }, 500);
    } catch (e) {
      console.error(e);
      alert('Failed to increase image size.');
      state.isProcessing = false;
      increaseBtn.disabled = false;
      progressCard.classList.remove('active');
    }
  });

  // Download
  downloadBtn.addEventListener('click', () => {
    if (!state.paddedUrl || !state.paddedBlob) return;
    const baseName = state.file.name.replace(/\.[^/.]+$/, '');
    const filename = `${baseName}_increased_${state.targetSize}KB.jpg`;
    const a = document.createElement('a');
    a.href = state.paddedUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });
});
