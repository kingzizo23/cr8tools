import * as fflate from 'fflate';

export interface ParsedSequenceData {
  frames: Array<{ name: string; blob: Blob; url: string }>;
  width: number;
  height: number;
  fps: number;
  totalFrames: number;
  duration: number;
}

/**
 * Natural sorting for file names like frame_1.png, frame_2.png, frame_10.png
 */
function naturalSort(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * Parses a ZIP file containing a sequence of PNG frames
 */
export async function parseSequenceZip(buffer: ArrayBuffer, fps: number = 30): Promise<ParsedSequenceData> {
  const bytes = new Uint8Array(buffer);
  const unzipped = fflate.unzipSync(bytes);

  const pngFiles = Object.keys(unzipped)
    .filter((name) => name.toLowerCase().endsWith('.png') && !name.startsWith('__MACOSX/'))
    .sort(naturalSort);

  if (pngFiles.length === 0) {
    throw new Error('No PNG image files found in the ZIP archive');
  }

  const frames: Array<{ name: string; blob: Blob; url: string }> = [];

  for (const filename of pngFiles) {
    const fileBytes = unzipped[filename];
    const blob = new Blob([fileBytes], { type: 'image/png' });
    const url = URL.createObjectURL(blob);
    frames.push({
      name: filename,
      blob,
      url,
    });
  }

  // Load first image to get width and height
  const firstFrame = frames[0];
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = firstFrame.url;
  });

  const width = img.naturalWidth || 500;
  const height = img.naturalHeight || 500;
  const totalFrames = frames.length;
  const duration = totalFrames / fps;

  return {
    frames,
    width,
    height,
    fps,
    totalFrames,
    duration,
  };
}
