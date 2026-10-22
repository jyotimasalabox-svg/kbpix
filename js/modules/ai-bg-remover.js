/**
 * PhotoResize Pro — Client-Side AI Background Remover & Replacer
 * 100% In-Browser processing via WebAssembly / Transformers / Canvas Alpha Engine
 * Features: Transparent PNG, Custom Solid Colors (White, Light Blue, Red, Gray), Custom Image Backgrounds, Edge Refine
 */

class AIBackgroundRemover {
  constructor() {
    this.isModelLoaded = false;
    this.isLoading = false;
    this.imglyRemoveBackground = null;
  }

  async loadModel(onProgress) {
    if (this.isModelLoaded && this.imglyRemoveBackground) return;
    this.isLoading = true;

    try {
      if (onProgress) onProgress(15, 'Loading AI Neural Segmentation Model...');
      
      // Dynamic import of @imgly/background-removal browser bundle
      if (!window.imglyRemoveBackground) {
        const module = await import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.7/+esm');
        this.imglyRemoveBackground = module.removeBackground || module.default;
      } else {
        this.imglyRemoveBackground = window.imglyRemoveBackground;
      }

      this.isModelLoaded = true;
      this.isLoading = false;
      if (onProgress) onProgress(100, 'AI Model Ready!');
    } catch (err) {
      console.warn('AI WebAssembly model fallback:', err);
      this.isLoading = false;
      // We will provide a smart browser threshold/chroma-key fallback
    }
  }

  async removeBackground(imageSource, options = {}) {
    const {
      onProgress = null,
      edgeFeather = 0, // 0 to 10
      bgColor = 'transparent', // 'transparent', '#ffffff', '#e0f2fe', '#ef4444', '#64748b', custom
      bgImage = null
    } = options;

    if (!this.isModelLoaded && !this.imglyRemoveBackground) {
      await this.loadModel(onProgress);
    }

    let alphaCanvas = null;

    if (this.imglyRemoveBackground) {
      if (onProgress) onProgress(40, 'Segmenting foreground subject...');
      const blob = await this.imglyRemoveBackground(imageSource, {
        progress: (key, current, total) => {
          if (total > 0 && onProgress) {
            const pct = Math.round(40 + (current / total) * 50);
            onProgress(pct, `Processing AI layers (${Math.round((current / total) * 100)}%)...`);
          }
        }
      });

      alphaCanvas = await this.blobToCanvas(blob);
    } else {
      // Fallback: Client-Side Edge & Color Silhouette Extraction
      alphaCanvas = await this.fallbackColorSegmentation(imageSource);
    }

    if (onProgress) onProgress(92, 'Compositing background & refining edges...');

    // Composite with background (transparent, color, or image)
    const compositeCanvas = this.compositeBackground(alphaCanvas, bgColor, bgImage, edgeFeather);
    if (onProgress) onProgress(100, 'Complete!');
    return compositeCanvas;
  }

  compositeBackground(foregroundCanvas, bgColor, bgImage = null, feather = 0) {
    const out = document.createElement('canvas');
    out.width = foregroundCanvas.width;
    out.height = foregroundCanvas.height;
    const ctx = out.getContext('2d');

    // 1. Draw Background
    if (bgImage) {
      ctx.drawImage(bgImage, 0, 0, out.width, out.height);
    } else if (bgColor && bgColor !== 'transparent') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, out.width, out.height);
    }

    // 2. Draw Foreground
    if (feather > 0) {
      ctx.filter = `blur(${feather * 0.4}px)`;
    }
    ctx.drawImage(foregroundCanvas, 0, 0);
    ctx.filter = 'none';

    return out;
  }

  blobToCanvas(blob) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        resolve(c);
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  fallbackColorSegmentation(imageSource) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, c.width, c.height);
        const data = imgData.data;
        // Sample corner pixels as background color
        const cornerR = data[0];
        const cornerG = data[1];
        const cornerB = data[2];
        const tolerance = 35;

        for (let i = 0; i < data.length; i += 4) {
          const diff = Math.hypot(data[i] - cornerR, data[i + 1] - cornerG, data[i + 2] - cornerB);
          if (diff < tolerance) {
            data[i + 3] = 0; // Transparent
          } else if (diff < tolerance + 15) {
            data[i + 3] = Math.round(((diff - tolerance) / 15) * 255);
          }
        }
        ctx.putImageData(imgData, 0, 0);
        resolve(c);
      };
      img.src = typeof imageSource === 'string' ? imageSource : URL.createObjectURL(imageSource);
    });
  }
}

window.AIBackgroundRemover = new AIBackgroundRemover();
