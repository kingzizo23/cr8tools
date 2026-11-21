import lottie, { AnimationItem } from 'lottie-web';
import { MotionAsset } from '../types/motion';
import { SvgaCanvasPlayer } from './SvgaCanvasPlayer';
import { DualChannelGLRenderer } from './DualChannelGL';
import { parseSvga } from '../parsers/svgaParser';
import { parseSequenceZip, ParsedSequenceData } from '../parsers/sequenceZipParser';

export class UnifiedRenderer {
  private asset: MotionAsset;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;

  // Specific players
  private svgaPlayer: SvgaCanvasPlayer | null = null;
  private lottieAnim: AnimationItem | null = null;
  private lottieContainer: HTMLDivElement | null = null;
  private dualChannelGL: DualChannelGLRenderer | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private sequenceData: ParsedSequenceData | null = null;
  private sequenceImages: HTMLImageElement[] = [];

  private isReady: boolean = false;

  constructor(asset: MotionAsset, canvas: HTMLCanvasElement) {
    this.asset = asset;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  public async init(): Promise<void> {
    const { format, rawBuffer, width, height, fps, objectUrl } = this.asset;
    this.canvas.width = width;
    this.canvas.height = height;

    if (format === 'svga') {
      const parsed = this.asset.parsedEntity || parseSvga(rawBuffer);
      this.svgaPlayer = new SvgaCanvasPlayer(this.canvas, parsed.entity);
      await this.svgaPlayer.preloadAssets();
      this.svgaPlayer.drawFrame(0);
    } else if (format === 'lottie' || format === 'dotlottie') {
      let animData = this.asset.parsedEntity?.json || this.asset.parsedEntity;
      if (!animData && format === 'lottie') {
        const text = new TextDecoder('utf-8').decode(rawBuffer);
        animData = JSON.parse(text);
      }

      // Create offscreen container for lottie-web canvas renderer
      this.lottieContainer = document.createElement('div');
      this.lottieAnim = lottie.loadAnimation({
        container: this.lottieContainer,
        renderer: 'canvas',
        loop: true,
        autoplay: false,
        animationData: animData,
      });

      await new Promise<void>((resolve) => {
        if (!this.lottieAnim) return resolve();
        this.lottieAnim.addEventListener('DOMLoaded', () => resolve());
        setTimeout(resolve, 500); // safety fallback
      });

      this.renderLottieFrame(0);
    } else if (format === 'png-sequence') {
      this.sequenceData = await parseSequenceZip(rawBuffer, fps);
      // Preload image elements
      const promises = this.sequenceData.frames.map((f) => {
        return new Promise<HTMLImageElement>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.src = f.url;
        });
      });
      this.sequenceImages = await Promise.all(promises);
      this.renderSequenceFrame(0);
    } else if (
      format === 'mp4' ||
      format === 'webm' ||
      format === 'mov' ||
      format === 'vap' ||
      format === 'yyeva' ||
      format === 'dual-channel'
    ) {
      this.videoEl = document.createElement('video');
      this.videoEl.src = objectUrl;
      this.videoEl.crossOrigin = 'anonymous';
      this.videoEl.muted = true;
      this.videoEl.playsInline = true;
      this.videoEl.preload = 'auto';

      await new Promise<void>((resolve) => {
        if (!this.videoEl) return resolve();
        this.videoEl.onloadedmetadata = () => resolve();
        this.videoEl.onerror = () => resolve();
        setTimeout(resolve, 1000);
      });

      if (format === 'vap' || format === 'yyeva' || format === 'dual-channel') {
        this.dualChannelGL = new DualChannelGLRenderer(this.canvas);
      }
    }

    this.isReady = true;
  }

  public renderFrame(
    frameIndex: number,
    dualLayout: 'alpha-left' | 'rgb-left' | 'top-bottom' = 'alpha-left',
    removeBlackBg: boolean = false,
    threshold: number = 0.05,
    softness: number = 0.15
  ): Promise<void> {
    return new Promise(async (resolve) => {
      const { format, totalFrames, fps } = this.asset;
      const safeFrame = Math.max(0, Math.min(frameIndex, totalFrames - 1));

      if (format === 'svga' && this.svgaPlayer) {
        this.svgaPlayer.drawFrame(safeFrame);
        resolve();
      } else if ((format === 'lottie' || format === 'dotlottie') && this.lottieAnim) {
        this.renderLottieFrame(safeFrame);
        resolve();
      } else if (format === 'png-sequence' && this.sequenceImages.length > 0) {
        this.renderSequenceFrame(safeFrame);
        resolve();
      } else if (this.videoEl) {
        const targetTime = safeFrame / (fps || 30);
        this.videoEl.currentTime = targetTime;

        const onSeeked = () => {
          this.videoEl?.removeEventListener('seeked', onSeeked);
          if (this.dualChannelGL) {
            this.dualChannelGL.render(this.videoEl!, dualLayout, removeBlackBg, threshold, softness);
          } else if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(this.videoEl!, 0, 0, this.canvas.width, this.canvas.height);
          }
          resolve();
        };

        this.videoEl.addEventListener('seeked', onSeeked);
        setTimeout(onSeeked, 200); // timeout fallback
      } else {
        resolve();
      }
    });
  }

  private renderLottieFrame(frame: number) {
    if (!this.lottieAnim || !this.ctx || !this.lottieContainer) return;
    this.lottieAnim.goToAndStop(frame, true);

    const lottieCanvas = this.lottieContainer.querySelector('canvas');
    if (lottieCanvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(lottieCanvas, 0, 0, this.canvas.width, this.canvas.height);
    }
  }

  private renderSequenceFrame(frame: number) {
    if (!this.ctx) return;
    const img = this.sequenceImages[frame];
    if (img) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
    }
  }

  public getSvgaPlayer(): SvgaCanvasPlayer | null {
    return this.svgaPlayer;
  }

  public destroy(): void {
    if (this.svgaPlayer) {
      this.svgaPlayer.destroy();
      this.svgaPlayer = null;
    }
    if (this.lottieAnim) {
      this.lottieAnim.destroy();
      this.lottieAnim = null;
    }
    if (this.dualChannelGL) {
      this.dualChannelGL.destroy();
      this.dualChannelGL = null;
    }
    if (this.videoEl) {
      this.videoEl.pause();
      this.videoEl.src = '';
      this.videoEl.load();
      this.videoEl = null;
    }
    this.sequenceImages = [];
  }
}
