/**
 * Passport Photo & Dimension Resizer Application
 * Inspried by Pi7 Passport Size Photo & Pixel Resizer
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const state = {
    file: null,
    img: null,
    origUrl: null,
    cropWidth: 413,
    cropHeight: 531,
    targetKB: 50,
    outBlob: null,
    outUrl: null
  };

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const presetFormat = document.getElementById('presetFormat');
  const widthInput = document.getElementById('widthInput');
  const heightInput = document.getElementById('heightInput');
  const unitSelect = document.getElementById('unitSelect');
  const targetKbInput = document.getElementById('targetKbInput');
  const addBorderCheck = document.getElementById('addBorderCheck');
  const generateBtn = document.getElementById('generateBtn');

  const previewCanvas = document.getElementById('previewCanvas');
  const resultArea = document.getElementById('resultArea');
  const resultInfo = document.getElementById('resultInfo');
  const downloadBtn = document.getElementById('downloadBtn');

  // Theme
  const themeToggleBtn = document.getElementById('themeToggleBtn');
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

  // Presets mapping
  const presets = {
    'india-passport': { w: 413, h: 531, kb: 50, name: '3.5 x 4.5 cm (India / SSC / UPSC)' },
    'india-sign': { w: 140, h: 60, kb: 20, name: 'Signature (140 x 60 px)' },
    'us-visa': { w: 600, h: 600, kb: 100, name: '2 x 2 inch (US Visa / 600x600)' },
    'pan-photo': { w: 213, h: 213, kb: 45, name: 'PAN Card (213 x 213 px)' },
    'custom': { w: 413, h: 531, kb: 50, name: 'Custom' }
  };

  presetFormat.addEventListener('change', () => {
    const p = presets[presetFormat.value];
    if (p) {
      widthInput.value = p.w;
      heightInput.value = p.h;
      targetKbInput.value = p.kb;
      state.cropWidth = p.w;
      state.cropHeight = p.h;
      state.targetKB = p.kb;
      if (state.img) renderPassport();
    }
  });

  widthInput.addEventListener('input', () => {
    state.cropWidth = parseInt(widthInput.value, 10) || 413;
    if (state.img) renderPassport();
  });
  heightInput.addEventListener('input', () => {
    state.cropHeight = parseInt(heightInput.value, 10) || 531;
    if (state.img) renderPassport();
  });
  targetKbInput.addEventListener('input', () => {
    state.targetKB = parseInt(targetKbInput.value, 10) || 50;
  });
  addBorderCheck.addEventListener('change', () => {
    if (state.img) renderPassport();
  });

  // Dropzone
  dropzone.addEventListener('click', () => fileInput.click());
  ['dragenter', 'dragover'].forEach(n => dropzone.addEventListener(n, (e) => { e.preventDefault(); dropzone.classList.add('drag-active'); }));
  ['dragleave', 'drop'].forEach(n => dropzone.addEventListener(n, (e) => { e.preventDefault(); dropzone.classList.remove('drag-active'); }));
  dropzone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
  });

  function handleFile(file) {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }
    state.file = file;
    state.origUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      state.img = img;
      generateBtn.disabled = false;
      resultArea.style.display = 'block';
      renderPassport();
    };
    img.src = state.origUrl;
  }

  function renderPassport() {
    if (!state.img) return;

    const canvas = previewCanvas;
    const w = state.cropWidth;
    const h = state.cropHeight;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);

    // Draw image centered & fitted
    const imgRatio = state.img.width / state.img.height;
    const targetRatio = w / h;

    let sx, sy, sWidth, sHeight;
    if (imgRatio > targetRatio) {
      sHeight = state.img.height;
      sWidth = state.img.height * targetRatio;
      sx = (state.img.width - sWidth) / 2;
      sy = 0;
    } else {
      sWidth = state.img.width;
      sHeight = state.img.width / targetRatio;
      sx = 0;
      sy = (state.img.height - sHeight) / 2;
    }

    ctx.drawImage(state.img, sx, sy, sWidth, sHeight, 0, 0, w, h);

    // Optional subtle passport border
    if (addBorderCheck.checked) {
      ctx.strokeStyle = '#D1D5DB';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, w - 2, h - 2);
    }
  }

  // Generate & Compress
  generateBtn.addEventListener('click', async () => {
    if (!state.img) return;
    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating & Compressing...';

    renderPassport();

    // Convert canvas to blob
    previewCanvas.toBlob(async (initialBlob) => {
      const initialFile = new File([initialBlob], 'passport.jpg', { type: 'image/jpeg' });
      
      const compResult = await ImageCompressor.compressImage(initialFile, {
        targetKB: state.targetKB,
        format: 'image/jpeg',
        strictUnder: true
      });

      state.outBlob = compResult.blob;
      state.outUrl = URL.createObjectURL(compResult.blob);

      resultInfo.innerHTML = `
        Dimensions: <strong>${compResult.width} × ${compResult.height} px</strong> &bull;
        Final File Size: <strong style="color: var(--accent);">${ImageCompressor.formatBytes(compResult.compressedSize)}</strong>
        (Under target ${state.targetKB} KB)
      `;

      downloadBtn.style.display = 'inline-flex';
      generateBtn.disabled = false;
      generateBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        Regenerate Photo
      `;
    }, 'image/jpeg', 0.95);
  });

  downloadBtn.addEventListener('click', () => {
    if (!state.outUrl) return;
    const a = document.createElement('a');
    a.href = state.outUrl;
    a.download = `passport_photo_${state.cropWidth}x${state.cropHeight}_${state.targetKB}KB.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });
});
