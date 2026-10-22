/**
 * PhotoResize Pro — Interactive Cropper & Transform Engine
 * High-precision canvas crop, zoom, 90° flip & fine rotation (-45° to +45°)
 */

class InteractiveCropper {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.img = null;
    this.onCropChange = options.onCropChange || null;

    // Transform State
    this.zoom = 1.0;
    this.rotationDeg = 0; // -45 to 45 fine rotation + n*90
    this.flipH = false;
    this.flipV = false;

    // Aspect Ratio: null (free), 1 (1:1), 4/3, 16/9, 3.5/4.5 (passport), 'custom'
    this.aspectRatio = options.aspectRatio || null;

    // Crop box in canvas coordinate percentage [0..1]
    this.crop = { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };

    // History stack for Undo/Redo
    this.history = [];
    this.historyIndex = -1;

    // Drag interaction state
    this.isDragging = false;
    this.isResizing = false;
    this.activeHandle = null;
    this.dragStart = { x: 0, y: 0 };
    this.cropStart = { ...this.crop };

    this.bindEvents();
  }

  loadImage(imageSource) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.img = img;
        this.resetTransform(false);
        this.saveHistoryState();
        this.render();
        resolve(img);
      };
      img.onerror = reject;
      img.src = typeof imageSource === 'string' ? imageSource : URL.createObjectURL(imageSource);
    });
  }

  setAspectRatio(ratio) {
    this.aspectRatio = ratio;
    if (ratio && this.canvas.width && this.canvas.height) {
      // Re-adjust crop box to fit ratio
      const canvasAspect = this.canvas.width / this.canvas.height;
      let targetW = 0.8;
      let targetH = targetW * (canvasAspect / ratio);
      if (targetH > 0.8) {
        targetH = 0.8;
        targetW = targetH * (ratio / canvasAspect);
      }
      this.crop.width = Math.min(0.9, targetW);
      this.crop.height = Math.min(0.9, targetH);
      this.crop.x = (1 - this.crop.width) / 2;
      this.crop.y = (1 - this.crop.height) / 2;
    }
    this.render();
  }

  setZoom(val) {
    this.zoom = Math.max(0.5, Math.min(4.0, val));
    this.render();
  }

  adjustZoom(delta) {
    this.setZoom(this.zoom + delta);
  }

  rotate90(clockwise = true) {
    this.rotationDeg += clockwise ? 90 : -90;
    this.saveHistoryState();
    this.render();
  }

  setFineRotation(deg) {
    // Keep base 90 multiples and add deg (-45 to +45)
    const base90 = Math.round(this.rotationDeg / 90) * 90;
    this.rotationDeg = base90 + deg;
    this.render();
  }

  toggleFlipH() {
    this.flipH = !this.flipH;
    this.saveHistoryState();
    this.render();
  }

  toggleFlipV() {
    this.flipV = !this.flipV;
    this.saveHistoryState();
    this.render();
  }

  resetTransform(recordHistory = true) {
    this.zoom = 1.0;
    this.rotationDeg = 0;
    this.flipH = false;
    this.flipV = false;
    this.crop = { x: 0.05, y: 0.05, width: 0.9, height: 0.9 };
    if (recordHistory) this.saveHistoryState();
    this.render();
  }

  saveHistoryState() {
    // Truncate redo states
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push({
      zoom: this.zoom,
      rotationDeg: this.rotationDeg,
      flipH: this.flipH,
      flipV: this.flipV,
      crop: { ...this.crop }
    });
    this.historyIndex = this.history.length - 1;
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      const st = this.history[this.historyIndex];
      this.zoom = st.zoom;
      this.rotationDeg = st.rotationDeg;
      this.flipH = st.flipH;
      this.flipV = st.flipV;
      this.crop = { ...st.crop };
      this.render();
    }
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      const st = this.history[this.historyIndex];
      this.zoom = st.zoom;
      this.rotationDeg = st.rotationDeg;
      this.flipH = st.flipH;
      this.flipV = st.flipV;
      this.crop = { ...st.crop };
      this.render();
    }
  }

  render() {
    if (!this.img || !this.canvas) return;

    // Set canvas internal resolution to match image or reasonable working size
    const maxDim = 1200;
    let w = this.img.width;
    let h = this.img.height;
    if (w > maxDim || h > maxDim) {
      const scale = maxDim / Math.max(w, h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }
    this.canvas.width = w;
    this.canvas.height = h;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);

    // Save context for transform
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate((this.rotationDeg * Math.PI) / 180);
    ctx.scale(this.flipH ? -this.zoom : this.zoom, this.flipV ? -this.zoom : this.zoom);
    ctx.drawImage(this.img, -w / 2, -h / 2, w, h);
    ctx.restore();

    // Draw Dark Overlay outside crop area
    const cx = this.crop.x * w;
    const cy = this.crop.y * h;
    const cw = this.crop.width * w;
    const ch = this.crop.height * h;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
    // Top
    ctx.fillRect(0, 0, w, cy);
    // Bottom
    ctx.fillRect(0, cy + ch, w, h - (cy + ch));
    // Left
    ctx.fillRect(0, cy, cx, ch);
    // Right
    ctx.fillRect(cx + cw, cy, w - (cx + cw), ch);

    // Crop Border & Grid Guidelines (Rule of Thirds)
    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(cx, cy, cw, ch);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    // Third lines
    ctx.beginPath();
    ctx.moveTo(cx + cw / 3, cy);
    ctx.lineTo(cx + cw / 3, cy + ch);
    ctx.moveTo(cx + (2 * cw) / 3, cy);
    ctx.lineTo(cx + (2 * cw) / 3, cy + ch);
    ctx.moveTo(cx, cy + ch / 3);
    ctx.lineTo(cx + cw, cy + ch / 3);
    ctx.moveTo(cx, cy + (2 * ch) / 3);
    ctx.lineTo(cx + cw, cy + (2 * ch) / 3);
    ctx.stroke();

    // Draw Corner & Edge Handles
    this.drawHandle(ctx, cx, cy); // NW
    this.drawHandle(ctx, cx + cw, cy); // NE
    this.drawHandle(ctx, cx + cw, cy + ch); // SE
    this.drawHandle(ctx, cx, cy + ch); // SW
    this.drawHandle(ctx, cx + cw / 2, cy); // N
    this.drawHandle(ctx, cx + cw, cy + ch / 2); // E
    this.drawHandle(ctx, cx + cw / 2, cy + ch); // S
    this.drawHandle(ctx, cx, cy + ch / 2); // W

    ctx.restore();

    if (this.onCropChange) {
      this.onCropChange({
        crop: this.crop,
        canvasW: w,
        canvasH: h
      });
    }
  }

  drawHandle(ctx, x, y) {
    const r = 6;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  bindEvents() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: (clientX - rect.left) / rect.width,
        y: (clientY - rect.top) / rect.height
      };
    };

    const handleDown = (e) => {
      if (!this.img) return;
      const pos = getPos(e);
      this.dragStart = pos;
      this.cropStart = { ...this.crop };

      const hit = this.hitTest(pos.x, pos.y);
      if (hit) {
        this.activeHandle = hit;
        this.isResizing = hit !== 'inside';
        this.isDragging = hit === 'inside';
        e.preventDefault();
      }
    };

    const handleMove = (e) => {
      if (!this.isDragging && !this.isResizing) return;
      const pos = getPos(e);
      const dx = pos.x - this.dragStart.x;
      const dy = pos.y - this.dragStart.y;

      if (this.isDragging) {
        this.crop.x = Math.max(0, Math.min(1 - this.crop.width, this.cropStart.x + dx));
        this.crop.y = Math.max(0, Math.min(1 - this.crop.height, this.cropStart.y + dy));
      } else if (this.isResizing) {
        this.applyResize(dx, dy);
      }
      this.render();
    };

    const handleUp = () => {
      if (this.isDragging || this.isResizing) {
        this.isDragging = false;
        this.isResizing = false;
        this.activeHandle = null;
        this.saveHistoryState();
      }
    };

    this.canvas.addEventListener('mousedown', handleDown);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);

    this.canvas.addEventListener('touchstart', handleDown, { passive: false });
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);
  }

  hitTest(px, py) {
    const tol = 0.04;
    const c = this.crop;
    const nw = Math.hypot(px - c.x, py - c.y) < tol;
    if (nw) return 'nw';
    const ne = Math.hypot(px - (c.x + c.width), py - c.y) < tol;
    if (ne) return 'ne';
    const se = Math.hypot(px - (c.x + c.width), py - (c.y + c.height)) < tol;
    if (se) return 'se';
    const sw = Math.hypot(px - c.x, py - (c.y + c.height)) < tol;
    if (sw) return 'sw';

    if (px >= c.x && px <= c.x + c.width && py >= c.y && py <= c.y + c.height) {
      return 'inside';
    }
    return null;
  }

  applyResize(dx, dy) {
    const s = this.cropStart;
    const minSize = 0.08;

    if (this.activeHandle === 'se') {
      let nw = Math.max(minSize, Math.min(1 - s.x, s.width + dx));
      let nh = Math.max(minSize, Math.min(1 - s.y, s.height + dy));
      if (this.aspectRatio) nh = nw / this.aspectRatio;
      this.crop.width = nw;
      this.crop.height = Math.min(1 - this.crop.y, nh);
    } else if (this.activeHandle === 'nw') {
      let nx = Math.max(0, Math.min(s.x + s.width - minSize, s.x + dx));
      let ny = Math.max(0, Math.min(s.y + s.height - minSize, s.y + dy));
      let nw = s.width - (nx - s.x);
      let nh = s.height - (ny - s.y);
      if (this.aspectRatio) nh = nw / this.aspectRatio;
      this.crop.x = nx;
      this.crop.y = ny;
      this.crop.width = nw;
      this.crop.height = nh;
    } else if (this.activeHandle === 'ne') {
      let ny = Math.max(0, Math.min(s.y + s.height - minSize, s.y + dy));
      let nw = Math.max(minSize, Math.min(1 - s.x, s.width + dx));
      this.crop.y = ny;
      this.crop.width = nw;
      this.crop.height = s.height - (ny - s.y);
    } else if (this.activeHandle === 'sw') {
      let nx = Math.max(0, Math.min(s.x + s.width - minSize, s.x + dx));
      let nh = Math.max(minSize, Math.min(1 - s.y, s.height + dy));
      this.crop.x = nx;
      this.crop.width = s.width - (nx - s.x);
      this.crop.height = nh;
    }
  }

  getCroppedCanvas(options = {}) {
    if (!this.img) return null;

    // Render clean un-overlaid canvas
    const maxDim = options.maxWidth || 2400;
    let w = this.img.width;
    let h = this.img.height;
    if (w > maxDim || h > maxDim) {
      const scale = maxDim / Math.max(w, h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }

    const offscreen = document.createElement('canvas');
    offscreen.width = w;
    offscreen.height = h;
    const ctx = offscreen.getContext('2d');

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate((this.rotationDeg * Math.PI) / 180);
    ctx.scale(this.flipH ? -this.zoom : this.zoom, this.flipV ? -this.zoom : this.zoom);
    ctx.drawImage(this.img, -w / 2, -h / 2, w, h);
    ctx.restore();

    // Extract cropped region
    const cx = Math.round(this.crop.x * w);
    const cy = Math.round(this.crop.y * h);
    const cw = Math.round(this.crop.width * w);
    const ch = Math.round(this.crop.height * h);

    const outCanvas = document.createElement('canvas');
    outCanvas.width = cw;
    outCanvas.height = ch;
    const outCtx = outCanvas.getContext('2d');
    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = 'high';
    outCtx.drawImage(offscreen, cx, cy, cw, ch, 0, 0, cw, ch);

    return outCanvas;
  }
}

window.InteractiveCropper = InteractiveCropper;
