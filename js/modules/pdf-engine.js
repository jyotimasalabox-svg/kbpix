/**
 * PhotoResize Pro — Complete PDF Studio Engine
 * 100% Client-side PDF rendering, conversion, merging & splitting
 * Powered by PDF.js, jsPDF & pdf-lib (Loaded dynamically on demand)
 */

class PDFStudioEngine {
  constructor() {
    this.pdfJsLoaded = false;
    this.pdfLibLoaded = false;
  }

  // --- 1. Images to PDF ---
  async convertImagesToPDF(images, options = {}) {
    const {
      pageSize = 'a4', // 'a4', 'letter'
      orientation = 'portrait', // 'portrait', 'landscape'
      marginMm = 10,
      quality = 0.92,
      fitToPage = true
    } = options;

    if (!window.jspdf || !window.jspdf.jsPDF) {
      await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    }

    const doc = new window.jspdf.jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: pageSize
    });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    for (let i = 0; i < images.length; i++) {
      if (i > 0) doc.addPage();

      const img = images[i];
      const imgRatio = img.width / img.height;

      const availW = pageW - marginMm * 2;
      const availH = pageH - marginMm * 2;

      let drawW = availW;
      let drawH = drawW / imgRatio;

      if (drawH > availH) {
        drawH = availH;
        drawW = drawH * imgRatio;
      }

      const x = marginMm + (availW - drawW) / 2;
      const y = marginMm + (availH - drawH) / 2;

      // Extract image data as JPEG
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imgData = canvas.toDataURL('image/jpeg', quality);

      doc.addImage(imgData, 'JPEG', x, y, drawW, drawH);
    }

    return doc.output('blob');
  }

  // --- 2. PDF to Images (JPG / PNG) ---
  async convertPDFToImages(pdfBlobOrFile, options = {}) {
    const {
      format = 'image/jpeg', // 'image/jpeg', 'image/png'
      dpi = 200,             // 150, 200, 300 DPI
      onProgress = null
    } = options;

    await this.ensurePDFJs();

    const arrayBuffer = await pdfBlobOrFile.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;

    const scale = dpi / 72; // Standard PDF DPI is 72
    const renderedImages = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      if (onProgress) onProgress(Math.round((pageNum / numPages) * 100), `Rendering page ${pageNum} of ${numPages}...`);

      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      await page.render({ canvasContext: ctx, viewport }).promise;

      const blob = await new Promise(res => canvas.toBlob(res, format, 0.95));
      const ext = format === 'image/png' ? 'png' : 'jpg';

      renderedImages.push({
        pageNum,
        blob,
        canvas,
        filename: `page_${pageNum}.${ext}`,
        width: viewport.width,
        height: viewport.height
      });
    }

    return renderedImages;
  }

  // --- 3. Merge Multiple PDFs ---
  async mergePDFs(pdfFiles, onProgress = null) {
    await this.ensurePdfLib();

    if (onProgress) onProgress(20, 'Creating unified PDF container...');
    const mergedPdf = await PDFLib.PDFDocument.create();

    for (let i = 0; i < pdfFiles.length; i++) {
      if (onProgress) onProgress(Math.round(20 + ((i + 1) / pdfFiles.length) * 60), `Merging PDF ${i + 1} of ${pdfFiles.length}...`);
      const fileBytes = await pdfFiles[i].arrayBuffer();
      const pdf = await PDFLib.PDFDocument.load(fileBytes);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach(page => mergedPdf.addPage(page));
    }

    if (onProgress) onProgress(95, 'Finalizing merged PDF...');
    const mergedPdfBytes = await mergedPdf.save();
    return new Blob([mergedPdfBytes], { type: 'application/pdf' });
  }

  // --- 4. Split / Extract PDF Pages ---
  async splitPDF(pdfFile, pageIndices = [], onProgress = null) {
    await this.ensurePdfLib();

    const fileBytes = await pdfFile.arrayBuffer();
    const srcPdf = await PDFLib.PDFDocument.load(fileBytes);
    const newPdf = await PDFLib.PDFDocument.create();

    const indicesToExtract = pageIndices.length > 0
      ? pageIndices
      : srcPdf.getPageIndices();

    const copiedPages = await newPdf.copyPages(srcPdf, indicesToExtract);
    copiedPages.forEach(p => newPdf.addPage(p));

    const outBytes = await newPdf.save();
    return new Blob([outBytes], { type: 'application/pdf' });
  }

  async ensurePDFJs() {
    if (typeof pdfjsLib !== 'undefined') return;
    await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    this.pdfJsLoaded = true;
  }

  async ensurePdfLib() {
    if (typeof PDFLib !== 'undefined') return;
    await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js');
    this.pdfLibLoaded = true;
  }

  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
}

window.PDFStudioEngine = new PDFStudioEngine();
