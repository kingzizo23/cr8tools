import { hexToRgba, rgbaToHex } from '../parsers/lottieParser';

/**
 * Updates a specific color at a given AST path
 */
export function updateLottieColor(
  lottieJson: any,
  path: (string | number)[],
  newHex: string,
  newAlpha: number = 1
): any {
  const cloned = JSON.parse(JSON.stringify(lottieJson));
  let curr = cloned;

  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (curr[key] === undefined) return cloned;
    curr = curr[key];
  }

  const finalKey = path[path.length - 1];
  const rgba = hexToRgba(newHex, newAlpha);
  curr[finalKey] = rgba;

  return cloned;
}

/**
 * Replaces all occurrences of an old hex color with a new hex color across entire Lottie JSON
 */
export function replaceLottieColorGlobal(
  lottieJson: any,
  oldHex: string,
  newHex: string
): any {
  const cloned = JSON.parse(JSON.stringify(lottieJson));
  const targetRgba = hexToRgba(newHex);

  function traverse(obj: any) {
    if (!obj || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
      obj.forEach(traverse);
      return;
    }

    // Check if fill or stroke
    if ((obj.ty === 'fl' || obj.ty === 'st') && obj.c && obj.c.k) {
      const k = obj.c.k;
      if (Array.isArray(k) && typeof k[0] === 'number') {
        const hex = rgbaToHex([k[0], k[1], k[2], k[3] ?? 1]);
        if (hex.toLowerCase() === oldHex.toLowerCase()) {
          obj.c.k = [targetRgba[0], targetRgba[1], targetRgba[2], targetRgba[3]];
        }
      }
    }

    for (const key of Object.keys(obj)) {
      traverse(obj[key]);
    }
  }

  traverse(cloned);
  return cloned;
}
