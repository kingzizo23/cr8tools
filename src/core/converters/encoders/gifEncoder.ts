import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { createBlob } from '../../utils/blob';

export interface GifEncodingOptions {
  fps: number;
  quality?: number; // 1 to 100
  loop?: boolean;
}

/**
 * Encodes an array of HTMLCanvasElements or ImageData frames into an animated GIF Blob
 */
export async function encodeGif(
  canvases: HTMLCanvasElement[],
  options: GifEncodingOptions,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  const gif = GIFEncoder();
  const fps = options.fps || 30;
  const delay = Math.round(1000 / fps);
  const total = canvases.length;

  for (let i = 0; i < total; i++) {
    const canvas = canvases[i];
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { data, width, height } = imageData;

    // Quantize 256 colors palette
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);

    gif.writeFrame(index, width, height, {
      palette,
      delay,
      transparent: true,
      transparentIndex: 0,
      repeat: options.loop !== false ? 0 : -1,
    });

    if (onProgress) {
      onProgress(Math.round(((i + 1) / total) * 100));
    }
  }

  gif.finish();
  const bytes = gif.bytes();
  return createBlob([bytes], { type: 'image/gif' });
}
