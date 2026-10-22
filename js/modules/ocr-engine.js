/**
 * PhotoResize Pro — Image to Text (OCR) Engine
 * Powered by Tesseract.js (100% In-Browser Worker Processing)
 * Supports: English, Hindi, and Mixed English+Hindi OCR
 * Exports: Text (.txt), Word Document (.docx), Searchable PDF, Clipboard Copy
 */

class OCREngine {
  constructor() {
    this.worker = null;
    this.currentLanguage = 'eng';
    this.isInitializing = false;
  }

  async initWorker(lang = 'eng', onProgress = null) {
    if (this.worker && this.currentLanguage === lang) return this.worker;
    this.isInitializing = true;

    try {
      if (typeof Tesseract === 'undefined') {
        // Load Tesseract.js script dynamically
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
            onProgress(pct, `Recognizing text (${pct}%)...`);
          } else if (onProgress && m.status) {
            onProgress(30, `${m.status}...`);
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
      language = 'eng', // 'eng', 'hin', 'eng+hin'
      onProgress = null
    } = options;

    const worker = await this.initWorker(language, onProgress);
    if (onProgress) onProgress(40, 'Scanning text lines and words...');

    const result = await worker.recognize(imageSource);
    if (onProgress) onProgress(100, 'Recognition completed successfully!');

    return {
      text: result.data.text,
      confidence: result.data.confidence,
      words: result.data.words || [],
      lines: result.data.lines || [],
      blocks: result.data.blocks || []
    };
  }

  // Export as .TXT
  downloadTXT(text, filename = 'extracted_text.txt') {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    this.saveBlob(blob, filename);
  }

  // Export as Word-compatible .DOCX (HTML document format supported by MS Word and Google Docs)
  downloadDOCX(text, filename = 'extracted_document.docx') {
    const content = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>${filename}</title>
      <style>
        body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; color: #111827; }
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
      alert('PDF generator library loading...');
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
