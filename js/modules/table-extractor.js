/**
 * PhotoResize Pro — Image to Excel / CSV Table Extractor Engine
 * Uses spatial bounding-box clustering to construct 2D tables from document images
 * Exports: Excel (.xlsx), Comma-Separated Values (.csv), Interactive Editable Grid
 */

class TableExtractorEngine {
  constructor() {
    this.sheetJsLoaded = false;
  }

  async extractTableFromImage(imageSource, onProgress = null) {
    if (!window.OCREngine) throw new Error('OCR Engine not loaded');

    if (onProgress) onProgress(20, 'Analyzing image document text & geometry...');
    const ocrData = await window.OCREngine.recognizeImage(imageSource, {
      language: 'eng',
      onProgress: (pct, msg) => {
        if (onProgress) onProgress(Math.round(20 + pct * 0.5), msg);
      }
    });

    if (onProgress) onProgress(75, 'Detecting grid coordinates, rows & column clusters...');

    // Use word bounding boxes for geometric row & column clustering
    const words = ocrData.words || [];
    if (words.length === 0) {
      // Fallback: parse lines by tabs/spaces
      return this.parseLinesToTable(ocrData.text);
    }

    const tableData = this.clusterWordsIntoTable(words);
    if (onProgress) onProgress(100, 'Table structure ready!');
    return tableData;
  }

  clusterWordsIntoTable(words) {
    // 1. Sort words top-to-bottom
    const sorted = [...words].sort((a, b) => a.bbox.y0 - b.bbox.y0);

    // 2. Group into horizontal rows (vertical overlap tolerance ~12px)
    const rows = [];
    const yTol = 14;

    sorted.forEach(w => {
      const centerY = (w.bbox.y0 + w.bbox.y1) / 2;
      let matchedRow = rows.find(r => Math.abs(r.centerY - centerY) <= yTol);
      if (!matchedRow) {
        matchedRow = { centerY, words: [] };
        rows.push(matchedRow);
      }
      matchedRow.words.push(w);
    });

    // 3. In each row, sort words left-to-right
    rows.forEach(r => {
      r.words.sort((a, b) => a.bbox.x0 - b.bbox.x0);
    });

    // 4. Cluster vertical column positions
    const colXs = [];
    words.forEach(w => {
      const x = w.bbox.x0;
      let existing = colXs.find(c => Math.abs(c.x - x) < 30);
      if (!existing) {
        colXs.push({ x, count: 1 });
      } else {
        existing.count++;
      }
    });
    colXs.sort((a, b) => a.x - b.x);

    // 5. Convert rows into 2D cell grid
    const grid = rows.map(r => {
      // If words in row are close, join them into cell, else split by gap > 35px
      const cells = [];
      let currentCell = [];
      let lastX1 = -1;

      r.words.forEach(w => {
        if (lastX1 !== -1 && w.bbox.x0 - lastX1 > 35) {
          cells.push(currentCell.map(cw => cw.text).join(' '));
          currentCell = [];
        }
        currentCell.push(w);
        lastX1 = w.bbox.x1;
      });

      if (currentCell.length > 0) {
        cells.push(currentCell.map(cw => cw.text).join(' '));
      }
      return cells;
    });

    // Normalize column length
    const maxCols = Math.max(...grid.map(r => r.length), 1);
    const normalizedGrid = grid.map(r => {
      while (r.length < maxCols) r.push('');
      return r;
    });

    return {
      grid: normalizedGrid,
      rowCount: normalizedGrid.length,
      colCount: maxCols,
      confidence: ocrData.confidence || 85
    };
  }

  parseLinesToTable(rawText) {
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    const grid = lines.map(line => {
      // Split by tab, pipe, or multiple spaces
      if (line.includes('\t')) return line.split('\t');
      if (line.includes('|')) return line.split('|').map(s => s.trim()).filter(Boolean);
      return line.split(/\s{2,}/);
    });

    const maxCols = Math.max(...grid.map(r => r.length), 1);
    const normalizedGrid = grid.map(r => {
      while (r.length < maxCols) r.push('');
      return r;
    });

    return {
      grid: normalizedGrid,
      rowCount: normalizedGrid.length,
      colCount: maxCols,
      confidence: 70
    };
  }

  // Export as CSV
  downloadCSV(grid, filename = 'extracted_table.csv') {
    const csvContent = grid.map(row => {
      return row.map(cell => {
        const text = (cell || '').toString().replace(/"/g, '""');
        return `"${text}"`;
      }).join(',');
    }).join('\r\n');

    const blob = new Blob(['\ufeff', csvContent], { type: 'text/csv;charset=utf-8;' });
    this.saveBlob(blob, filename);
  }

  // Export as Excel (.xlsx) using SheetJS
  async downloadXLSX(grid, filename = 'extracted_table.xlsx') {
    await this.ensureSheetJS();

    if (typeof XLSX === 'undefined') {
      // Fallback to CSV if library fails to load
      this.downloadCSV(grid, filename.replace('.xlsx', '.csv'));
      return;
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(grid);
    XLSX.utils.book_append_sheet(wb, ws, 'Table1');
    XLSX.writeFile(wb, filename);
  }

  async ensureSheetJS() {
    if (typeof XLSX !== 'undefined') return;
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      script.onload = () => {
        this.sheetJsLoaded = true;
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
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
}

window.TableExtractorEngine = new TableExtractorEngine();
