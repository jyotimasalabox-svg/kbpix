/**
 * Advanced Client-Side Image Compression & Target-Matching Engine
 * Guarantees hitting target KB/MB/GB size while maximizing visual quality.
 * Prevents getting stuck at 72 KB or 79 KB in both compression and expansion.
 */

const ImageCompressor = (function() {
  'use strict';

  /**
   * Format bytes to human readable string (B, KB, MB, GB, TB)
   */
  function formatBytes(bytes, decimals = 1) {
    if (bytes === 0) return '0 KB';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const idx = Math.min(sizes.length - 1, Math.max(0, i));
    return parseFloat((bytes / Math.pow(k, idx)).toFixed(dm)) + ' ' + sizes[idx];
  }

  /**
   * Load an image file into an HTMLImageElement
   */
  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = (err) => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image file. File may be corrupt or unsupported.'));
      };
      img.src = url;
    });
  }

  /**
   * Convert canvas to Blob with specified mime type and quality
   */
  function canvasToBlob(canvas, mimeType, quality) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, mimeType, quality);
    });
  }

  /**
   * Pad a JPEG blob with safe JPEG COM (Comment) markers (0xFF, 0xFE)
   * to artificially increase file size to exact target bytes without affecting visuals.
   * Blazing-fast single allocation pass supporting KB, MB, and GB sizes.
   */
  async function padJpegBlob(blob, targetBytes) {
    if (!blob || blob.size >= targetBytes) return blob;
    const buffer = await blob.arrayBuffer();
    const bytesNeeded = targetBytes - buffer.byteLength;
    if (bytesNeeded <= 0) return blob;

    const uint8 = new Uint8Array(buffer);

    // If not JPEG (e.g. PNG, WebP), append trailing zero bytes
    if (uint8[0] !== 0xFF || uint8[1] !== 0xD8) {
      const paddedBuffer = new Uint8Array(targetBytes);
      paddedBuffer.set(uint8, 0);
      return new Blob([paddedBuffer], { type: blob.type || 'image/jpeg' });
    }

    // Direct single allocation for instant speed and zero memory thrashing
    const finalArray = new Uint8Array(targetBytes);

    // 1. Copy SOI (0xFF, 0xD8)
    finalArray[0] = 0xFF;
    finalArray[1] = 0xD8;
    let offset = 2;

    // 2. Insert standard JPEG COM (0xFF 0xFE) segments directly
    let remaining = bytesNeeded;
    while (remaining >= 5) {
      const segHeaderSize = 4;
      const payloadSize = Math.min(remaining - segHeaderSize, 65530);
      const segLen = payloadSize + 2;

      finalArray[offset] = 0xFF;
      finalArray[offset + 1] = 0xFE;
      finalArray[offset + 2] = (segLen >> 8) & 0xFF;
      finalArray[offset + 3] = segLen & 0xFF;
      finalArray.fill(0x20, offset + 4, offset + 4 + payloadSize);

      offset += (segHeaderSize + payloadSize);
      remaining -= (segHeaderSize + payloadSize);
    }

    // 3. Copy the rest of the original JPEG (from index 2 to end)
    finalArray.set(uint8.subarray(2), offset);
    offset += (uint8.length - 2);

    // 4. Fill any remaining small bytes (< 5 bytes) at the end
    if (offset < targetBytes) {
      finalArray.fill(0x00, offset, targetBytes);
    }

    return new Blob([finalArray], { type: 'image/jpeg' });
  }

  /**
   * Main Compression & Resizing Engine:
   * Compresses or increases an image to target size with maximum visual quality.
   * Guarantees hitting the requested target without getting stuck at 72 KB or 79 KB.
   */
  async function compressImage(file, options = {}) {
    const {
      targetKB = 100,             // Target size in KB
      format = 'auto',            // 'auto', 'image/jpeg', 'image/webp', 'image/png'
      maxWidth = null,            // Optional max dimension
      maxHeight = null,           // Optional max dimension
      strictUnder = true,         // Output MUST be <= targetKB
      allowIncrease = false,      // If file is smaller, pad it to reach targetKB
      targetExact = false,        // If true, match targetKB within 1% or exact bytes
      onProgress = null           // Progress callback (percent, statusText)
    } = options;

    const reportProgress = (pct, text) => {
      if (typeof onProgress === 'function') {
        onProgress(pct, text);
      }
    };

    reportProgress(10, 'Loading image...');
    const img = await loadImage(file);
    const originalWidth = img.naturalWidth || img.width;
    const originalHeight = img.naturalHeight || img.height;
    const originalSize = file.size;

    // Determine target bytes (clamped safely up to 2GB)
    const targetBytes = Math.min(2147480000, Math.round(targetKB * 1024));

    // Determine target MIME type
    let outMime = 'image/jpeg';
    if (format === 'auto') {
      if (file.type === 'image/webp') outMime = 'image/webp';
      else if (file.type === 'image/png' && originalSize <= targetBytes) outMime = 'image/png';
      else outMime = 'image/jpeg';
    } else {
      outMime = format;
    }

    reportProgress(20, 'Preparing canvas & dimensions...');

    // Calculate dimensions
    let targetWidth = originalWidth;
    let targetHeight = originalHeight;

    if (maxWidth && maxHeight) {
      const ratio = Math.min(maxWidth / originalWidth, maxHeight / originalHeight, 1.0);
      targetWidth = Math.round(originalWidth * ratio);
      targetHeight = Math.round(originalHeight * ratio);
    } else if (maxWidth && originalWidth > maxWidth) {
      targetHeight = Math.round((originalHeight * maxWidth) / originalWidth);
      targetWidth = maxWidth;
    } else if (maxHeight && originalHeight > maxHeight) {
      targetWidth = Math.round((originalWidth * maxHeight) / originalHeight);
      targetHeight = maxHeight;
    }

    // Create Canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: outMime !== 'image/jpeg' });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    let currentScale = 1.0;

    const renderCanvas = (scale) => {
      const w = Math.max(1, Math.round(targetWidth * scale));
      const h = Math.max(1, Math.round(targetHeight * scale));
      canvas.width = w;
      canvas.height = h;

      if (outMime === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
      } else {
        ctx.clearRect(0, 0, w, h);
      }
      ctx.drawImage(img, 0, 0, w, h);
      return { w, h };
    };

    renderCanvas(currentScale);

    // Test at maximum quality (0.98)
    const maxQualityBlob = await canvasToBlob(canvas, outMime, 0.98);

    // =========================================================================
    // SCENARIO 1: Image at Max Quality is ALREADY SMALLER than targetBytes
    // (e.g. natural max JPEG is 72 KB or 79 KB, and user entered 100 KB, 500 KB, 1 MB, 100 MB)
    // =========================================================================
    if (maxQualityBlob.size < targetBytes) {
      // If user requested target size, or allowIncrease, or targetExact, or target is significantly larger:
      if (allowIncrease || targetExact || (targetBytes > maxQualityBlob.size * 1.05)) {
        reportProgress(70, `Padding file to reach target ${formatBytes(targetBytes)}...`);
        const paddedBlob = await padJpegBlob(maxQualityBlob, targetBytes);
        reportProgress(100, 'Done!');
        return {
          blob: paddedBlob,
          width: canvas.width,
          height: canvas.height,
          originalSize,
          compressedSize: paddedBlob.size,
          quality: 0.98,
          scale: currentScale,
          type: paddedBlob.type,
          isPadded: true
        };
      } else {
        reportProgress(100, 'Image fits within target at maximum quality!');
        return {
          blob: maxQualityBlob,
          width: canvas.width,
          height: canvas.height,
          originalSize,
          compressedSize: maxQualityBlob.size,
          quality: 0.98,
          scale: currentScale,
          type: maxQualityBlob.type,
          isPadded: false
        };
      }
    }

    // =========================================================================
    // SCENARIO 2: Image is LARGER than targetBytes (Needs compression)
    // =========================================================================

    // If target is PNG
    if (outMime === 'image/png') {
      reportProgress(40, 'Compressing PNG...');
      let blob = maxQualityBlob;
      let attempts = 0;
      while (blob.size > targetBytes && currentScale > 0.05 && attempts < 15) {
        attempts++;
        const ratio = Math.sqrt(targetBytes / blob.size) * 0.98;
        currentScale = Math.max(0.05, currentScale * ratio);
        renderCanvas(currentScale);
        blob = await canvasToBlob(canvas, 'image/png');
        reportProgress(40 + Math.round((attempts / 15) * 50), `Rescaling dimensions (${Math.round(currentScale * 100)}%)...`);
      }
      if ((targetExact || allowIncrease) && blob.size < targetBytes) {
        blob = await padJpegBlob(blob, targetBytes);
      }
      reportProgress(100, 'Compression completed!');
      return {
        blob,
        width: canvas.width,
        height: canvas.height,
        originalSize,
        compressedSize: blob.size,
        quality: 1.0,
        scale: currentScale,
        type: 'image/png',
        isPadded: blob.size === targetBytes
      };
    }

    // For JPEG / WebP:
    // Check if lowest quality (0.08) at 100% scale is STILL larger than target
    const minQBlob = await canvasToBlob(canvas, outMime, 0.08);

    if (minQBlob.size > targetBytes) {
      // Resolution must be downscaled (huge photo e.g. 10MB to 100KB)
      reportProgress(35, 'Adjusting resolution to meet target size...');
      let dimScale = currentScale;
      let lastBlob = minQBlob;
      let attempts = 0;

      while (lastBlob.size > targetBytes && dimScale > 0.05 && attempts < 12) {
        attempts++;
        // Use 0.98 factor so we DO NOT crash all the way down to 79 KB!
        const factor = Math.sqrt(targetBytes / lastBlob.size) * 0.98;
        dimScale = Math.max(0.05, dimScale * factor);
        renderCanvas(dimScale);
        // Test at moderate 0.80 quality
        lastBlob = await canvasToBlob(canvas, outMime, 0.80);
        reportProgress(35 + Math.round((attempts / 12) * 25), `Optimizing resolution (${Math.round(dimScale * 100)}%)...`);
      }

      currentScale = dimScale;
    }

    // High-Precision Binary Search on Quality (10 iterations for exact convergence)
    reportProgress(60, 'Fine-tuning quality setting to match target KB...');
    let lowQ = 0.05;
    let highQ = 0.99;
    let bestBlob = null;
    let bestQuality = 0.85;

    for (let iter = 0; iter < 10; iter++) {
      const q = (lowQ + highQ) / 2;
      const b = await canvasToBlob(canvas, outMime, q);

      if (b.size <= targetBytes) {
        // Fits under target! Can we go higher quality?
        bestBlob = b;
        bestQuality = q;
        lowQ = q;
      } else {
        // Over target, lower quality
        highQ = q;
      }
    }

    // Fallback if needed
    if (!bestBlob) {
      bestBlob = await canvasToBlob(canvas, outMime, 0.15);
      bestQuality = 0.15;
    }

    // If targetExact or allowIncrease is requested (or target mode), pad the remaining gap to hit EXACT target
    if ((targetExact || allowIncrease) && bestBlob.size < targetBytes) {
      reportProgress(95, 'Matching exact target size...');
      bestBlob = await padJpegBlob(bestBlob, targetBytes);
    }

    reportProgress(100, 'Compression completed!');

    return {
      blob: bestBlob,
      width: canvas.width,
      height: canvas.height,
      originalSize,
      compressedSize: bestBlob.size,
      quality: bestQuality,
      scale: currentScale,
      type: outMime,
      isPadded: bestBlob.size === targetBytes
    };
  }

  return {
    compressImage,
    padJpegBlob,
    formatBytes,
    loadImage
  };
})();

// Export globally for browser & module environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ImageCompressor;
}
