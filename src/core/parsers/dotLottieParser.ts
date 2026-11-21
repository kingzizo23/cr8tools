import * as fflate from 'fflate';
import { parseLottie, ParsedLottieData } from './lottieParser';

export interface ParsedDotLottieData extends ParsedLottieData {
  manifest: any;
  animationId: string;
  files: { [filename: string]: Uint8Array };
}

/**
 * Extracts and parses a .lottie archive
 */
export function parseDotLottie(buffer: ArrayBuffer): ParsedDotLottieData {
  const bytes = new Uint8Array(buffer);
  const unzipped = fflate.unzipSync(bytes);

  // Read manifest
  let manifest: any = { version: 1, animations: [] };
  const manifestFile = Object.keys(unzipped).find((k) => k.toLowerCase() === 'manifest.json');
  if (manifestFile) {
    try {
      manifest = JSON.parse(fflate.strFromU8(unzipped[manifestFile]));
    } catch {
      // Ignored
    }
  }

  // Find primary animation JSON
  let animJson: any = null;
  let primaryId = 'animation';

  if (manifest.animations && manifest.animations.length > 0) {
    primaryId = manifest.animations[0].id;
    const targetFile = Object.keys(unzipped).find(
      (k) => k.includes(primaryId) && k.endsWith('.json')
    );
    if (targetFile) {
      animJson = JSON.parse(fflate.strFromU8(unzipped[targetFile]));
    }
  }

  if (!animJson) {
    // Find any JSON in animations/ or root
    const jsonKey = Object.keys(unzipped).find(
      (k) => k.endsWith('.json') && !k.toLowerCase().includes('manifest')
    );
    if (jsonKey) {
      animJson = JSON.parse(fflate.strFromU8(unzipped[jsonKey]));
      primaryId = jsonKey.replace(/^animations\//, '').replace(/\.json$/, '');
    }
  }

  if (!animJson) {
    throw new Error('No valid Lottie animation JSON found inside .lottie archive');
  }

  const parsed = parseLottie(animJson);

  return {
    ...parsed,
    manifest,
    animationId: primaryId,
    files: unzipped,
  };
}

/**
 * Packs a Lottie JSON into a valid .lottie archive
 */
export function packDotLottie(json: any, animationId: string = 'motion'): Uint8Array {
  const manifest = {
    version: 1,
    author: 'MotionForge',
    generator: 'MotionForge Client-Side Studio',
    animations: [
      {
        id: animationId,
        speed: 1,
        loop: true,
      },
    ],
  };

  const files: { [key: string]: Uint8Array } = {
    'manifest.json': fflate.strToU8(JSON.stringify(manifest, null, 2)),
    [`animations/${animationId}.json`]: fflate.strToU8(JSON.stringify(json)),
  };

  return fflate.zipSync(files, { level: 9 });
}
