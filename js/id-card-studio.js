/**
 * Smart ID Card Print Studio (Pragya Kendra & CSC Studio)
 * Inspired by BGrade ID Card Printer.
 * Dedicated tool for printing Aadhaar, PAN, Voter ID, Driving Licence,
 * Ayushman cards on A4 sheets with exact standard PVC (8.56 × 5.40 cm) dimensions.
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const state = {
    frontImg: null,
    backImg: null,
    frontFile: null,
    backFile: null,

    // Document Dimensions (PVC Standard: 8.56 cm x 5.40 cm)
    docWidthCm: 8.56,
    docHeightCm: 5.40,
    currentDocType: 'aadhaar',

    // Layout Preset: 'csc-fold', 'csc-side', 'csc-5in1', 'grid-4'
    layoutPreset: 'csc-fold',

    // Card Appearance
    ecoInkSaver: false,
    autoContrast: true,
    shadowClean: true,
    borderStyle: 'dashed', // 'dashed', 'solid', 'none'
    cornerStyle: 'rounded', // 'rounded', 'sharp'

    // Multi-card duplicates for 5-in-1 sheet
    repeatCount: 5
  };

  const DPI = 300;
  const CM_TO_PX = DPI / 2.54; // ≈ 118.11 px/cm
  const A4_W_CM = 21.0;
  const A4_H_CM = 29.7;

  // DOM Elements
  const frontSlot = document.getElementById('idSlotFront');
  const backSlot = document.getElementById('idSlotBack');
  const frontInput = document.getElementById('idInputFront');
  const backInput = document.getElementById('idInputBack');
  const btnClearCards = document.getElementById('btnClearIdCards');

  const canvas = document.getElementById('idPrintCanvas');
  const dimWidthChip = document.getElementById('idDimWidth');
  const dimHeightChip = document.getElementById('idDimHeight');
  const layoutInfoChip = document.getElementById('idLayoutInfoChip');

  // Presets and layout buttons
  const docTypePills = document.querySelectorAll('.doc-type-btn[data-doctype]');
  const layoutPills = document.querySelectorAll('.id-layout-btn[data-layout]');
  
  // Enhancement toggles
  const btnEcoInk = document.getElementById('btnEcoInkSaver');
  const checkAutoContrast = document.getElementById('checkAutoContrast');
  const checkShadowClean = document.getElementById('checkShadowClean');
  const borderSelect = document.getElementById('idBorderSelect');
  const cornerSelect = document.getElementById('idCornerSelect');

  // Print & Export
  const btnPrintA4 = document.getElementById('btnPrintIdA4');

  // Theme Toggle Support
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIcon = document.getElementById('themeIcon');
  const themeText = document.getElementById('themeText');

  function applyTheme(t) {
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

  const savedTheme = localStorage.getItem('photo_theme') || 'light';
  applyTheme(savedTheme);

  if (themeToggleBtn && !themeToggleBtn.dataset.themeBound) {
    themeToggleBtn.dataset.themeBound = 'true';
    themeToggleBtn.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      applyTheme(isDark ? 'light' : 'dark');
    });
  }
  const btnExportPdf = document.getElementById('btnExportIdPdf');
  const btnDownloadImage = document.getElementById('btnDownloadIdImage');

  // Presets mapping
  const DOC_PRESETS = {
    'aadhaar': { w: 8.56, h: 5.40, name: 'Aadhaar Card' },
    'pan': { w: 8.56, h: 5.40, name: 'PAN Card' },
    'voter': { w: 8.56, h: 5.40, name: 'Voter ID (EPIC)' },
    'dl': { w: 8.56, h: 5.40, name: 'Driving Licence' },
    'ayushman': { w: 8.56, h: 5.40, name: 'Ayushman / ABHA' },
    'custom': { w: 8.56, h: 5.40, name: 'Custom ID' }
  };

  // --- File upload listeners ---
  if (frontSlot && frontInput) {
    frontSlot.addEventListener('click', () => frontInput.click());
    setupSlotDrop(frontSlot, (file) => loadCardImage(file, 'front'));
    frontInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) loadCardImage(e.target.files[0], 'front');
    });
  }

  if (backSlot && backInput) {
    backSlot.addEventListener('click', () => backInput.click());
    setupSlotDrop(backSlot, (file) => loadCardImage(file, 'back'));
    backInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) loadCardImage(e.target.files[0], 'back');
    });
  }

  function setupSlotDrop(slot, onFileLoaded) {
    ['dragenter', 'dragover'].forEach(name => {
      slot.addEventListener(name, (e) => {
        e.preventDefault();
        slot.classList.add('drag-over');
      });
    });
    ['dragleave', 'drop'].forEach(name => {
      slot.addEventListener(name, (e) => {
        e.preventDefault();
        slot.classList.remove('drag-over');
      });
    });
    slot.addEventListener('drop', (e) => {
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        onFileLoaded(e.dataTransfer.files[0]);
      }
    });
  }

  function loadCardImage(file, side) {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (side === 'front') {
        state.frontImg = img;
        state.frontFile = file;
        renderSlotPreview(frontSlot, img, 'Front Side Loaded');
      } else {
        state.backImg = img;
        state.backFile = file;
        renderSlotPreview(backSlot, img, 'Back Side Loaded');
      }
      renderA4Sheet();
    };
    img.src = url;
  }

  function renderSlotPreview(slot, img, label) {
    slot.classList.add('has-image');
    slot.innerHTML = `
      <img src="${img.src}" alt="${label}">
      <span style="font-size: 0.78rem; font-weight: 700; color: var(--accent); margin-top: 0.35rem;">✓ ${label}</span>
      <small style="font-size: 0.68rem; color: var(--text-muted);">Click to change</small>
    `;
  }

  if (btnClearCards) {
    btnClearCards.addEventListener('click', () => {
      state.frontImg = null;
      state.backImg = null;
      if (frontSlot) {
        frontSlot.classList.remove('has-image');
        frontSlot.innerHTML = `
          <div style="font-size: 2rem; color: var(--primary); margin-bottom: 0.5rem;"><i class="ph ph-identification-badge"></i></div>
          <h4 style="font-size: 0.95rem; font-weight: 700;">Upload Front Side</h4>
          <p style="font-size: 0.8rem; color: var(--text-muted);">Drag & drop or click</p>
        `;
      }
      if (backSlot) {
        backSlot.classList.remove('has-image');
        backSlot.innerHTML = `
          <div style="font-size: 2rem; color: var(--primary); margin-bottom: 0.5rem;"><i class="ph ph-credit-card"></i></div>
          <h4 style="font-size: 0.95rem; font-weight: 700;">Upload Back Side</h4>
          <p style="font-size: 0.8rem; color: var(--text-muted);">(Optional for Single card)</p>
        `;
      }
      renderA4Sheet();
    });
  }

  // --- Document Type Presets ---
  docTypePills.forEach(pill => {
    pill.addEventListener('click', () => {
      docTypePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const type = pill.dataset.doctype;
      const data = DOC_PRESETS[type];
      if (data) {
        state.currentDocType = type;
        state.docWidthCm = data.w;
        state.docHeightCm = data.h;

        if (dimWidthChip) dimWidthChip.textContent = data.w;
        if (dimHeightChip) dimHeightChip.textContent = data.h;

        renderA4Sheet();
      }
    });
  });

  // --- Layout Preset Selection ---
  layoutPills.forEach(pill => {
    pill.addEventListener('click', () => {
      layoutPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.layoutPreset = pill.dataset.layout;
      renderA4Sheet();
    });
  });

  // --- Enhancements Toggles ---
  if (btnEcoInk) {
    btnEcoInk.addEventListener('click', () => {
      state.ecoInkSaver = !state.ecoInkSaver;
      btnEcoInk.classList.toggle('active', state.ecoInkSaver);
      renderA4Sheet();
    });
  }

  if (checkAutoContrast) {
    checkAutoContrast.addEventListener('change', () => {
      state.autoContrast = checkAutoContrast.checked;
      renderA4Sheet();
    });
  }

  if (checkShadowClean) {
    checkShadowClean.addEventListener('change', () => {
      state.shadowClean = checkShadowClean.checked;
      renderA4Sheet();
    });
  }

  if (borderSelect) {
    borderSelect.addEventListener('change', () => {
      state.borderStyle = borderSelect.value;
      renderA4Sheet();
    });
  }

  if (cornerSelect) {
    cornerSelect.addEventListener('change', () => {
      state.cornerStyle = cornerSelect.value;
      renderA4Sheet();
    });
  }

  // --- Master Render: A4 Sheet (1:1 Exact Print Scale) ---
  function renderA4Sheet() {
    if (!canvas) return;

    const a4W = Math.round(A4_W_CM * CM_TO_PX);
    const a4H = Math.round(A4_H_CM * CM_TO_PX);

    canvas.width = a4W;
    canvas.height = a4H;

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 1. Crisp white paper
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, a4W, a4H);

    // If no card uploaded, draw empty blueprint guides
    if (!state.frontImg && !state.backImg) {
      drawEmptyPlaceholder(ctx, a4W, a4H);
      return;
    }

    const cardW = Math.round(state.docWidthCm * CM_TO_PX);
    const cardH = Math.round(state.docHeightCm * CM_TO_PX);

    const marginX = Math.round(1.5 * CM_TO_PX); // 1.5 cm margin
    const marginY = Math.round(1.5 * CM_TO_PX);

    if (state.layoutPreset === 'csc-fold') {
      // --- CSC Fold Layout: Front on top, Back on bottom with central dashed fold line ---
      const topY = marginY;
      const bottomY = topY + cardH;

      // Draw Front Card
      if (state.frontImg) {
        drawCardImage(ctx, state.frontImg, marginX, topY, cardW, cardH);
      } else {
        drawCardBorder(ctx, marginX, topY, cardW, cardH, 'Front Side Missing');
      }

      // Draw Back Card (or duplicate front if no back provided)
      const backSource = state.backImg || state.frontImg;
      if (backSource) {
        drawCardImage(ctx, backSource, marginX, bottomY, cardW, cardH);
      }

      // Center fold guideline
      ctx.save();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(marginX - 20, bottomY);
      ctx.lineTo(marginX + cardW + 20, bottomY);
      ctx.stroke();

      // Fold text label
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('✄ CENTER FOLD LINE (LAMINATION POUCH)', marginX + cardW + 25, bottomY + 4);
      ctx.restore();

      if (layoutInfoChip) {
        layoutInfoChip.textContent = 'CSC Fold Layout: Front & Back with Pouch Fold Guide (8.56 × 5.40 cm)';
      }

    } else if (state.layoutPreset === 'csc-side') {
      // --- Side by Side Layout: 5mm gap between cards ---
      const gapX = Math.round(0.5 * CM_TO_PX); // 5 mm
      const frontX = marginX;
      const backX = frontX + cardW + gapX;

      if (state.frontImg) {
        drawCardImage(ctx, state.frontImg, frontX, marginY, cardW, cardH);
      }
      const backSource = state.backImg || state.frontImg;
      if (backSource) {
        drawCardImage(ctx, backSource, backX, marginY, cardW, cardH);
      }

      if (layoutInfoChip) {
        layoutInfoChip.textContent = 'Side-by-Side: Front & Back with 5mm Cut Gap';
      }

    } else if (state.layoutPreset === 'csc-5in1') {
      // --- 5-in-1 Sheet Layout: 5 PVC cards stacked on one A4 sheet ---
      const gapY = Math.round(0.4 * CM_TO_PX); // 4 mm
      for (let i = 0; i < 5; i++) {
        const posY = marginY + i * (cardH + gapY);
        // Alternate front and back if both available, or draw front
        const img = (i % 2 === 0 || !state.backImg) ? (state.frontImg || state.backImg) : state.backImg;
        if (img) {
          drawCardImage(ctx, img, marginX, posY, cardW, cardH);
        }
      }

      if (layoutInfoChip) {
        layoutInfoChip.textContent = '5-in-1 Sheet: 5 Stacked PVC Cards (Saves Photo Paper)';
      }

    } else if (state.layoutPreset === 'grid-4') {
      // --- 2x2 Grid (4 cards) ---
      const gapX = Math.round(0.8 * CM_TO_PX);
      const gapY = Math.round(0.8 * CM_TO_PX);

      const positions = [
        { x: marginX, y: marginY, img: state.frontImg || state.backImg },
        { x: marginX + cardW + gapX, y: marginY, img: state.backImg || state.frontImg },
        { x: marginX, y: marginY + cardH + gapY, img: state.frontImg || state.backImg },
        { x: marginX + cardW + gapX, y: marginY + cardH + gapY, img: state.backImg || state.frontImg }
      ];

      positions.forEach(p => {
        if (p.img) drawCardImage(ctx, p.img, p.x, p.y, cardW, cardH);
      });

      if (layoutInfoChip) {
        layoutInfoChip.textContent = '2 × 2 Grid: 4 Cards on A4 Sheet';
      }
    }
  }

  // Draw card image with filter enhancement & border
  function drawCardImage(ctx, img, x, y, w, h) {
    ctx.save();

    // 1. Clip rounded corners if PVC style requested
    if (state.cornerStyle === 'rounded') {
      const radius = Math.round(0.318 * CM_TO_PX); // ≈ 3.18mm standard PVC corner radius
      roundRect(ctx, x, y, w, h, radius);
      ctx.clip();
    }

    // 2. Filters
    let filterStr = '';
    if (state.ecoInkSaver) {
      // Grayscale + High contrast for toner savings
      filterStr = 'grayscale(100%) contrast(140%) brightness(105%)';
    } else {
      let b = 100, c = 100;
      if (state.autoContrast) c = 120;
      if (state.shadowClean) b = 105;
      filterStr = `brightness(${b}%) contrast(${c}%)`;
    }
    ctx.filter = filterStr;

    // Draw image to fill card dimensions
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();

    // 3. Draw outline / cut guide border
    if (state.borderStyle !== 'none') {
      ctx.save();
      ctx.strokeStyle = state.borderStyle === 'dashed' ? '#94a3b8' : '#000000';
      ctx.lineWidth = 1;
      if (state.borderStyle === 'dashed') ctx.setLineDash([4, 4]);

      if (state.cornerStyle === 'rounded') {
        const radius = Math.round(0.318 * CM_TO_PX);
        roundRect(ctx, x, y, w, h, radius);
        ctx.stroke();
      } else {
        ctx.strokeRect(x, y, w, h);
      }
      ctx.restore();
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawCardBorder(ctx, x, y, w, h, label) {
    ctx.save();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2);
    ctx.restore();
  }

  function drawEmptyPlaceholder(ctx, w, h) {
    ctx.save();
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Upload Front & Back Card Images to Preview A4 1:1 Print Sheet', w / 2, h / 2 - 20);
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Standard PVC Size: 8.56 × 5.40 cm (Aadhaar, PAN, Voter, DL)', w / 2, h / 2 + 15);
    ctx.restore();
  }

  // --- Export Actions ---
  function executePrintA4() {
    if (!state.frontImg && !state.backImg) {
      alert('Please upload at least the Front Side of the card first!');
      if (frontInput) frontInput.click();
      return;
    }
    renderA4Sheet();
    window.print();
  }

  function executeExportPdf() {
    if (!state.frontImg && !state.backImg) {
      alert('Please upload at least the Front Side of the card first!');
      if (frontInput) frontInput.click();
      return;
    }
    if (!canvas) return;
    renderA4Sheet();

    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert('PDF library is loading, please try again.');
      return;
    }

    const btns = [btnExportPdf, document.getElementById('btnStageExportIdPdf')].filter(Boolean);
    btns.forEach(b => {
      b.disabled = true;
      b.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> Generating PDF...';
    });

    try {
      const doc = new window.jspdf.jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      doc.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      doc.save(`${state.currentDocType}_id_print_a4.pdf`);
    } catch (err) {
      alert('PDF generation error: ' + err.message);
    } finally {
      btns.forEach(b => {
        b.disabled = false;
        b.innerHTML = '<i class="ph-bold ph-file-pdf" style="color: #ef4444;"></i> Download Print PDF';
      });
    }
  }

  function executeDownloadImage() {
    if (!state.frontImg && !state.backImg) {
      alert('Please upload at least the Front Side of the card first!');
      if (frontInput) frontInput.click();
      return;
    }
    if (!canvas) return;
    renderA4Sheet();
    const url = canvas.toDataURL('image/jpeg', 0.95);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.currentDocType}_id_sheet.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  if (btnPrintA4) btnPrintA4.addEventListener('click', executePrintA4);
  const btnStagePrintIdA4 = document.getElementById('btnStagePrintIdA4');
  if (btnStagePrintIdA4) btnStagePrintIdA4.addEventListener('click', executePrintA4);

  if (btnExportPdf) btnExportPdf.addEventListener('click', executeExportPdf);
  const btnStageExportIdPdf = document.getElementById('btnStageExportIdPdf');
  if (btnStageExportIdPdf) btnStageExportIdPdf.addEventListener('click', executeExportPdf);

  if (btnDownloadImage) btnDownloadImage.addEventListener('click', executeDownloadImage);
  const btnStageDownloadIdJpg = document.getElementById('btnStageDownloadIdJpg');
  if (btnStageDownloadIdJpg) btnStageDownloadIdJpg.addEventListener('click', executeDownloadImage);

  // Initial draw
  renderA4Sheet();
});
