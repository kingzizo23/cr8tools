import * as fflate from 'fflate';
import { MotionAsset, ExportConfig } from '../types/motion';
import { UnifiedRenderer } from '../renderers/UnifiedRenderer';
import { packDotLottie } from '../parsers/dotLottieParser';
import { packSvga, parseSvga } from '../parsers/svgaParser';
import { resizeSvga, mirrorSvga } from '../editors/svgaAssetEditor';
import { encodeGif } from './encoders/gifEncoder';
import { encodeApng } from './encoders/apngEncoder';
import { encodeAnimatedWebp } from './encoders/webpEncoder';
import { encodeVideo } from './encoders/videoEncoder';
import { exportToAfterEffectsJsxZip } from './aeJsxExporter';
import { createBlob } from '../utils/blob';

export interface PipelineResult {
  blob: Blob;
  size: number;
  url: string;
  width: number;
  height: number;
  fps: number;
  duration: number;
}

/**
 * Executes a full conversion/export pipeline for any asset and configuration
 */
export async function runConversionPipeline(
  asset: MotionAsset,
  config: ExportConfig,
  onProgress?: (percent: number) => void
): Promise<PipelineResult> {
  const { format: inFormat, rawBuffer, width: origW, height: origH, fps: origFps, totalFrames: origTotalFrames } = asset;
  const outFormat = config.format;

  const targetW = config.width || origW;
  const targetH = config.height || origH;
  const targetFps = config.fps || origFps || 30;

  // 1. Structure-preserving: Lottie -> DotLottie
  if (inFormat === 'lottie' && outFormat === 'dotlottie') {
    onProgress?.(30);
    const json = asset.parsedEntity?.json || JSON.parse(new TextDecoder().decode(rawBuffer));
    const zipBytes = packDotLottie(json, asset.name.replace(/\.[^/.]+$/, ''));
    onProgress?.(100);
    const blob = createBlob([zipBytes], { type: 'application/x-dotlottie' });
    return {
      blob,
      size: blob.size,
      url: URL.createObjectURL(blob),
      width: targetW,
      height: targetH,
      fps: targetFps,
      duration: asset.duration,
    };
  }

  // 2. Structure-preserving: DotLottie -> Lottie JSON
  if (inFormat === 'dotlottie' && outFormat === 'lottie') {
    onProgress?.(50);
    const json = asset.parsedEntity?.json;
    const jsonStr = JSON.stringify(json, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    onProgress?.(100);
    return {
      blob,
      size: blob.size,
      url: URL.createObjectURL(blob),
      width: targetW,
      height: targetH,
      fps: targetFps,
      duration: asset.duration,
    };
  }

  // 3. Structure-preserving: SVGA -> SVGA (editing / resizing / mirroring)
  if (inFormat === 'svga' && outFormat === 'svga') {
    onProgress?.(20);
    let entity = asset.parsedEntity?.entity || parseSvga(rawBuffer).entity;
    if (targetW !== origW || targetH !== origH) {
      entity = resizeSvga(entity, targetW, targetH);
    }
    if (config.mirrorX || config.mirrorY) {
      entity = mirrorSvga(entity, config.mirrorX, config.mirrorY);
    }
    onProgress?.(60);
    const packedBytes = packSvga(entity);
    onProgress?.(100);
    const blob = createBlob([packedBytes], { type: 'application/octet-stream' });
    return {
      blob,
      size: blob.size,
      url: URL.createObjectURL(blob),
      width: targetW,
      height: targetH,
      fps: targetFps,
      duration: asset.duration,
    };
  }

  // 4. Frame-by-frame rendering pipeline
  const offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.width = targetW;
  offscreenCanvas.height = targetH;

  const renderer = new UnifiedRenderer(asset, offscreenCanvas);
  await renderer.init();

  const totalFrames = origTotalFrames || 30;
  const frameCanvases: HTMLCanvasElement[] = [];

  const startFrame = config.trimStart ? Math.floor(config.trimStart * origFps) : 0;
  const endFrame = config.trimEnd ? Math.min(totalFrames - 1, Math.floor(config.trimEnd * origFps)) : totalFrames - 1;
  const framesToRender = Math.max(1, endFrame - startFrame + 1);

  for (let i = startFrame; i <= endFrame; i++) {
    await renderer.renderFrame(
      i,
      config.dualChannelLayout || 'alpha-left',
      config.removeBlackBg || false,
      config.blackBgThreshold ?? 0.05,
      config.blackBgSoftness ?? 0.15
    );

    // Create frame copy with optional mirroring/watermark
    const frameCanvas = document.createElement('canvas');
    frameCanvas.width = targetW;
    frameCanvas.height = targetH;
    const fCtx = frameCanvas.getContext('2d')!;

    fCtx.save();
    if (config.mirrorX || config.mirrorY) {
      fCtx.translate(config.mirrorX ? targetW : 0, config.mirrorY ? targetH : 0);
      fCtx.scale(config.mirrorX ? -1 : 1, config.mirrorY ? -1 : 1);
    }
    fCtx.drawImage(offscreenCanvas, 0, 0, targetW, targetH);
    fCtx.restore();

    // Canvas feathering if enabled
    if (config.canvasFeather?.enabled) {
      const { top, bottom, left, right, softness } = config.canvasFeather;
      fCtx.save();
      fCtx.globalCompositeOperation = 'destination-out';
      fCtx.fillStyle = `rgba(0,0,0,${softness})`;
      if (top > 0) fCtx.fillRect(0, 0, targetW, top);
      if (bottom > 0) fCtx.fillRect(0, targetH - bottom, targetW, bottom);
      if (left > 0) fCtx.fillRect(0, 0, left, targetH);
      if (right > 0) fCtx.fillRect(targetW - right, 0, right, targetH);
      fCtx.restore();
    }

    frameCanvases.push(frameCanvas);

    if (onProgress) {
      onProgress(Math.round(((i - startFrame + 1) / framesToRender) * 45));
    }
  }

  renderer.destroy();

  // Progress mapper for encoder stage (45% to 100%)
  const encoderProgress = (pct: number) => {
    if (onProgress) {
      onProgress(45 + Math.round(pct * 0.55));
    }
  };

  let outputBlob: Blob;

  switch (outFormat) {
    case 'gif':
      outputBlob = await encodeGif(frameCanvases, { fps: targetFps, loop: config.loop }, encoderProgress);
      break;

    case 'apng':
      outputBlob = await encodeApng(frameCanvases, { fps: targetFps, loop: config.loop }, encoderProgress);
      break;

    case 'webp':
      outputBlob = await encodeAnimatedWebp(frameCanvases, { fps: targetFps, loop: config.loop, quality: config.quality }, encoderProgress);
      break;

    case 'mp4':
    case 'webm':
    case 'mov':
    case 'vap':
    case 'yyeva':
    case 'dual-channel':
      outputBlob = await encodeVideo(
        frameCanvases,
        {
          format: outFormat,
          fps: targetFps,
          width: targetW,
          height: targetH,
          quality: config.quality,
          dualLayout: config.dualChannelLayout,
        },
        encoderProgress
      );
      break;

    case 'ae-jsx':
      outputBlob = await exportToAfterEffectsJsxZip(
        frameCanvases,
        {
          name: asset.name,
          width: targetW,
          height: targetH,
          fps: targetFps,
          totalFrames: frameCanvases.length,
          duration: frameCanvases.length / targetFps,
        },
        encoderProgress
      );
      break;

    case 'png-sequence':
    default: {
      const files: { [key: string]: Uint8Array } = {};
      for (let i = 0; i < frameCanvases.length; i++) {
        const b: Blob = await new Promise((res) => frameCanvases[i].toBlob((blob) => res(blob || new Blob()), 'image/png'));
        const buf = await b.arrayBuffer();
        const frameIdxStr = String(i + 1).padStart(4, '0');
        files[`frame_${frameIdxStr}.png`] = new Uint8Array(buf);
      }
      const zipBytes = fflate.zipSync(files, { level: 6 });
      outputBlob = new Blob([zipBytes], { type: 'application/zip' });
      encoderProgress(100);
      break;
    }
  }

  const duration = frameCanvases.length / targetFps;

  return {
    blob: outputBlob,
    size: outputBlob.size,
    url: URL.createObjectURL(outputBlob),
    width: targetW,
    height: targetH,
    fps: targetFps,
    duration,
  };
}
