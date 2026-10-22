/**
 * PhotoResize Pro — Image to Excel / CSV Controller
 * Populates interactive editable HTML grid and handles XLSX & CSV downloads
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const dropzone = document.getElementById('tableDropzone');
  const fileInput = document.getElementById('tableFileInput');
  const progressCard = document.getElementById('tableProgressCard');
  const progressBar = document.getElementById('tableProgressBar');
  const progressText = document.getElementById('tableProgressText');
  const workspace = document.getElementById('tableWorkspace');
  const tableEl = document.getElementById('editableGridTable');
  const dimStats = document.getElementById('tableDimStats');

  const btnXlsx = document.getElementById('btnDownloadXlsx');
  const btnCsv = document.getElementById('btnDownloadCsv');
  const btnAnother = document.getElementById('btnTableAnother');

  // Camera
  const btnCamera = document.getElementById('btnTableCamera');
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
  if (window.ThemeManager) {
    window.ThemeManager.init();
  } else {
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

    if (themeBtn && !themeBtn.dataset.themeBound) {
      themeBtn.dataset.themeBound = 'true';
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
  }

  let currentGrid = [];

  // Dropzone
  dropzone.addEventListener('click', (e) => {
    if (e.target.closest('#btnTableCamera')) return;
    fileInput.click();
  });

  ['dragenter', 'dragover'].forEach(n => {
    dropzone.addEventListener(n, (e) => { e.preventDefault(); dropzone.classList.add('drag-active'); });
  });
  ['dragleave', 'drop'].forEach(n => {
    dropzone.addEventListener(n, (e) => { e.preventDefault(); dropzone.classList.remove('drag-active'); });
  });

  dropzone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files && e.dataTransfer.files[0]) processTable(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      processTable(e.target.files[0]);
      fileInput.value = '';
    }
  });

  if (btnAnother) {
    btnAnother.addEventListener('click', () => {
      workspace.style.display = 'none';
      dropzone.style.display = 'block';
      fileInput.click();
    });
  }

  async function processTable(file) {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPG, PNG, WebP).');
      return;
    }

    dropzone.style.display = 'none';
    progressCard.classList.add('active');
    progressBar.style.width = '10%';
    progressText.textContent = 'Scanning table document geometry...';

    try {
      const result = await window.TableExtractorEngine.extractTableFromImage(file, (pct, msg) => {
        progressBar.style.width = `${pct}%`;
        progressText.textContent = msg;
      });

      currentGrid = result.grid;
      renderTableGrid(currentGrid);

      dimStats.textContent = `${result.rowCount} Rows × ${result.colCount} Columns`;
      progressCard.classList.remove('active');
      workspace.style.display = 'block';
    } catch (err) {
      console.error(err);
      alert('Table extraction error: ' + err.message);
      progressCard.classList.remove('active');
      dropzone.style.display = 'block';
    }
  }

  function renderTableGrid(grid) {
    if (!grid || grid.length === 0) {
      tableEl.innerHTML = '<tr><td style="padding:1.5rem;text-align:center;color:var(--text-muted);">No table structure detected.</td></tr>';
      return;
    }

    let html = '';
    grid.forEach((row, rIdx) => {
      const isHeader = rIdx === 0;
      html += `<tr style="${isHeader ? 'background: var(--bg-card-secondary); font-weight: 800;' : ''}">`;
      row.forEach((cell, cIdx) => {
        const tag = isHeader ? 'th' : 'td';
        html += `<${tag} contenteditable="true" data-row="${rIdx}" data-col="${cIdx}" style="padding: 0.65rem 0.85rem; border: 1px solid var(--border-color); outline: none;">${escapeHtml(cell)}</${tag}>`;
      });
      html += '</tr>';
    });

    tableEl.innerHTML = html;

    // Listen for live in-cell edits
    tableEl.querySelectorAll('[contenteditable="true"]').forEach(cell => {
      cell.addEventListener('input', (e) => {
        const r = parseInt(e.target.dataset.row, 10);
        const c = parseInt(e.target.dataset.col, 10);
        currentGrid[r][c] = e.target.innerText.trim();
      });
    });
  }

  function getLatestGridFromDOM() {
    const rows = Array.from(tableEl.querySelectorAll('tr'));
    return rows.map(tr => {
      const cells = Array.from(tr.querySelectorAll('th, td'));
      return cells.map(td => td.innerText.trim());
    });
  }

  // --- Downloads ---
  btnXlsx.addEventListener('click', async () => {
    const grid = getLatestGridFromDOM();
    if (grid.length === 0) return;
    btnXlsx.disabled = true;
    btnXlsx.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> Generating Excel...';
    try {
      await window.TableExtractorEngine.downloadXLSX(grid, 'extracted_table.xlsx');
    } finally {
      btnXlsx.disabled = false;
      btnXlsx.innerHTML = '<i class="ph-bold ph-microsoft-excel-logo" style="font-size: 1.2rem;"></i> Download Excel (.xlsx)';
    }
  });

  btnCsv.addEventListener('click', () => {
    const grid = getLatestGridFromDOM();
    if (grid.length === 0) return;
    window.TableExtractorEngine.downloadCSV(grid, 'extracted_table.csv');
  });

  function escapeHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Camera
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
        const file = new File([blob], 'camera_table.jpg', { type: 'image/jpeg' });
        stopCamera();
        processTable(file);
      }, 'image/jpeg', 0.95);
    });
  }
});
