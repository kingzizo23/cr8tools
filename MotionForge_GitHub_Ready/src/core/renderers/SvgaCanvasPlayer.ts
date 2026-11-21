import { SvgaMovieEntity, SvgaSpriteEntity, SvgaFrameEntity } from '../types/svga.proto';
import { uint8ArrayToDataUrl } from '../parsers/svgaParser';

export class SvgaCanvasPlayer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private entity: SvgaMovieEntity;
  private imageCache: Map<string, HTMLImageElement> = new Map();
  private isLoaded: boolean = false;
  private currentFrame: number = 0;
  private isPlaying: boolean = false;
  private animFrameId: number | null = null;
  private lastTimestamp: number = 0;
  private onFrameUpdate?: (frame: number) => void;

  // Audio elements
  private audioContext: AudioContext | null = null;

  constructor(canvas: HTMLCanvasElement, entity: SvgaMovieEntity) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D context');
    this.ctx = context;
    this.entity = entity;
  }

  public async preloadAssets(): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.entity.images) {
      for (const [key, rawBytes] of Object.entries(this.entity.images)) {
        if (!rawBytes || rawBytes.length === 0) continue;
        const isJpeg = rawBytes[0] === 0xff && rawBytes[1] === 0xd8;
        const mime = isJpeg ? 'image/jpeg' : 'image/png';
        const dataUrl = uint8ArrayToDataUrl(rawBytes, mime);

        const img = new Image();
        const p = new Promise<void>((resolve) => {
          img.onload = () => {
            this.imageCache.set(key, img);
            resolve();
          };
          img.onerror = () => {
            console.warn(`Failed to load SVGA image asset: ${key}`);
            resolve();
          };
          img.src = dataUrl;
        });
        promises.push(p);
      }
    }

    await Promise.all(promises);
    this.isLoaded = true;
  }

  public replaceImage(key: string, imgOrUrl: HTMLImageElement | string): Promise<void> {
    return new Promise((resolve) => {
      if (typeof imgOrUrl === 'string') {
        const img = new Image();
        img.onload = () => {
          this.imageCache.set(key, img);
          this.drawFrame(this.currentFrame);
          resolve();
        };
        img.src = imgOrUrl;
      } else {
        this.imageCache.set(key, imgOrUrl);
        this.drawFrame(this.currentFrame);
        resolve();
      }
    });
  }

  public drawFrame(frameIndex: number): void {
    const ctx = this.ctx;
    const entity = this.entity;
    const totalFrames = entity.params?.frames || 1;
    const safeFrame = Math.max(0, Math.min(frameIndex, totalFrames - 1));
    this.currentFrame = safeFrame;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (!entity.sprites) return;

    for (const sprite of entity.sprites) {
      if (!sprite.frames || !sprite.frames[safeFrame]) continue;
      const frame: SvgaFrameEntity = sprite.frames[safeFrame];

      // Alpha check
      const alpha = frame.alpha ?? 1;
      if (alpha <= 0.001) continue;

      ctx.save();
      ctx.globalAlpha = alpha;

      // Transform matrix [a, b, c, d, tx, ty]
      if (frame.transform) {
        const t = frame.transform;
        ctx.transform(
          t.a ?? 1,
          t.b ?? 0,
          t.c ?? 0,
          t.d ?? 1,
          t.tx ?? 0,
          t.ty ?? 0
        );
      }

      // Render image if sprite has imageKey
      if (sprite.imageKey) {
        const img = this.imageCache.get(sprite.imageKey);
        if (img) {
          const layout = frame.layout;
          if (layout) {
            const x = layout.x ?? 0;
            const y = layout.y ?? 0;
            const w = layout.width ?? img.width;
            const h = layout.height ?? img.height;
            ctx.drawImage(img, x, y, w, h);
          } else {
            ctx.drawImage(img, 0, 0);
          }
        }
      }

      // Render vector shapes if any
      if (Array.isArray(frame.shapes)) {
        for (const shape of frame.shapes) {
          this.renderShape(ctx, shape);
        }
      }

      ctx.restore();
    }

    if (this.onFrameUpdate) {
      this.onFrameUpdate(safeFrame);
    }
  }

  private renderShape(ctx: CanvasRenderingContext2D, shape: any): void {
    if (!shape) return;
    ctx.save();

    if (shape.transform) {
      const t = shape.transform;
      ctx.transform(t.a ?? 1, t.b ?? 0, t.c ?? 0, t.d ?? 1, t.tx ?? 0, t.ty ?? 0);
    }

    const styles = shape.styles;
    if (styles) {
      if (styles.fill) {
        const f = styles.fill;
        ctx.fillStyle = `rgba(${Math.round((f.r ?? 0) * 255)}, ${Math.round((f.g ?? 0) * 255)}, ${Math.round((f.b ?? 0) * 255)}, ${f.a ?? 1})`;
      }
      if (styles.stroke) {
        const s = styles.stroke;
        ctx.strokeStyle = `rgba(${Math.round((s.r ?? 0) * 255)}, ${Math.round((s.g ?? 0) * 255)}, ${Math.round((s.b ?? 0) * 255)}, ${s.a ?? 1})`;
        ctx.lineWidth = styles.strokeWidth ?? 1;
      }
    }

    // Path or Rect
    if (shape.rect) {
      const r = shape.rect;
      ctx.beginPath();
      ctx.rect(r.x ?? 0, r.y ?? 0, r.width ?? 100, r.height ?? 100);
      if (styles?.fill) ctx.fill();
      if (styles?.stroke) ctx.stroke();
    } else if (shape.shape && shape.shape.d) {
      try {
        const path = new Path2D(shape.shape.d);
        if (styles?.fill) ctx.fill(path);
        if (styles?.stroke) ctx.stroke(path);
      } catch {
        // SVG path parsing fallback
      }
    }

    ctx.restore();
  }

  public play(onUpdate?: (frame: number) => void): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.onFrameUpdate = onUpdate;
    this.lastTimestamp = performance.now();

    const fps = this.entity.params?.fps || 30;
    const frameInterval = 1000 / fps;
    const totalFrames = this.entity.params?.frames || 60;

    const tick = (now: number) => {
      if (!this.isPlaying) return;

      const elapsed = now - this.lastTimestamp;
      if (elapsed >= frameInterval) {
        const step = Math.floor(elapsed / frameInterval);
        this.currentFrame = (this.currentFrame + step) % totalFrames;
        this.drawFrame(this.currentFrame);
        this.lastTimestamp = now - (elapsed % frameInterval);
      }

      this.animFrameId = requestAnimationFrame(tick);
    };

    this.animFrameId = requestAnimationFrame(tick);
  }

  public pause(): void {
    this.isPlaying = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public getCurrentFrame(): number {
    return this.currentFrame;
  }

  public destroy(): void {
    this.pause();
    this.imageCache.clear();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
