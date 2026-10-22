/**
 * PhotoResize Pro — Government Form Resizer Controller
 * Wires verified presets, camera capture, interactive crop, and strict KB compression
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // DOM Elements
  const presetSelect = document.getElementById('govtPresetSelect');
  const specDim = document.getElementById('specDim');
  const specPx = document.getElementById('specPx');
  const specKB = document.getElementById('specKB');
  const specDpi = document.getElementById('specDpi');
  const specNotes = document.getElementById('specNotes');

  const dropzone = document.getElementById('govtDropzone');
  const fileInput = document.getElementById('govtFileInput');
  const workspace = document.getElementById('govtWorkspace');
  const cropperCanvas = document.getElementById('govtCropperCanvas');

  const liveDimBadge = document.getElementById('liveDimBadge');
  const verifyDimText = document.getElementById('verifyDimText');
  const verifyRangeText = document.getElementById('verifyRangeText');
  const btnDownload = document.getElementById('btnDownloadGovtPhoto');
  const btnChangePhoto = document.getElementById('btnGovtChangePhoto');

  // Cropper tools
  const btnRotateL = document.getElementById('btnGovtRotateL');
  const btnRotateR = document.getElementById('btnGovtRotateR');
  const btnFlipH = document.getElementById('btnGovtFlipH');
  const btnReset = document.getElementById('btnGovtReset');
  const fineSlider = document.getElementById('fineRotateSlider');
  const fineVal = document.getElementById('fineRotateVal');

  // Camera elements
  const btnCamera = document.getElementById('btnGovtCamera');
  const cameraModal = document.getElementById('cameraModal');
  const btnCloseCamera = document.getElementById('btnCloseCamera');
  const cameraVideo = document.getElementById('cameraVideo');
  const btnSnapPhoto = document.getElementById('btnSnapPhoto');
  let mediaStream = null;

  // Custom preset modal
  const btnOpenCustom = document.getElementById('btnOpenCustomPresetModal');
  const customModal = document.getElementById('customPresetModal');
  const btnCloseCustom = document.getElementById('btnClosePresetModal');
  const btnSaveCustom = document.getElementById('btnSaveCustomPreset');
  const custName = document.getElementById('custPresetName');
  const custW = document.getElementById('custPresetW');
  const custH = document.getElementById('custPresetH');
  const custMin = document.getElementById('custPresetMinKB');
  const custMax = document.getElementById('custPresetMaxKB');

  // Mobile sidebar toggle
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

  // Dark Mode Toggle
  const themeBtn = document.getElementById('themeToggleBtn');
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
  initTheme();

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
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

  // --- Populate Presets ---
  function populatePresets() {
    if (!window.GovtPresets || !presetSelect) return;
    const presets = window.GovtPresets.getAllPresets();

    let html = '';
    let currentCategory = '';

    presets.forEach(p => {
      if (p.category !== currentCategory) {
        if (currentCategory !== '') html += '</optgroup>';
        currentCategory = p.category;
        html += `<optgroup label="${currentCategory} Exams / Portals">`;
      }
      html += `<option value="${p.id}">${p.title} (${p.minKB}-${p.maxKB} KB)</option>`;
    });
    if (currentCategory !== '') html += '</optgroup>';

    presetSelect.innerHTML = html;
    updateSelectedPresetSpecs();
  }

  let activePreset = null;
  let cropper = null;
  let loadedFile = null;

  function updateSelectedPresetSpecs() {
    const id = presetSelect.value;
    activePreset = window.GovtPresets.getPresetById(id);
    if (!activePreset) return;

    specDim.textContent = `${activePreset.widthCm} × ${activePreset.heightCm} cm`;
    specPx.textContent = `${activePreset.widthPx} × ${activePreset.heightPx} px`;
    specKB.textContent = `${activePreset.minKB} KB – ${activePreset.maxKB} KB`;
    specDpi.textContent = `JPG • ${activePreset.dpi} DPI`;

    if (specNotes) {
      specNotes.innerHTML = `<i class="ph-bold ph-info" style="color:var(--primary);"></i> <span>${activePreset.notes || 'Official portal guidelines applied.'}</span>`;
    }

    if (verifyDimText) verifyDimText.textContent = `${activePreset.widthCm} × ${activePreset.heightCm} cm (${activePreset.widthPx}×${activePreset.heightPx} px)`;
    if (verifyRangeText) verifyRangeText.textContent = `${activePreset.minKB} KB to ${activePreset.maxKB} KB`;

    // If cropper is loaded, update aspect ratio
    if (cropper) {
      const ratio = activePreset.widthPx / activePreset.heightPx;
      cropper.setAspectRatio(ratio);
    }
  }

  presetSelect.addEventListener('change', updateSelectedPresetSpecs);
  populatePresets();

  // --- File Dropzone ---
  dropzone.addEventListener('click', (e) => {
    if (e.target.closest('#btnGovtCamera')) return;
    fileInput.click();
  });

  ['dragenter', 'dragover'].forEach(n => {
    dropzone.addEventListener(n, (e) => { e.preventDefault(); dropzone.classList.add('drag-active'); });
  });
  ['dragleave', 'drop'].forEach(n => {
    dropzone.addEventListener(n, (e) => { e.preventDefault(); dropzone.classList.remove('drag-active'); });
  });

  dropzone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImage(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleImage(e.target.files[0]);
    }
  });

  if (btnChangePhoto) {
    btnChangePhoto.addEventListener('click', () => {
      workspace.style.display = 'none';
      dropzone.style.display = 'block';
      fileInput.click();
    });
  }

  async function handleImage(file) {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPG, PNG, WebP).');
      return;
    }
    loadedFile = file;
    dropzone.style.display = 'none';
    workspace.style.display = 'block';

    if (!cropper) {
      cropper = new InteractiveCropper(cropperCanvas, {
        aspectRatio: activePreset ? (activePreset.widthPx / activePreset.heightPx) : (3.5 / 4.5),
        onCropChange: (info) => {
          if (liveDimBadge && activePreset) {
            liveDimBadge.textContent = `${activePreset.widthPx} × ${activePreset.heightPx} px`;
          }
        }
      });
    }

    await cropper.loadImage(file);
    if (activePreset) {
      cropper.setAspectRatio(activePreset.widthPx / activePreset.heightPx);
    }
  }

  // --- Cropper Tool Buttons ---
  if (btnRotateL) btnRotateL.addEventListener('click', () => cropper && cropper.rotate90(false));
  if (btnRotateR) btnRotateR.addEventListener('click', () => cropper && cropper.rotate90(true));
  if (btnFlipH) btnFlipH.addEventListener('click', () => cropper && cropper.toggleFlipH());
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (cropper) cropper.resetTransform();
      if (fineSlider) fineSlider.value = 0;
      if (fineVal) fineVal.textContent = '0°';
    });
  }

  if (fineSlider) {
    fineSlider.addEventListener('input', (e) => {
      const deg = parseInt(e.target.value, 10);
      if (fineVal) fineVal.textContent = `${deg}°`;
      if (cropper) cropper.setFineRotation(deg);
    });
  }

  // --- Process & Download ---
  btnDownload.addEventListener('click', async () => {
    if (!cropper || !activePreset) return;

    btnDownload.disabled = true;
    btnDownload.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> Verifying & Compressing...';

    try {
      // 1. Get cropped canvas matching target exact dimensions
      const croppedCanvas = cropper.getCroppedCanvas({
        maxWidth: activePreset.widthPx * 2
      });

      // Resize canvas to exact target pixels
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = activePreset.widthPx;
      exportCanvas.height = activePreset.heightPx;
      const ctx = exportCanvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(croppedCanvas, 0, 0, activePreset.widthPx, activePreset.heightPx);

      // 2. Convert to Blob
      const rawBlob = await new Promise(res => exportCanvas.toBlob(res, 'image/jpeg', 0.95));
      const rawFile = new File([rawBlob], 'form_photo.jpg', { type: 'image/jpeg' });

      // 3. Compress strictly under maxKB and >= minKB
      let finalBlob = rawBlob;
      const targetMidKB = Math.round((activePreset.minKB + activePreset.maxKB) / 2);

      if (typeof ImageCompressor !== 'undefined' && ImageCompressor.compressImage) {
        const comp = await ImageCompressor.compressImage(rawFile, {
          targetKB: activePreset.maxKB,
          strictUnder: true,
          format: 'image/jpeg'
        });
        finalBlob = comp.blob;
      }

      // Check if file is below minKB, pad safely if needed
      if (finalBlob.size < activePreset.minKB * 1024 && typeof ImageCompressor.padJpegBlob === 'function') {
        finalBlob = await ImageCompressor.padJpegBlob(finalBlob, Math.round(targetMidKB * 1024));
      }

      // Trigger instant download
      const filename = `${activePreset.id}_verified_${Math.round(finalBlob.size / 1024)}KB.jpg`;
      const url = URL.createObjectURL(finalBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Error processing photo: ' + err.message);
    } finally {
      btnDownload.disabled = false;
      btnDownload.innerHTML = '<i class="ph-bold ph-download-simple" style="font-size: 1.4rem;"></i> <span>Download Form Photo (JPG)</span>';
    }
  });

  // --- Camera Capture Modal ---
  if (btnCamera) {
    btnCamera.addEventListener('click', async () => {
      try {
        cameraModal.classList.add('active');
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
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
        const file = new File([blob], 'camera_photo.jpg', { type: 'image/jpeg' });
        stopCamera();
        handleImage(file);
      }, 'image/jpeg', 0.95);
    });
  }

  // --- Custom Preset Modal ---
  if (btnOpenCustom) {
    btnOpenCustom.addEventListener('click', () => customModal.classList.add('active'));
  }
  if (btnCloseCustom) {
    btnCloseCustom.addEventListener('click', () => customModal.classList.remove('active'));
  }
  if (btnSaveCustom) {
    btnSaveCustom.addEventListener('click', () => {
      const name = custName.value.trim();
      const w = parseInt(custW.value, 10);
      const h = parseInt(custH.value, 10);
      const minK = parseInt(custMin.value, 10) || 10;
      const maxK = parseInt(custMax.value, 10) || 50;

      if (!name || isNaN(w) || isNaN(h)) {
        alert('Please fill out all fields.');
        return;
      }

      window.GovtPresets.saveCustomPreset({
        title: name,
        widthPx: w,
        heightPx: h,
        widthCm: Math.round((w / 118.11) * 10) / 10,
        heightCm: Math.round((h / 118.11) * 10) / 10,
        minKB: minK,
        maxKB: maxK,
        dpi: 300,
        format: 'image/jpeg',
        notes: 'User custom requirement.'
      });

      customModal.classList.remove('active');
      populatePresets();
      presetSelect.value = presetSelect.options[presetSelect.options.length - 1].value;
      updateSelectedPresetSpecs();
    });
  }
});
