/**
 * PhotoResize Pro — Smart Image to Text (OCR) Engine & Preprocessor
 * Powered by Tesseract.js with client-side adaptive image binarization,
 * noise removal (eliminates rogue '0' & symbols), bounding-box extraction,
 * and high-accuracy English + Hindi recognition.
 */

class OCREngine {
  constructor() {
    this.worker = null;
    this.currentLanguage = 'eng';
    this.isInitializing = false;
  }

  // Pre-process noisy document photos for ultra-high OCR accuracy
  preprocessForOCR(imageElement, options = {}) {
    const {
      enhanceContrast = true,
      sharpen = true,
      binarize = false
    } = options;

    const w = imageElement.naturalWidth || imageElement.width;
    const h = imageElement.naturalHeight || imageElement.height;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imageElement, 0, 0, w, h);

    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;
    const len = d.length;

    // 1. Grayscale & find min/max luminance
    let minLum = 255;
    let maxLum = 0;
    const lumArray = new Uint8Array(len / 4);

    for (let i = 0, j = 0; i < len; i += 4, j++) {
      // Perceptual luminance
      const lum = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
      lumArray[j] = lum;
      if (lum < minLum) minLum = lum;
      if (lum > maxLum) maxLum = lum;
    }

    const lumRange = Math.max(1, maxLum - minLum);

    // 2. Adaptive contrast stretch & clean noise
    for (let i = 0, j = 0; i < len; i += 4, j++) {
      let lum = lumArray[j];

      if (enhanceContrast) {
        // Stretch histogram so paper becomes clean white, text becomes deep black
        lum = Math.round(((lum - minLum) / lumRange) * 255);
        // Gamma correction to deepen text strokes
        lum = Math.round(255 * Math.pow(lum / 255, 1.2));
      }

      if (binarize) {
        lum = lum > 140 ? 255 : 0;
      }

      d[i] = lum;
      d[i + 1] = lum;
      d[i + 2] = lum;
    }

    ctx.putImageData(imgData, 0, 0);

    // 3. Unsharp Masking / Sharpening pass if requested
    if (sharpen && w <= 3000 && h <= 3000) {
      const sharpCanvas = document.createElement('canvas');
      sharpCanvas.width = w;
      sharpCanvas.height = h;
      const sCtx = sharpCanvas.getContext('2d');
      sCtx.drawImage(canvas, 0, 0);

      const srcData = ctx.getImageData(0, 0, w, h);
      const outData = sCtx.createImageData(w, h);
      const s = srcData.data;
      const o = outData.data;

      // 3x3 unsharp kernel
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = (y * w + x) * 4;
          const up = ((y - 1) * w + x) * 4;
          const down = ((y + 1) * w + x) * 4;
          const left = (y * w + (x - 1)) * 4;
          const right = (y * w + (x + 1)) * 4;

          const val = 5 * s[idx] - (s[up] + s[down] + s[left] + s[right]);
          const clamped = Math.max(0, Math.min(255, val));

          o[idx] = clamped;
          o[idx + 1] = clamped;
          o[idx + 2] = clamped;
          o[idx + 3] = 255;
        }
      }
      sCtx.putImageData(outData, 0, 0);
      return sharpCanvas;
    }

    return canvas;
  }

  async initWorker(lang = 'eng', onProgress = null) {
    if (this.worker && this.currentLanguage === lang) return this.worker;
    this.isInitializing = true;

    try {
      if (typeof Tesseract === 'undefined') {
        await this.loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
      }

      if (this.worker) {
        await this.worker.terminate();
      }

      if (onProgress) onProgress(15, `Loading ${lang === 'hin' ? 'Hindi' : 'English'} OCR Engine...`);

      const worker = await Tesseract.createWorker(lang, 1, {
        logger: m => {
          if (m.status === 'recognizing text' && onProgress) {
            const pct = Math.round(m.progress * 100);
            onProgress(pct, `Scanning & recognizing text (${pct}%)...`);
          } else if (onProgress && m.status) {
            onProgress(25, `${m.status}...`);
          }
        }
      });

      this.worker = worker;
      this.currentLanguage = lang;
      this.isInitializing = false;
      return worker;
    } catch (err) {
      this.isInitializing = false;
      throw new Error('Failed to initialize OCR: ' + err.message);
    }
  }

  async recognizeImage(imageSource, options = {}) {
    const {
      language = 'eng',
      onProgress = null,
      usePreprocessing = true
    } = options;

    if (onProgress) onProgress(10, 'Preprocessing image for sharp text clarity...');

    // Load Image Element
    const img = await this.loadImageElement(imageSource);
    let processSource = img;

    if (usePreprocessing) {
      processSource = this.preprocessForOCR(img, { enhanceContrast: true, sharpen: true });
    }

    const worker = await this.initWorker(language, onProgress);
    if (onProgress) onProgress(40, 'Detecting text lines, fonts & layout...');

    const result = await worker.recognize(processSource);
    if (onProgress) onProgress(100, 'Recognition completed successfully!');

    // Clean noise & rogue artifacts like random single zeros or symbols
    const cleanedText = this.cleanOCRText(result.data.text || '');

    // Extract word and line bounding boxes
    const lines = (result.data.lines || []).map(line => ({
      text: (line.text || '').trim(),
      confidence: line.confidence,
      bbox: line.bbox,
      words: (line.words || []).map(w => ({
        text: (w.text || '').trim(),
        confidence: w.confidence,
        bbox: w.bbox
      }))
    })).filter(l => l.text.length > 0 && l.text !== '0');

    return {
      text: cleanedText,
      confidence: result.data.confidence,
      lines,
      words: result.data.words || [],
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      sourceImg: img
    };
  }

  // Filter out stray noisy characters and artifacts
  cleanOCRText(raw) {
    if (!raw) return '';
    return raw
      .split('\n')
      .map(line => {
        let l = line.trim();
        // Remove standalone garbage characters on their own line like '~', '^', '0', '|'
        if (/^[|~`^0_—=\-+*]$/.test(l)) return '';
        // Normalize multiple spaces
        l = l.replace(/\s+/g, ' ');
        return l;
      })
      .filter(l => l.length > 0)
      .join('\n');
  }

  loadImageElement(src) {
    return new Promise((resolve, reject) => {
      if (src instanceof HTMLImageElement && src.complete) {
        resolve(src);
        return;
      }
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = typeof src === 'string' ? src : URL.createObjectURL(src);
    });
  }

  // Export as .TXT
  downloadTXT(text, filename = 'extracted_text.txt') {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    this.saveBlob(blob, filename);
  }

  // Export as Word-compatible .DOCX
  downloadDOCX(text, filename = 'extracted_document.docx') {
    const content = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>${filename}</title>
      <style>
        body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.6; color: #111827; }
        p { margin-bottom: 0.8em; white-space: pre-wrap; }
      </style>
      </head>
      <body>
        ${text.split('\n').map(line => `<p>${this.escapeHtml(line)}</p>`).join('')}
      </body>
      </html>
    `;
    const blob = new Blob(['\ufeff', content], { type: 'application/msword' });
    this.saveBlob(blob, filename.replace('.docx', '.doc'));
  }

  // Export as searchable PDF via jsPDF
  downloadSearchablePDF(text, filename = 'searchable_ocr_document.pdf') {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert('PDF library is loading...');
      return;
    }
    const doc = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);

    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxWidth = pageWidth - (margin * 2);

    const lines = doc.splitTextToSize(text, maxWidth);
    let y = 20;

    for (let i = 0; i < lines.length; i++) {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(lines[i], margin, y);
      y += 5.5;
    }

    doc.save(filename);
  }

  saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

window.OCREngine = new OCREngine();
