import { SvgaMovieEntity, SvgaSpriteEntity, SvgaFrameEntity } from '../types/svga.proto';
import { dataUrlToUint8Array } from '../parsers/svgaParser';
import { createBlob } from '../utils/blob';

export interface TextImageOptions {
  text: string;
  fontFamily: string;
  fontSize: number;
  textColor: string;
  backgroundColor?: string;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
  padding?: number;
  width?: number;
  height?: number;
}

/**
 * Generates a PNG byte buffer from custom text on an offscreen canvas
 */
export function generateTextImage(options: TextImageOptions): Promise<Uint8Array> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    const padding = options.padding ?? 16;
    const font = `${options.fontWeight || 'bold'} ${options.fontSize}px "${options.fontFamily || 'sans-serif'}"`;
    ctx.font = font;

    const metrics = ctx.measureText(options.text);
    const textWidth = Math.ceil(metrics.width);
    const textHeight = Math.ceil(options.fontSize * 1.3);

    const w = options.width ?? Math.max(100, textWidth + padding * 2);
    const h = options.height ?? Math.max(60, textHeight + padding * 2);

    canvas.width = w;
    canvas.height = h;

    // Reset font after resizing canvas
    ctx.font = font;
    ctx.textBaseline = 'middle';

    if (options.backgroundColor) {
      ctx.fillStyle = options.backgroundColor;
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.clearRect(0, 0, w, h);
    }

    ctx.fillStyle = options.textColor;
    let drawX = padding;
    if (options.textAlign === 'center') {
      ctx.textAlign = 'center';
      drawX = w / 2;
    } else if (options.textAlign === 'right') {
      ctx.textAlign = 'right';
      drawX = w - padding;
    } else {
      ctx.textAlign = 'left';
    }

    ctx.fillText(options.text, drawX, h / 2);

    canvas.toBlob((blob) => {
      if (!blob) return resolve(new Uint8Array(0));
      const reader = new FileReader();
      reader.onload = () => {
        const buf = reader.result as ArrayBuffer;
        resolve(new Uint8Array(buf));
      };
      reader.readAsArrayBuffer(blob);
    }, 'image/png');
  });
}

/**
 * Replaces an image asset in the MovieEntity
 */
export function replaceSvgaImage(
  entity: SvgaMovieEntity,
  key: string,
  imageBytes: Uint8Array
): SvgaMovieEntity {
  const newImages = { ...entity.images, [key]: imageBytes };
  return {
    ...entity,
    images: newImages,
  };
}

/**
 * Renames an image key across entity.images and all sprite references
 */
export function renameSvgaImageKey(
  entity: SvgaMovieEntity,
  oldKey: string,
  newKey: string
): SvgaMovieEntity {
  if (oldKey === newKey || !entity.images[oldKey]) return entity;

  const newImages = { ...entity.images };
  newImages[newKey] = newImages[oldKey];
  delete newImages[oldKey];

  const newSprites = entity.sprites.map((s) => {
    if (s.imageKey === oldKey) {
      return { ...s, imageKey: newKey };
    }
    return s;
  });

  return {
    ...entity,
    images: newImages,
    sprites: newSprites,
  };
}

/**
 * Deletes an image asset and its associated sprites
 */
export function deleteSvgaImageKey(
  entity: SvgaMovieEntity,
  key: string
): SvgaMovieEntity {
  const newImages = { ...entity.images };
  delete newImages[key];

  const newSprites = entity.sprites.filter((s) => s.imageKey !== key);

  return {
    ...entity,
    images: newImages,
    sprites: newSprites,
  };
}

/**
 * Applies feathering / soft alpha gradient to an individual image asset
 */
export async function featherImageAsset(
  imageBytes: Uint8Array,
  featherRadius: number
): Promise<Uint8Array> {
  const blob = createBlob([imageBytes], { type: 'image/png' });
  const url = URL.createObjectURL(blob);

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });

  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;

  ctx.drawImage(img, 0, 0);

  // Apply feather mask
  ctx.globalCompositeOperation = 'destination-in';
  const gradW = ctx.createLinearGradient(0, 0, featherRadius, 0);
  gradW.addColorStop(0, 'rgba(0,0,0,0)');
  gradW.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = gradW;
  ctx.fillRect(0, 0, featherRadius, canvas.height);

  const gradE = ctx.createLinearGradient(canvas.width - featherRadius, 0, canvas.width, 0);
  gradE.addColorStop(0, 'rgba(0,0,0,1)');
  gradE.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradE;
  ctx.fillRect(canvas.width - featherRadius, 0, featherRadius, canvas.height);

  ctx.globalCompositeOperation = 'source-over';
  URL.revokeObjectURL(url);

  return new Promise((resolve) => {
    canvas.toBlob((b) => {
      if (!b) return resolve(imageBytes);
      const reader = new FileReader();
      reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
      reader.readAsArrayBuffer(b);
    }, 'image/png');
  });
}

/**
 * Bakes a watermark as a top sprite into an SVGA entity
 */
export async function addWatermarkToSvga(
  entity: SvgaMovieEntity,
  watermarkDataUrl: string,
  xPercent: number,
  yPercent: number,
  scalePercent: number,
  opacity: number,
  rotationDeg: number
): Promise<SvgaMovieEntity> {
  const watermarkKey = `_watermark_${Date.now()}`;
  const watermarkBytes = dataUrlToUint8Array(watermarkDataUrl);

  const img = new Image();
  await new Promise<void>((resolve) => {
    img.onload = () => resolve();
    img.src = watermarkDataUrl;
  });

  const totalFrames = entity.params?.frames || 60;
  const width = entity.params?.viewBoxWidth || 500;
  const height = entity.params?.viewBoxHeight || 500;

  const scale = (scalePercent / 100);
  const targetW = img.width * scale;
  const targetH = img.height * scale;

  const posX = (xPercent / 100) * width;
  const posY = (yPercent / 100) * height;

  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Create frame entity for all frames
  const frames: SvgaFrameEntity[] = [];
  for (let i = 0; i < totalFrames; i++) {
    frames.push({
      alpha: opacity,
      layout: {
        x: posX,
        y: posY,
        width: targetW,
        height: targetH,
      },
      transform: {
        a: cos,
        b: sin,
        c: -sin,
        d: cos,
        tx: posX,
        ty: posY,
      },
    });
  }

  const watermarkSprite: SvgaSpriteEntity = {
    imageKey: watermarkKey,
    frames,
  };

  return {
    ...entity,
    images: {
      ...entity.images,
      [watermarkKey]: watermarkBytes,
    },
    sprites: [...entity.sprites, watermarkSprite],
  };
}

/**
 * Resizes SVGA dimensions and scales transforms
 */
export function resizeSvga(
  entity: SvgaMovieEntity,
  targetWidth: number,
  targetHeight: number
): SvgaMovieEntity {
  const origW = entity.params?.viewBoxWidth || 500;
  const origH = entity.params?.viewBoxHeight || 500;
  if (origW === targetWidth && origH === targetHeight) return entity;

  const scaleX = targetWidth / origW;
  const scaleY = targetHeight / origH;

  const newParams = {
    ...entity.params,
    viewBoxWidth: targetWidth,
    viewBoxHeight: targetHeight,
  };

  const newSprites = entity.sprites.map((s) => {
    const newFrames = (s.frames || []).map((f) => {
      const layout = f.layout ? {
        x: (f.layout.x ?? 0) * scaleX,
        y: (f.layout.y ?? 0) * scaleY,
        width: (f.layout.width ?? 0) * scaleX,
        height: (f.layout.height ?? 0) * scaleY,
      } : undefined;

      const transform = f.transform ? {
        a: (f.transform.a ?? 1) * scaleX,
        b: (f.transform.b ?? 0) * scaleX,
        c: (f.transform.c ?? 0) * scaleY,
        d: (f.transform.d ?? 1) * scaleY,
        tx: (f.transform.tx ?? 0) * scaleX,
        ty: (f.transform.ty ?? 0) * scaleY,
      } : undefined;

      return {
        ...f,
        layout,
        transform,
      };
    });

    return { ...s, frames: newFrames };
  });

  return {
    ...entity,
    params: newParams,
    sprites: newSprites,
  };
}

/**
 * Mirrors SVGA horizontally, vertically, or both
 */
export function mirrorSvga(
  entity: SvgaMovieEntity,
  mirrorX: boolean,
  mirrorY: boolean
): SvgaMovieEntity {
  if (!mirrorX && !mirrorY) return entity;
  const w = entity.params?.viewBoxWidth || 500;
  const h = entity.params?.viewBoxHeight || 500;

  const newSprites = entity.sprites.map((s) => {
    const newFrames = (s.frames || []).map((f) => {
      const transform = f.transform || { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
      const a = (transform.a ?? 1) * (mirrorX ? -1 : 1);
      const d = (transform.d ?? 1) * (mirrorY ? -1 : 1);
      const tx = mirrorX ? w - (transform.tx ?? 0) : (transform.tx ?? 0);
      const ty = mirrorY ? h - (transform.ty ?? 0) : (transform.ty ?? 0);

      return {
        ...f,
        transform: {
          ...transform,
          a,
          d,
          tx,
          ty,
        },
      };
    });
    return { ...s, frames: newFrames };
  });

  return {
    ...entity,
    sprites: newSprites,
  };
}
