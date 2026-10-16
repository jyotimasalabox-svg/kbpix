/**
 * Pro File Converter & Document Application Pack Builder
 * Inspired by BGrade File Converter.
 * Multi-format converter (JPG, PNG, WEBP, PDF) with Target KB control,
 * Application document pack organizer, and 1-Click ZIP/PDF download.
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const state = {
    documents: [], // Array of doc items
    globalFormat: 'original',
    globalTargetKB: null
  };

  let docIdCounter = 1;

  // DOM Elements
  const dropzone = document.getElementById('converterDropzone');
  const fileInput = document.getElementById('converterFileInput');
  const docListContainer = document.getElementById('docPackList');
  const packSummaryBar = document.getElementById('packSummaryBar');
  const docCountBadge = document.getElementById('docCountBadge');

  const btnAddMore = document.getElementById('btnAddMoreDocs');
  const btnClearAll = document.getElementById('btnClearAllDocs');
  const btnDownloadAllZip = document.getElementById('btnDownloadAllZip');
  const btnMergeAllPdf = document.getElementById('btnMergeAllPdf');

  // Quick category buttons
  const categoryPills = document.querySelectorAll('.quick-cat-btn[data-category]');

  // Common Exam/Govt Document Presets
  const CATEGORIES = {
    'photo': { label: 'Passport Photo', format: 'image/jpeg', targetKB: 50, ext: 'jpg' },
    'signature': { label: 'Signature', format: 'image/jpeg', targetKB: 20, ext: 'jpg' },
    'marksheet': { label: '10th/12th Marksheet', format: 'application/pdf', targetKB: 200, ext: 'pdf' },
    'id-proof': { label: 'Aadhaar / ID Card', format: 'application/pdf', targetKB: 150, ext: 'pdf' },
    'certificate': { label: 'Caste / Domicile Cert', format: 'application/pdf', targetKB: 200, ext: 'pdf' },
    'other': { label: 'Document', format: 'image/jpeg', targetKB: 100, ext: 'jpg' }
  };

  // --- File Upload Event Listeners ---
  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());

    ['dragenter', 'dragover'].forEach(n => {
      dropzone.addEventListener(n, (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-active');
      });
    });

    ['dragleave', 'drop'].forEach(n => {
      dropzone.addEventListener(n, (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-active');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        addFiles(Array.from(e.dataTransfer.files));
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        addFiles(Array.from(e.target.files));
      }
    });
  }

  if (btnAddMore && fileInput) {
    btnAddMore.addEventListener('click', () => fileInput.click());
  }

  if (btnClearAll) {
    btnClearAll.addEventListener('click', () => {
      state.documents = [];
      renderDocList();
    });
  }

  // --- Add Files to Pack ---
  function addFiles(files) {
    files.forEach(file => {
      const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
      const isImage = file.type.startsWith('image/');

      if (!isPdf && !isImage) return;

      // Guess category from file name
      let guessedCat = 'other';
      const lower = file.name.toLowerCase();
      if (lower.includes('photo') || lower.includes('pic') || lower.includes('passport')) guessedCat = 'photo';
      else if (lower.includes('sign') || lower.includes('hastakshar')) guessedCat = 'signature';
      else if (lower.includes('mark') || lower.includes('10th') || lower.includes('12th')) guessedCat = 'marksheet';
      else if (lower.includes('aadhaar') || lower.includes('aadhar') || lower.includes('pan')) guessedCat = 'id-proof';
      else if (lower.includes('cert') || lower.includes('caste') || lower.includes('income')) guessedCat = 'certificate';

      const catData = CATEGORIES[guessedCat];

      const docItem = {
        id: 'doc_' + docIdCounter++,
        file: file,
        origName: file.name,
        customName: file.name.substring(0, file.name.lastIndexOf('.')) || file.name,
        origSize: file.size,
        origType: file.type || (isPdf ? 'application/pdf' : 'image/jpeg'),
        category: guessedCat,
        targetFormat: isPdf ? 'application/pdf' : 'image/jpeg',
        targetKB: catData.targetKB,
        previewUrl: isImage ? URL.createObjectURL(file) : null,
        processedBlob: null,
        processedSize: null,
        status: 'ready' // 'ready', 'processing', 'done', 'error'
      };

      state.documents.push(docItem);
    });

    renderDocList();
  }

  // --- Render Document Pack List ---
  function renderDocList() {
    if (!docListContainer) return;

    if (state.documents.length === 0) {
      if (dropzone) dropzone.style.display = 'block';
      if (packSummaryBar) packSummaryBar.style.display = 'none';
      docListContainer.innerHTML = '';
      return;
    }

    if (dropzone) dropzone.style.display = 'none';
    if (packSummaryBar) packSummaryBar.style.display = 'flex';
    if (docCountBadge) docCountBadge.textContent = state.documents.length;

    docListContainer.innerHTML = state.documents.map((doc, idx) => `
      <div class="doc-item-card" id="${doc.id}">
        <!-- Thumb -->
        <div>
          ${doc.previewUrl 
            ? `<img src="${doc.previewUrl}" class="doc-thumb" alt="Thumb">`
            : `<div class="doc-thumb" style="display:flex;align-items:center;justify-content:center;color:var(--primary);font-size:1.5rem;"><i class="ph ph-file-pdf"></i></div>`
          }
        </div>

        <!-- Name & Info -->
        <div class="doc-info-col">
          <input type="text" class="adv-input" style="padding:0.35rem 0.6rem;font-weight:700;font-size:0.9rem;" value="${doc.customName}" onchange="updateDocName('${doc.id}', this.value)" title="Click to rename document">
          <div style="display:flex;gap:0.75rem;margin-top:0.3rem;font-size:0.75rem;color:var(--text-muted);">
            <span>Original: <strong>${formatBytes(doc.origSize)}</strong></span>
            <span>Type: <strong>${doc.origType.split('/')[1]?.toUpperCase() || 'FILE'}</strong></span>
          </div>
        </div>

        <!-- Output Format -->
        <div>
          <label style="font-size:0.72rem;font-weight:700;color:var(--text-muted);display:block;margin-bottom:0.25rem;">Convert To:</label>
          <select class="select-input" style="padding:0.4rem 0.6rem;font-size:0.82rem;" onchange="updateDocFormat('${doc.id}', this.value)">
            <option value="image/jpeg" ${doc.targetFormat === 'image/jpeg' ? 'selected' : ''}>JPG / JPEG</option>
            <option value="image/png" ${doc.targetFormat === 'image/png' ? 'selected' : ''}>PNG</option>
            <option value="image/webp" ${doc.targetFormat === 'image/webp' ? 'selected' : ''}>WEBP</option>
            <option value="application/pdf" ${doc.targetFormat === 'application/pdf' ? 'selected' : ''}>PDF Document</option>
          </select>
        </div>

        <!-- Target KB Size -->
        <div>
          <label style="font-size:0.72rem;font-weight:700;color:var(--text-muted);display:block;margin-bottom:0.25rem;">Target Size (KB):</label>
          <input type="number" class="adv-input" style="padding:0.4rem 0.6rem;font-size:0.82rem;width:100%;" value="${doc.targetKB}" min="5" max="5000" onchange="updateDocKB('${doc.id}', this.value)">
        </div>

        <!-- Action / Download -->
        <div class="doc-action-col">
          <button class="button primary small" onclick="processAndDownloadSingle('${doc.id}')" title="Convert & Download this file">
            <i class="ph ph-download-simple"></i>
          </button>
          <button class="button secondary small" style="color:var(--danger);" onclick="removeDoc('${doc.id}')" title="Remove file">
            <i class="ph ph-trash"></i>
          </button>
        </div>
      </div>
    `).join('');
  }

  // Window helpers for inline HTML event handlers
  window.updateDocName = (id, name) => {
    const doc = state.documents.find(d => d.id === id);
    if (doc) doc.customName = name.trim();
  };

  window.updateDocFormat = (id, format) => {
    const doc = state.documents.find(d => d.id === id);
    if (doc) doc.targetFormat = format;
  };

  window.updateDocKB = (id, kb) => {
    const doc = state.documents.find(d => d.id === id);
    if (doc) doc.targetKB = parseInt(kb, 10) || 50;
  };

  window.removeDoc = (id) => {
    state.documents = state.documents.filter(d => d.id !== id);
    renderDocList();
  };

  // --- Process Single Document to Target Format & KB ---
  window.processAndDownloadSingle = async (id) => {
    const doc = state.documents.find(d => d.id === id);
    if (!doc) return;

    try {
      const cardEl = document.getElementById(id);
      if (cardEl) cardEl.style.opacity = '0.6';

      const result = await processDocument(doc);
      downloadBlob(result.blob, result.filename);

      if (cardEl) cardEl.style.opacity = '1';
    } catch (err) {
      alert('Error processing document: ' + err.message);
    }
  };

  async function processDocument(doc) {
    const isTargetPdf = doc.targetFormat === 'application/pdf';
    const isOrigPdf = doc.file.type === 'application/pdf' || doc.file.name.endsWith('.pdf');

    // Case 1: Image to Image (with target KB)
    if (!isOrigPdf && !isTargetPdf) {
      let finalBlob = doc.file;
      if (typeof ImageCompressor !== 'undefined' && ImageCompressor.compressImage) {
        const comp = await ImageCompressor.compressImage(doc.file, {
          targetKB: doc.targetKB,
          format: doc.targetFormat,
          strictUnder: true
        });
        finalBlob = comp.blob;
      }
      const ext = doc.targetFormat === 'image/png' ? 'png' : (doc.targetFormat === 'image/webp' ? 'webp' : 'jpg');
      return { blob: finalBlob, filename: `${doc.customName}.${ext}` };
    }

    // Case 2: Image to PDF
    if (!isOrigPdf && isTargetPdf) {
      if (!window.jspdf || !window.jspdf.jsPDF) throw new Error('PDF library loading...');
      
      const img = await loadImage(doc.file);
      const pdf = new window.jspdf.jsPDF({
        orientation: img.width > img.height ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      
      // Calculate fit
      const ratio = img.width / img.height;
      let w = pageW - 20;
      let h = w / ratio;
      if (h > pageH - 20) {
        h = pageH - 20;
        w = h * ratio;
      }
      const x = (pageW - w) / 2;
      const y = (pageH - h) / 2;

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imgData = canvas.toDataURL('image/jpeg', 0.92);

      pdf.addImage(imgData, 'JPEG', x, y, w, h);
      const pdfBlob = pdf.output('blob');
      return { blob: pdfBlob, filename: `${doc.customName}.pdf` };
    }

    // Case 3: PDF to Image or PDF pass-through
    if (isOrigPdf && isTargetPdf) {
      return { blob: doc.file, filename: `${doc.customName}.pdf` };
    }

    // Default fallback
    return { blob: doc.file, filename: `${doc.customName}.jpg` };
  }

  // --- Batch Download: Download All as ZIP Pack ---
  if (btnDownloadAllZip) {
    btnDownloadAllZip.addEventListener('click', async () => {
      if (state.documents.length === 0) return;
      if (typeof JSZip === 'undefined') {
        alert('ZIP compression library loading...');
        return;
      }

      btnDownloadAllZip.disabled = true;
      btnDownloadAllZip.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Zipping Pack...';

      try {
        const zip = new JSZip();
        for (const doc of state.documents) {
          const res = await processDocument(doc);
          zip.file(res.filename, res.blob);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(zipBlob, 'Application_Document_Pack.zip');
      } catch (err) {
        alert('Failed to generate ZIP: ' + err.message);
      } finally {
        btnDownloadAllZip.disabled = false;
        btnDownloadAllZip.innerHTML = '<i class="ph ph-file-zip"></i> Download Pack (ZIP)';
      }
    });
  }

  // --- Batch Download: Merge All Images to Single Application PDF ---
  if (btnMergeAllPdf) {
    btnMergeAllPdf.addEventListener('click', async () => {
      if (state.documents.length === 0) return;
      if (!window.jspdf || !window.jspdf.jsPDF) {
        alert('PDF library loading...');
        return;
      }

      btnMergeAllPdf.disabled = true;
      btnMergeAllPdf.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Merging PDF...';

      try {
        const pdf = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();

        let pageIndex = 0;
        for (const doc of state.documents) {
          if (!doc.file.type.startsWith('image/')) continue;

          if (pageIndex > 0) pdf.addPage();

          const img = await loadImage(doc.file);
          const ratio = img.width / img.height;
          let w = pageW - 20;
          let h = w / ratio;
          if (h > pageH - 20) {
            h = pageH - 20;
            w = h * ratio;
          }
          const x = (pageW - w) / 2;
          const y = (pageH - h) / 2;

          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const imgData = canvas.toDataURL('image/jpeg', 0.92);

          pdf.addImage(imgData, 'JPEG', x, y, w, h);
          pageIndex++;
        }

        pdf.save('Combined_Application_Documents.pdf');
      } catch (err) {
        alert('Failed to merge documents: ' + err.message);
      } finally {
        btnMergeAllPdf.disabled = false;
        btnMergeAllPdf.innerHTML = '<i class="ph ph-file-pdf"></i> Merge All to 1 PDF';
      }
    });
  }

  // Helper: Load Image
  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image failed to load')); };
      img.src = url;
    });
  }

  // Helper: Download Blob
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Helper: Format Bytes
  function formatBytes(bytes) {
    if (bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
});
