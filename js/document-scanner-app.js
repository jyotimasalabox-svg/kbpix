/**
 * PhotoResize Pro — Document Scanner & Perspective Controller
 * Interactive 4-corner drag, homography warp execution & PDF/JPG export
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const dropzone = document.getElementById('scanDropzone');
  const fileInput = document.getElementById('scanFileInput');
  const cornerStage = document.getElementById('cornerAdjustStage');
  const resultStage = document.getElementById('scanResultStage');
  const rawCanvas = document.getElementById('rawCornerCanvas');
  const warpedCanvas = document.getElementById('warpedResultCanvas');

  const btnExecuteWarp = document.getElementById('btnExecuteWarp');
  const btnReAdjust = document.getElementById('btnReAdjustCorners');
  const btnScanAnother = document.getElementById('btnScanAnother');
  const filterPills = document.querySelectorAll('.preset-btn[data-filter]');

  const btnDownloadPdf = document.getElementById('btnDownloadScannedPdf');
  const btnDownloadJpg = document.getElementById('btnDownloadScannedJpg');

  // Handles
  const handles = {
    tl: document.getElementById('handleTL'),
    tr: document.getElementById('handleTR'),
    br: document.getElementById('handleBR'),
    bl: document.getElementById('handleBL')
  };

  // Camera
  const btnCamera = document.getElementById('btnScanCamera');
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

  // Dark Mode
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

  let originalImg = null;
  let corners = [
    { x: 0.08, y: 0.08 },
    { x: 0.92, y: 0.08 },
    { x: 0.92, y: 0.92 },
    { x: 0.08, y: 0.92 }
  ];
  let unwarpedRawCanvas = null;
  let activeFilter = 'magic_color';

  // --- Upload Handling ---
  dropzone.addEventListener('click', (e) => {
    if (e.target.closest('#btnScanCamera')) return;
    fileInput.click();
  });

  ['dragenter', 'dragover'].forEach(n => {
    dropzone.addEventListener(n, (e) => { e.preventDefault(); dropzone.classList.add('drag-active'); });
  });
  ['dragleave', 'drop'].forEach(n => {
    dropzone.addEventListener(n, (e) => { e.preventDefault(); dropzone.classList.remove('drag-active'); });
  });

  dropzone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files && e.dataTransfer.files[0]) loadDocument(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) loadDocument(e.target.files[0]);
  });

  if (btnScanAnother) {
    btnScanAnother.addEventListener('click', () => {
      resultStage.style.display = 'none';
      cornerStage.style.display = 'none';
      dropzone.style.display = 'block';
      fileInput.click();
    });
  }

  function loadDocument(file) {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }

    const img = new Image();
    img.onload = () => {
      originalImg = img;
      dropzone.style.display = 'none';
      resultStage.style.display = 'none';
      cornerStage.style.display = 'block';

      initRawCanvas();
      positionHandleElements();
    };
    img.src = URL.createObjectURL(file);
  }

  function initRawCanvas() {
    const maxDim = 1200;
    let w = originalImg.width;
    let h = originalImg.height;
    if (w > maxDim || h > maxDim) {
      const scale = maxDim / Math.max(w, h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }

    rawCanvas.width = w;
    rawCanvas.height = h;
    drawRawCanvasWithPolygon();
  }

  function drawRawCanvasWithPolygon() {
    const ctx = rawCanvas.getContext('2d');
    const w = rawCanvas.width;
    const h = rawCanvas.height;

    ctx.drawImage(originalImg, 0, 0, w, h);

    // Draw Quad Outline
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';

    ctx.beginPath();
    ctx.moveTo(corners[0].x * w, corners[0].y * h);
    ctx.lineTo(corners[1].x * w, corners[1].y * h);
    ctx.lineTo(corners[2].x * w, corners[2].y * h);
    ctx.lineTo(corners[3].x * w, corners[3].y * h);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  function positionHandleElements() {
    const rect = rawCanvas.getBoundingClientRect();
    const container = rawCanvas.parentElement.getBoundingClientRect();

    const offsetX = rect.left - container.left;
    const offsetY = rect.top - container.top;

    const setHandlePos = (el, corner) => {
      const left = offsetX + corner.x * rect.width;
      const top = offsetY + corner.y * rect.height;
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
    };

    setHandlePos(handles.tl, corners[0]);
    setHandlePos(handles.tr, corners[1]);
    setHandlePos(handles.br, corners[2]);
    setHandlePos(handles.bl, corners[3]);
  }

  // --- Draggable Corner Handles ---
  let activeDragIndex = null;

  function bindCornerDrag(handleEl, index) {
    const startDrag = (e) => {
      activeDragIndex = index;
      e.preventDefault();
    };

    handleEl.addEventListener('mousedown', startDrag);
    handleEl.addEventListener('touchstart', startDrag, { passive: false });
  }

  bindCornerDrag(handles.tl, 0);
  bindCornerDrag(handles.tr, 1);
  bindCornerDrag(handles.br, 2);
  bindCornerDrag(handles.bl, 3);

  const onMove = (e) => {
    if (activeDragIndex === null) return;
    const rect = rawCanvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

    corners[activeDragIndex] = { x, y };
    positionHandleElements();
    drawRawCanvasWithPolygon();
  };

  const onEnd = () => {
    activeDragIndex = null;
  };

  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onEnd);
  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('touchend', onEnd);
  window.addEventListener('resize', positionHandleElements);

  // --- Execute Perspective Warp ---
  btnExecuteWarp.addEventListener('click', () => {
    if (!originalImg) return;

    btnExecuteWarp.disabled = true;
    btnExecuteWarp.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> Straightening...';

    setTimeout(() => {
      unwarpedRawCanvas = window.DocumentScannerEngine.warpPerspective(rawCanvas, corners);
      renderWarpedOutput();

      cornerStage.style.display = 'none';
      resultStage.style.display = 'block';
      btnExecuteWarp.disabled = false;
      btnExecuteWarp.innerHTML = '<i class="ph-bold ph-check"></i> Straighten Document Now &rarr;';
    }, 100);
  });

  if (btnReAdjust) {
    btnReAdjust.addEventListener('click', () => {
      resultStage.style.display = 'none';
      cornerStage.style.display = 'block';
      positionHandleElements();
    });
  }

  function renderWarpedOutput() {
    if (!unwarpedRawCanvas || !warpedCanvas) return;

    const filtered = window.DocumentScannerEngine.applyScanFilter(unwarpedRawCanvas, activeFilter);
    warpedCanvas.width = filtered.width;
    warpedCanvas.height = filtered.height;
    const ctx = warpedCanvas.getContext('2d');
    ctx.drawImage(filtered, 0, 0);
  }

  // --- Filter Buttons ---
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeFilter = pill.dataset.filter;
      renderWarpedOutput();
    });
  });

  // --- Download Scanned Image (JPG) ---
  btnDownloadJpg.addEventListener('click', () => {
    if (!warpedCanvas) return;
    const url = warpedCanvas.toDataURL('image/jpeg', 0.95);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scanned_document.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  // --- Download Scanned PDF ---
  btnDownloadPdf.addEventListener('click', () => {
    if (!warpedCanvas) return;
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert('PDF generator loading...');
      return;
    }

    const doc = new window.jspdf.jsPDF({
      orientation: warpedCanvas.width > warpedCanvas.height ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const ratio = warpedCanvas.width / warpedCanvas.height;

    let w = pageW - 20;
    let h = w / ratio;
    if (h > pageH - 20) {
      h = pageH - 20;
      w = h * ratio;
    }
    const x = (pageW - w) / 2;
    const y = (pageH - h) / 2;

    const imgData = warpedCanvas.toDataURL('image/jpeg', 0.95);
    doc.addImage(imgData, 'JPEG', x, y, w, h);
    doc.save('scanned_document.pdf');
  });

  // --- Camera Capture Modal ---
  if (btnCamera) {
    btnCamera.addEventListener('click', async () => {
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
        const file = new File([blob], 'camera_doc.jpg', { type: 'image/jpeg' });
        stopCamera();
        loadDocument(file);
      }, 'image/jpeg', 0.95);
    });
  }
});
