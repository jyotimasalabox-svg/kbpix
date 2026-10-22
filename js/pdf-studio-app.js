/**
 * PhotoResize Pro — PDF Studio Controller
 * Handles Images to PDF, PDF to Image, Merge PDF & Split PDF
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // Mode Tabs
  const tabImgPdf = document.getElementById('tabImagesToPdf');
  const tabPdfImg = document.getElementById('tabPdfToImages');
  const tabMerge = document.getElementById('tabMergePdf');
  const tabSplit = document.getElementById('tabSplitPdf');

  const secImgPdf = document.getElementById('sectionImagesToPdf');
  const secPdfImg = document.getElementById('sectionPdfToImages');
  const secMerge = document.getElementById('sectionMergePdf');
  const secSplit = document.getElementById('sectionSplitPdf');

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

  function switchTab(activeTab, activeSec) {
    [tabImgPdf, tabPdfImg, tabMerge, tabSplit].forEach(t => t.classList.remove('active'));
    [secImgPdf, secPdfImg, secMerge, secSplit].forEach(s => s.style.display = 'none');
    activeTab.classList.add('active');
    activeSec.style.display = 'block';
  }

  tabImgPdf.addEventListener('click', () => switchTab(tabImgPdf, secImgPdf));
  tabPdfImg.addEventListener('click', () => switchTab(tabPdfImg, secPdfImg));
  tabMerge.addEventListener('click', () => switchTab(tabMerge, secMerge));
  tabSplit.addEventListener('click', () => switchTab(tabSplit, secSplit));

  // ========================================================
  // MODE 1: Images to PDF
  // ========================================================
  const imgPdfDropzone = document.getElementById('imgPdfDropzone');
  const imgPdfFileInput = document.getElementById('imgPdfFileInput');
  const imgPdfWorkspace = document.getElementById('imgPdfWorkspace');
  const imgPdfList = document.getElementById('imgPdfList');
  const btnAddMoreImgPdf = document.getElementById('btnAddMoreImgPdf');
  const btnClearImgPdf = document.getElementById('btnClearImgPdf');
  const btnDownloadCreatedPdf = document.getElementById('btnDownloadCreatedPdf');

  const pageSizeSelect = document.getElementById('pdfPageSizeSelect');
  const orientationSelect = document.getElementById('pdfOrientationSelect');
  const marginSelect = document.getElementById('pdfMarginSelect');

  let imagesList = [];

  imgPdfDropzone.addEventListener('click', () => imgPdfFileInput.click());
  imgPdfDropzone.addEventListener('dragover', (e) => { e.preventDefault(); imgPdfDropzone.classList.add('drag-active'); });
  imgPdfDropzone.addEventListener('dragleave', () => imgPdfDropzone.classList.remove('drag-active'));
  imgPdfDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    imgPdfDropzone.classList.remove('drag-active');
    if (e.dataTransfer.files) handleNewImages(Array.from(e.dataTransfer.files));
  });

  imgPdfFileInput.addEventListener('change', (e) => {
    if (e.target.files) handleNewImages(Array.from(e.target.files));
  });

  if (btnAddMoreImgPdf) btnAddMoreImgPdf.addEventListener('click', () => imgPdfFileInput.click());
  if (btnClearImgPdf) {
    btnClearImgPdf.addEventListener('click', () => {
      imagesList = [];
      renderImagesList();
    });
  }

  async function handleNewImages(files) {
    const valid = files.filter(f => f.type.startsWith('image/'));
    for (const f of valid) {
      const img = new Image();
      img.src = URL.createObjectURL(f);
      await new Promise(r => img.onload = r);
      imagesList.push({ file: f, img, name: f.name });
    }
    renderImagesList();
  }

  function renderImagesList() {
    if (imagesList.length === 0) {
      imgPdfDropzone.style.display = 'block';
      imgPdfWorkspace.style.display = 'none';
      imgPdfList.innerHTML = '';
      return;
    }

    imgPdfDropzone.style.display = 'none';
    imgPdfWorkspace.style.display = 'block';

    imgPdfList.innerHTML = imagesList.map((item, idx) => `
      <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:0.5rem;position:relative;text-align:center;">
        <span style="position:absolute;top:4px;left:4px;background:var(--primary);color:#fff;font-size:0.7rem;font-weight:800;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;">${idx + 1}</span>
        <button type="button" onclick="window.removeImgPdf(${idx})" style="position:absolute;top:4px;right:4px;background:var(--danger);color:#fff;border:none;border-radius:50%;width:18px;height:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:0.75rem;">&times;</button>
        <img src="${item.img.src}" style="height:110px;width:100%;object-fit:cover;border-radius:4px;margin-bottom:0.35rem;" alt="Page ${idx + 1}">
        <div style="font-size:0.72rem;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${item.name}">${item.name}</div>
      </div>
    `).join('');
  }

  window.removeImgPdf = (idx) => {
    imagesList.splice(idx, 1);
    renderImagesList();
  };

  btnDownloadCreatedPdf.addEventListener('click', async () => {
    if (imagesList.length === 0) return;
    btnDownloadCreatedPdf.disabled = true;
    btnDownloadCreatedPdf.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> Generating PDF...';

    try {
      const pdfBlob = await window.PDFStudioEngine.convertImagesToPDF(
        imagesList.map(i => i.img),
        {
          pageSize: pageSizeSelect.value,
          orientation: orientationSelect.value,
          marginMm: parseInt(marginSelect.value, 10),
          quality: 0.92
        }
      );

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `combined_document_${imagesList.length}_pages.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('PDF generation error: ' + err.message);
    } finally {
      btnDownloadCreatedPdf.disabled = false;
      btnDownloadCreatedPdf.innerHTML = '<i class="ph-bold ph-file-pdf" style="font-size: 1.4rem; color: #ef4444;"></i> <span>Download Combined PDF</span>';
    }
  });

  // ========================================================
  // MODE 2: PDF to Images
  // ========================================================
  const pdfImgDropzone = document.getElementById('pdfImgDropzone');
  const pdfImgFileInput = document.getElementById('pdfImgFileInput');
  const pdfImgWorkspace = document.getElementById('pdfImgWorkspace');
  const pdfImgPagesGrid = document.getElementById('pdfImgPagesGrid');
  const btnDownloadAllPdfImagesZip = document.getElementById('btnDownloadAllPdfImagesZip');
  const pdfImgFormatSelect = document.getElementById('pdfImgFormatSelect');
  const pdfImgDpiSelect = document.getElementById('pdfImgDpiSelect');

  let renderedPdfPages = [];
  let loadedPdfFile = null;

  pdfImgDropzone.addEventListener('click', () => pdfImgFileInput.click());
  pdfImgFileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) renderPdfToImages(e.target.files[0]);
  });

  async function renderPdfToImages(file) {
    loadedPdfFile = file;
    pdfImgDropzone.style.display = 'none';
    pdfImgWorkspace.style.display = 'block';
    pdfImgPagesGrid.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-muted);"><i class="ph-bold ph-spinner ph-spin" style="font-size:2rem;color:var(--primary);display:block;margin-bottom:0.5rem;"></i> Rendering PDF Pages with PDF.js...</div>';

    try {
      const format = pdfImgFormatSelect.value;
      const dpi = parseInt(pdfImgDpiSelect.value, 10);

      renderedPdfPages = await window.PDFStudioEngine.convertPDFToImages(file, { format, dpi });

      pdfImgPagesGrid.innerHTML = renderedPdfPages.map((p, idx) => `
        <div style="background:var(--bg-card);border:1.5px solid var(--border-color);border-radius:var(--radius-md);padding:0.75rem;text-align:center;box-shadow:var(--shadow-xs);">
          <div style="font-size:0.8rem;font-weight:700;color:var(--text-muted);margin-bottom:0.4rem;">Page ${p.pageNum} (${p.width}×${p.height}px)</div>
          <div style="background:#fff;border-radius:4px;overflow:hidden;border:1px solid var(--border-color);margin-bottom:0.6rem;">
            <img src="${URL.createObjectURL(p.blob)}" style="width:100%;height:180px;object-fit:contain;display:block;" alt="Page ${p.pageNum}">
          </div>
          <button type="button" class="button primary small w-full" onclick="window.downloadSinglePdfPage(${idx})" style="font-weight:700;">
            <i class="ph-bold ph-download-simple"></i> Download Page ${p.pageNum}
          </button>
        </div>
      `).join('');
    } catch (err) {
      console.error(err);
      alert('Error rendering PDF: ' + err.message);
      pdfImgDropzone.style.display = 'block';
      pdfImgWorkspace.style.display = 'none';
    }
  }

  window.downloadSinglePdfPage = (idx) => {
    const p = renderedPdfPages[idx];
    if (!p) return;
    const url = URL.createObjectURL(p.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = p.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  btnDownloadAllPdfImagesZip.addEventListener('click', async () => {
    if (renderedPdfPages.length === 0) return;
    if (typeof JSZip === 'undefined') {
      alert('ZIP library loading...');
      return;
    }
    btnDownloadAllPdfImagesZip.disabled = true;
    btnDownloadAllPdfImagesZip.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> Zipping...';

    try {
      const zip = new JSZip();
      renderedPdfPages.forEach(p => zip.file(p.filename, p.blob));
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pdf_pages_images.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('ZIP error: ' + err.message);
    } finally {
      btnDownloadAllPdfImagesZip.disabled = false;
      btnDownloadAllPdfImagesZip.innerHTML = '<i class="ph-bold ph-file-zip"></i> Download All Pages (ZIP)';
    }
  });

  // ========================================================
  // MODE 3: Merge PDFs
  // ========================================================
  const mergePdfDropzone = document.getElementById('mergePdfDropzone');
  const mergePdfFileInput = document.getElementById('mergePdfFileInput');
  const mergePdfWorkspace = document.getElementById('mergePdfWorkspace');
  const mergePdfFilesList = document.getElementById('mergePdfFilesList');
  const btnExecuteMergePdf = document.getElementById('btnExecuteMergePdf');

  let mergeFiles = [];

  mergePdfDropzone.addEventListener('click', () => mergePdfFileInput.click());
  mergePdfFileInput.addEventListener('change', (e) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach(f => {
        if (f.type === 'application/pdf' || f.name.endsWith('.pdf')) {
          mergeFiles.push(f);
        }
      });
      renderMergeList();
    }
  });

  function renderMergeList() {
    if (mergeFiles.length === 0) {
      mergePdfDropzone.style.display = 'block';
      mergePdfWorkspace.style.display = 'none';
      return;
    }
    mergePdfDropzone.style.display = 'none';
    mergePdfWorkspace.style.display = 'block';

    mergePdfFilesList.innerHTML = mergeFiles.map((f, idx) => `
      <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:0.75rem 1rem;display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:0.75rem;">
          <span style="font-weight:800;color:var(--primary);font-size:1.1rem;"><i class="ph-bold ph-file-pdf"></i></span>
          <div>
            <div style="font-weight:700;font-size:0.9rem;">${idx + 1}. ${f.name}</div>
            <small style="color:var(--text-muted);font-size:0.75rem;">${Math.round(f.size / 1024)} KB</small>
          </div>
        </div>
        <button type="button" class="button secondary small" onclick="window.removeMergeFile(${idx})" style="color:var(--danger);"><i class="ph ph-trash"></i></button>
      </div>
    `).join('');
  }

  window.removeMergeFile = (idx) => {
    mergeFiles.splice(idx, 1);
    renderMergeList();
  };

  btnExecuteMergePdf.addEventListener('click', async () => {
    if (mergeFiles.length < 2) {
      alert('Please select at least 2 PDF files to merge.');
      return;
    }
    btnExecuteMergePdf.disabled = true;
    btnExecuteMergePdf.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> Merging PDFs...';

    try {
      const mergedBlob = await window.PDFStudioEngine.mergePDFs(mergeFiles);
      const url = URL.createObjectURL(mergedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `merged_${mergeFiles.length}_documents.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Merge failed: ' + err.message);
    } finally {
      btnExecuteMergePdf.disabled = false;
      btnExecuteMergePdf.innerHTML = '<i class="ph-bold ph-file-plus"></i> Merge &amp; Download Combined PDF';
    }
  });

  // ========================================================
  // MODE 4: Split PDF
  // ========================================================
  const splitPdfDropzone = document.getElementById('splitPdfDropzone');
  const splitPdfFileInput = document.getElementById('splitPdfFileInput');
  const splitPdfWorkspace = document.getElementById('splitPdfWorkspace');
  const splitFileName = document.getElementById('splitFileName');
  const splitPageCount = document.getElementById('splitPageCount');
  const splitPageRangeInput = document.getElementById('splitPageRangeInput');
  const btnExecuteSplitPdf = document.getElementById('btnExecuteSplitPdf');

  let loadedSplitPdf = null;
  let totalSplitPages = 0;

  splitPdfDropzone.addEventListener('click', () => splitPdfFileInput.click());
  splitPdfFileInput.addEventListener('change', async (e) => {
    if (e.target.files && e.target.files[0]) {
      loadedSplitPdf = e.target.files[0];
      splitFileName.textContent = loadedSplitPdf.name;
      splitPdfDropzone.style.display = 'none';
      splitPdfWorkspace.style.display = 'block';

      // Load with pdf-lib to get page count
      await window.PDFStudioEngine.ensurePdfLib();
      const bytes = await loadedSplitPdf.arrayBuffer();
      const pdf = await PDFLib.PDFDocument.load(bytes);
      totalSplitPages = pdf.getPageCount();
      splitPageCount.textContent = totalSplitPages;
      splitPageRangeInput.placeholder = `e.g. 1-${Math.min(3, totalSplitPages)}`;
    }
  });

  btnExecuteSplitPdf.addEventListener('click', async () => {
    if (!loadedSplitPdf) return;
    const rangeStr = splitPageRangeInput.value.trim();
    if (!rangeStr) {
      alert('Please enter page range (e.g. 1-2 or 1, 3).');
      return;
    }

    // Parse ranges into 0-indexed indices
    const indices = [];
    const parts = rangeStr.split(',');
    parts.forEach(p => {
      p = p.trim();
      if (p.includes('-')) {
        const [start, end] = p.split('-').map(s => parseInt(s.trim(), 10));
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = start; i <= end; i++) {
            if (i >= 1 && i <= totalSplitPages) indices.push(i - 1);
          }
        }
      } else {
        const num = parseInt(p, 10);
        if (!isNaN(num) && num >= 1 && num <= totalSplitPages) {
          indices.push(num - 1);
        }
      }
    });

    if (indices.length === 0) {
      alert('Invalid page range entered.');
      return;
    }

    btnExecuteSplitPdf.disabled = true;
    btnExecuteSplitPdf.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> Splitting...';

    try {
      const splitBlob = await window.PDFStudioEngine.splitPDF(loadedSplitPdf, indices);
      const url = URL.createObjectURL(splitBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `extracted_pages_${rangeStr.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Split error: ' + err.message);
    } finally {
      btnExecuteSplitPdf.disabled = false;
      btnExecuteSplitPdf.innerHTML = '<i class="ph-bold ph-scissors"></i> Split &amp; Download Extracted PDF';
    }
  });
});
