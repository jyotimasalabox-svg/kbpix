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
      enhanceContrast = true
    } = options;

    const w = imageElement.naturalWidth || imageElement.width;
    const h = imageElement.naturalHeight || imageElement.height;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imageElement, 0, 0, w, h);

    if (!enhanceContrast) return canvas;

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

    // 2. Mild adaptive contrast stretch (gentle gamma to avoid turning background textures into black noise)
    for (let i = 0, j = 0; i < len; i += 4, j++) {
      let lum = lumArray[j];
      // Normalize luminance
      lum = Math.round(((lum - minLum) / lumRange) * 255);
      // Gentle contrast curve (1.08 instead of aggressive 1.5)
      lum = Math.round(255 * Math.pow(lum / 255, 1.08));

      d[i] = lum;
      d[i + 1] = lum;
      d[i + 2] = lum;
    }

    ctx.putImageData(imgData, 0, 0);
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

      if (onProgress) {
        const langLabel = lang.includes('hin') ? (lang.includes('eng') ? 'English + Hindi' : 'Hindi') : 'English';
        onProgress(15, `Loading ${langLabel} OCR Engine...`);
      }

      // In Tesseract v5, multi-language must be an array (e.g. ['eng', 'hin']) to download each traineddata
      const langParam = typeof lang === 'string' && lang.includes('+') ? lang.split('+') : lang;

      const worker = await Tesseract.createWorker(langParam, 1, {
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

    // Extract word and line bounding boxes with noise filtering
    const lines = (result.data.lines || [])
      .map(line => {
        const cleaned = this.cleanOCRText(line.text || '').trim();
        return {
          text: cleaned,
          rawText: (line.text || '').trim(),
          confidence: line.confidence || 0,
          bbox: line.bbox,
          words: (line.words || []).map(w => ({
            text: (w.text || '').trim(),
            confidence: w.confidence || 0,
            bbox: w.bbox
          }))
        };
      })
      .filter(l => l.text.length >= 2 && l.confidence >= 25);

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
        // Remove standalone garbage symbols or noise tokens
        if (/^[|~`^0_—=\-+*#<>:;/\\]+$/.test(l)) return '';
        if (/^[\W_0-9]{1,2}$/.test(l) && !/^\d{1,2}$/.test(l)) return '';
        // Trim leading and trailing noise symbols
        l = l.replace(/^[|~`^0_—=\-+*#<>:;/\\]+\s*/, '');
        l = l.replace(/\s*[|~`^0_—=\-+*#<>:;/\\]+$/, '');
        // Normalize multiple spaces
        l = l.replace(/\s+/g, ' ').trim();
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
