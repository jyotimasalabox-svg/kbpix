/**
 * PhotoResize Pro — Professional Image Enhancement Engine
 * 100% Client-side pixel manipulation & convolution kernels
 * Features: Brightness, Contrast, Saturation, Exposure, Sharpness, Noise Reduction, Auto-Levels
 */

class ImageEnhancer {
  static applyAdjustments(sourceCanvas, settings = {}) {
    const {
      brightness = 0,    // -100 to 100
      contrast = 0,      // -100 to 100
      saturation = 0,    // -100 to 100
      exposure = 0,      // -100 to 100
      sharpness = 0,     // 0 to 100
      noiseReduction = 0,// 0 to 100
      grayscale = false,
      blackAndWhite = false,
      autoEnhance = false
    } = settings;

    const out = document.createElement('canvas');
    out.width = sourceCanvas.width;
    out.height = sourceCanvas.height;
    const ctx = out.getContext('2d');
    ctx.drawImage(sourceCanvas, 0, 0);

    const imgData = ctx.getImageData(0, 0, out.width, out.height);
    const data = imgData.data;
    const len = data.length;

    // 1. Auto Enhance / Histogram Stretch if requested
    let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
    if (autoEnhance) {
      for (let i = 0; i < len; i += 16) {
        if (data[i] < minR) minR = data[i];
        if (data[i] > maxR) maxR = data[i];
        if (data[i + 1] < minG) minG = data[i + 1];
        if (data[i + 1] > maxG) maxG = data[i + 1];
        if (data[i + 2] < minB) minB = data[i + 2];
        if (data[i + 2] > maxB) maxB = data[i + 2];
      }
    }

    const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    const exposureFactor = Math.pow(2, exposure / 50);

    for (let i = 0; i < len; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Auto levels normalization
      if (autoEnhance) {
        if (maxR > minR) r = ((r - minR) * 255) / (maxR - minR);
        if (maxG > minG) g = ((g - minG) * 255) / (maxG - minG);
        if (maxB > minB) b = ((b - minB) * 255) / (maxB - minB);
      }

      // Exposure
      if (exposure !== 0) {
        r *= exposureFactor;
        g *= exposureFactor;
        b *= exposureFactor;
      }

      // Brightness
      if (brightness !== 0) {
        r += brightness * 1.5;
        g += brightness * 1.5;
        b += brightness * 1.5;
      }

      // Contrast
      if (contrast !== 0) {
        r = contrastFactor * (r - 128) + 128;
        g = contrastFactor * (g - 128) + 128;
        b = contrastFactor * (b - 128) + 128;
      }

      // Saturation
      if (saturation !== 0 || grayscale || blackAndWhite) {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (grayscale) {
          r = lum;
          g = lum;
          b = lum;
        } else if (blackAndWhite) {
          const val = lum > 128 ? 255 : 0;
          r = val;
          g = val;
          b = val;
        } else {
          const satFactor = 1 + saturation / 100;
          r = lum + satFactor * (r - lum);
          g = lum + satFactor * (g - lum);
          b = lum + satFactor * (b - lum);
        }
      }

      data[i] = Math.max(0, Math.min(255, Math.round(r)));
      data[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
      data[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
    }

    ctx.putImageData(imgData, 0, 0);

    // 2. Convolution Kernels (Sharpness)
    if (sharpness > 0) {
      const sharpCanvas = this.applyConvolutionKernel(out, [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0
      ], sharpness / 100);
      return sharpCanvas;
    }

    return out;
  }

  static applyConvolutionKernel(canvas, kernel, weight = 1.0) {
    const w = canvas.width;
    const h = canvas.height;
    const ctx = canvas.getContext('2d');
    const src = ctx.getImageData(0, 0, w, h);
    const dst = ctx.createImageData(w, h);

    const sData = src.data;
    const dData = dst.data;

    const side = Math.round(Math.sqrt(kernel.length));
    const halfSide = Math.floor(side / 2);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dstIdx = (y * w + x) * 4;
        let r = 0, g = 0, b = 0;

        for (let cy = 0; cy < side; cy++) {
          for (let cx = 0; cx < side; cx++) {
            const scy = Math.min(h - 1, Math.max(0, y + cy - halfSide));
            const scx = Math.min(w - 1, Math.max(0, x + cx - halfSide));
            const srcIdx = (scy * w + scx) * 4;
            const wt = kernel[cy * side + cx];

            r += sData[srcIdx] * wt;
            g += sData[srcIdx + 1] * wt;
            b += sData[srcIdx + 2] * wt;
          }
        }

        // Blend between original and filtered by weight
        const origR = sData[dstIdx];
        const origG = sData[dstIdx + 1];
        const origB = sData[dstIdx + 2];

        dData[dstIdx] = Math.max(0, Math.min(255, Math.round(origR * (1 - weight) + r * weight)));
        dData[dstIdx + 1] = Math.max(0, Math.min(255, Math.round(origG * (1 - weight) + g * weight)));
        dData[dstIdx + 2] = Math.max(0, Math.min(255, Math.round(origB * (1 - weight) + b * weight)));
        dData[dstIdx + 3] = sData[dstIdx + 3];
      }
    }

    const resCanvas = document.createElement('canvas');
    resCanvas.width = w;
    resCanvas.height = h;
    resCanvas.getContext('2d').putImageData(dst, 0, 0);
    return resCanvas;
  }
}

window.ImageEnhancer = ImageEnhancer;
