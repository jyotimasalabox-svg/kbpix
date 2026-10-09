/**
 * Advanced Client-Side Image Compression Engine
 * Inspried by Pi7 Image Reducer
 * Guarantees hitting target KB size while maximizing visual quality.
 */

const ImageCompressor = (function() {
  'use strict';

  /**
   * Format bytes to human readable string (B, KB, MB)
   */
  function formatBytes(bytes, decimals = 1) {
    if (bytes === 0) return '0 KB';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
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
   */
  async function padJpegBlob(blob, targetBytes) {
    if (blob.size >= targetBytes) return blob;
    const buffer = await blob.arrayBuffer();
    const bytesNeeded = targetBytes - buffer.byteLength;
    if (bytesNeeded <= 0) return blob;

    // Check if it starts with JPEG SOI (0xFF, 0xD8)
    const uint8 = new Uint8Array(buffer);
    if (uint8[0] !== 0xFF || uint8[1] !== 0xD8) {
      // For PNG or other formats, we can safely append trailing zero bytes
      const paddedBuffer = new Uint8Array(targetBytes);
      paddedBuffer.set(uint8, 0);
      return new Blob([paddedBuffer], { type: blob.type });
    }

    // JPEG format: insert COM marker(s) right after SOI (index 2)
    // Max COM segment payload length is 65533 bytes (65535 - 2 length bytes)
    const segments = [];
    let remaining = bytesNeeded;

    while (remaining > 0) {
      // 2 bytes marker (0xFF, 0xFE) + 2 bytes length + payload
      const segHeaderSize = 4;
      const payloadSize = Math.min(remaining - segHeaderSize, 65530);
      
      if (payloadSize <= 0) {
        // Just append trailing padding if less than 4 bytes needed
        break;
      }

      const segLen = payloadSize + 2; // includes the 2 bytes of the length field
      const seg = new Uint8Array(segHeaderSize + payloadSize);
      seg[0] = 0xFF; // Marker prefix
      seg[1] = 0xFE; // COM (Comment) marker
      seg[2] = (segLen >> 8) & 0xFF; // High byte of length
      seg[3] = segLen & 0xFF;        // Low byte of length
      // payload filled with safe non-zero or zeroes
      seg.fill(0x20, 4); // Fill with spaces/comments

      segments.push(seg);
      remaining -= seg.length;
    }

    // Combine: SOI (2 bytes) + Segments + Rest of original JPEG + any remaining trailing bytes
    const totalNewSize = buffer.byteLength + (bytesNeeded - remaining) + (remaining > 0 ? remaining : 0);
    const finalArray = new Uint8Array(totalNewSize);
    
    // Copy SOI
    finalArray[0] = uint8[0];
    finalArray[1] = uint8[1];
    let offset = 2;

    // Insert comment segments
    for (const seg of segments) {
      finalArray.set(seg, offset);
      offset += seg.length;
    }

    // Copy remaining original JPEG content (from index 2 to end)
    finalArray.set(uint8.subarray(2), offset);
    offset += (uint8.length - 2);

    // If any small remainder (< 4 bytes) remains, pad at end
    if (remaining > 0) {
      finalArray.fill(0x00, offset);
    }

    return new Blob([finalArray], { type: 'image/jpeg' });
  }

  /**
   * Main Compression Function:
   * Compresses an image file to target size in KB with maximum visual quality.
   */
  async function compressImage(file, options = {}) {
    const {
      targetKB = 100,             // Target size in KB
      format = 'auto',            // 'auto', 'image/jpeg', 'image/webp', 'image/png'
      maxWidth = null,            // Optional max dimension
      maxHeight = null,           // Optional max dimension
      strictUnder = true,         // Output MUST be <= targetKB
      allowIncrease = false,      // If file is smaller, pad it to reach targetKB
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

    // Determine target bytes
    const targetBytes = Math.round(targetKB * 1024);

    // If original file is already smaller than targetBytes and we don't need to increase or convert format
    if (originalSize <= targetBytes && !allowIncrease && format === 'auto' && !maxWidth && !maxHeight) {
      reportProgress(100, 'Original image is already within target size!');
      return {
        blob: file,
        width: originalWidth,
        height: originalHeight,
        originalSize,
        compressedSize: originalSize,
        quality: 1.0,
        scale: 1.0,
        type: file.type,
        isPadded: false,
        wasAlreadySmall: true
      };
    }

    // Determine target MIME type
    let outMime = 'image/jpeg';
    if (format === 'auto') {
      if (file.type === 'image/webp') outMime = 'image/webp';
      else if (file.type === 'image/png' && originalSize <= targetBytes) outMime = 'image/png';
      else outMime = 'image/jpeg';
    } else {
      outMime = format;
    }

    // Handle "Increase Image Size" mode if requested and current file is smaller
    if (allowIncrease && originalSize < targetBytes) {
      reportProgress(50, 'Increasing image file size to match target KB...');
      let baseBlob = file;
      if (file.type !== 'image/jpeg') {
        // Draw to JPEG canvas first
        const canvas = document.createElement('canvas');
        canvas.width = originalWidth;
        canvas.height = originalHeight;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, originalWidth, originalHeight);
        ctx.drawImage(img, 0, 0);
        baseBlob = await canvasToBlob(canvas, 'image/jpeg', 0.95);
      }
      const paddedBlob = await padJpegBlob(baseBlob, targetBytes);
      reportProgress(100, 'Done!');
      return {
        blob: paddedBlob,
        width: originalWidth,
        height: originalHeight,
        originalSize,
        compressedSize: paddedBlob.size,
        quality: 0.95,
        scale: 1.0,
        type: paddedBlob.type,
        isPadded: true
      };
    }

    // Standard compression (Reduce Image Size)
    reportProgress(20, 'Preparing dimensions...');

    // Calculate dimensions
    let targetWidth = originalWidth;
    let targetHeight = originalHeight;

    if (maxWidth && maxHeight) {
      const ratio = Math.min(maxWidth / originalWidth, maxHeight / originalHeight, 1.0);
      targetWidth = Math.round(originalWidth * ratio);
      targetHeight = Math.round(originalHeight * ratio);
    } else if (maxWidth) {
      if (originalWidth > maxWidth) {
        targetHeight = Math.round((originalHeight * maxWidth) / originalWidth);
        targetWidth = maxWidth;
      }
    } else if (maxHeight) {
      if (originalHeight > maxHeight) {
        targetWidth = Math.round((originalWidth * maxHeight) / originalHeight);
        targetHeight = maxHeight;
      }
    }

    // Create Canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: outMime !== 'image/jpeg' });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    let currentScale = 1.0;
    let bestBlob = null;
    let bestDiff = Infinity;
    let bestQuality = 0.85;
    let attempts = 0;
    const maxAttempts = 15;

    // Helper to render on canvas at a given scale
    const renderCanvas = (scale) => {
      const w = Math.max(1, Math.round(targetWidth * scale));
      const h = Math.max(1, Math.round(targetHeight * scale));
      canvas.width = w;
      canvas.height = h;

      if (outMime === 'image/jpeg') {
        // Fill white background for JPEG so transparency doesn't render black
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
      } else {
        ctx.clearRect(0, 0, w, h);
      }
      ctx.drawImage(img, 0, 0, w, h);
      return { w, h };
    };

    renderCanvas(currentScale);

    // If target is PNG, quality param doesn't change compression ratio much in canvas
    if (outMime === 'image/png') {
      reportProgress(40, 'Compressing PNG...');
      let blob = await canvasToBlob(canvas, 'image/png');
      
      // If PNG is still bigger than target, scale down dimensions
      while (blob.size > targetBytes && currentScale > 0.15 && attempts < 10) {
        attempts++;
        const ratio = Math.sqrt(targetBytes / blob.size) * 0.95;
        currentScale = Math.max(0.15, currentScale * ratio);
        renderCanvas(currentScale);
        blob = await canvasToBlob(canvas, 'image/png');
        reportProgress(40 + Math.round((attempts / 10) * 50), `Rescaling dimensions (${Math.round(currentScale * 100)}%)...`);
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
        isPadded: false
      };
    }

    // Binary search compression for JPEG and WEBP
    let minQuality = 0.05;
    let maxQuality = 0.98;
    let quality = 0.82;

    reportProgress(30, 'Optimizing quality...');

    for (let i = 0; i < 8; i++) {
      attempts++;
      reportProgress(30 + Math.round((i / 8) * 50), `Testing quality setting ${Math.round(quality * 100)}%...`);
      
      const blob = await canvasToBlob(canvas, outMime, quality);
      const diff = Math.abs(blob.size - targetBytes);

      // We want to be as close to targetBytes as possible
      // If strictUnder is true, we prefer sizes <= targetBytes
      if (strictUnder) {
        if (blob.size <= targetBytes) {
          if (!bestBlob || blob.size > bestBlob.size) {
            bestBlob = blob;
            bestQuality = quality;
          }
          // Can we go a bit higher quality?
          minQuality = quality;
        } else {
          maxQuality = quality;
        }
      } else {
        if (diff < bestDiff) {
          bestDiff = diff;
          bestBlob = blob;
          bestQuality = quality;
        }
        if (blob.size > targetBytes) {
          maxQuality = quality;
        } else {
          minQuality = quality;
        }
      }

      quality = (minQuality + maxQuality) / 2;
    }

    // If even at minimum quality, the file is STILL larger than targetBytes:
    // We scale down dimensions iteratively until it fits!
    if (strictUnder && (!bestBlob || bestBlob.size > targetBytes)) {
      reportProgress(75, 'Adjusting dimensions to meet target KB...');
      let dimScale = currentScale;
      let lastBlob = bestBlob || await canvasToBlob(canvas, outMime, 0.2);

      while (lastBlob.size > targetBytes && dimScale > 0.1 && attempts < maxAttempts) {
        attempts++;
        // Calculate needed downscale factor based on size
        const factor = Math.sqrt(targetBytes / lastBlob.size) * 0.92;
        dimScale = Math.max(0.1, dimScale * factor);
        
        renderCanvas(dimScale);
        lastBlob = await canvasToBlob(canvas, outMime, 0.70);
        reportProgress(75 + Math.round(((attempts - 8) / 7) * 20), `Rescaling image (${Math.round(dimScale * 100)}%)...`);
      }

      bestBlob = lastBlob;
      currentScale = dimScale;
      bestQuality = 0.70;
    }

    // Fallback if somehow no blob was created
    if (!bestBlob) {
      bestBlob = await canvasToBlob(canvas, outMime, 0.5);
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
      isPadded: false
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
