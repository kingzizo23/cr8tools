export interface LottieColorItem {
  id: string;
  name: string;
  hex: string;
  rgba: [number, number, number, number]; // 0-1 range
  layerName?: string;
  shapeName?: string;
  type: 'fill' | 'stroke' | 'gradient';
  path: (string | number)[]; // Path in AST to modify
}

export interface LottieAssetItem {
  id: string;
  width?: number;
  height?: number;
  dataUrl: string;
  name: string;
}

export interface ParsedLottieData {
  json: any;
  width: number;
  height: number;
  fps: number;
  totalFrames: number;
  duration: number;
  colors: LottieColorItem[];
  assets: LottieAssetItem[];
}

/**
 * Converts [r, g, b, a] (0..1) to Hex '#RRGGBB'
 */
export function rgbaToHex(rgba: [number, number, number, number]): string {
  const r = Math.round(Math.min(1, Math.max(0, rgba[0])) * 255);
  const g = Math.round(Math.min(1, Math.max(0, rgba[1])) * 255);
  const b = Math.round(Math.min(1, Math.max(0, rgba[2])) * 255);
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

/**
 * Converts Hex '#RRGGBB' to [r, g, b, a] (0..1)
 */
export function hexToRgba(hex: string, alpha: number = 1): [number, number, number, number] {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  return [r, g, b, alpha];
}

/**
 * Parses Lottie JSON structure and extracts colors & assets
 */
export function parseLottie(json: any): ParsedLottieData {
  const width = json.w || 500;
  const height = json.h || 500;
  const fps = json.fr || 30;
  const inPoint = json.ip || 0;
  const outPoint = json.op || 60;
  const totalFrames = Math.max(1, outPoint - inPoint);
  const duration = totalFrames / fps;

  const colors: LottieColorItem[] = [];
  const assets: LottieAssetItem[] = [];

  // Extract assets
  if (Array.isArray(json.assets)) {
    json.assets.forEach((asset: any) => {
      if (asset.p && typeof asset.p === 'string') {
        const dataUrl = asset.p.startsWith('data:') ? asset.p : asset.u ? `${asset.u}${asset.p}` : asset.p;
        assets.push({
          id: asset.id,
          width: asset.w,
          height: asset.h,
          dataUrl,
          name: asset.id || 'image',
        });
      }
    });
  }

  // Recursive color extractor through layers and shapes
  function traverseShapes(shapes: any[], currentPath: (string | number)[], layerName: string) {
    if (!Array.isArray(shapes)) return;

    shapes.forEach((shape, idx) => {
      const shapePath = [...currentPath, idx];
      const shapeName = shape.nm || `Shape ${idx}`;

      // Solid Fill
      if (shape.ty === 'fl' && shape.c && shape.c.k) {
        const k = shape.c.k;
        if (Array.isArray(k) && typeof k[0] === 'number') {
          const rgba: [number, number, number, number] = [k[0], k[1], k[2], k[3] ?? 1];
          colors.push({
            id: `color-${colors.length}`,
            name: `${layerName} > ${shapeName} (Fill)`,
            hex: rgbaToHex(rgba),
            rgba,
            layerName,
            shapeName,
            type: 'fill',
            path: [...shapePath, 'c', 'k'],
          });
        }
      }

      // Solid Stroke
      if (shape.ty === 'st' && shape.c && shape.c.k) {
        const k = shape.c.k;
        if (Array.isArray(k) && typeof k[0] === 'number') {
          const rgba: [number, number, number, number] = [k[0], k[1], k[2], k[3] ?? 1];
          colors.push({
            id: `color-${colors.length}`,
            name: `${layerName} > ${shapeName} (Stroke)`,
            hex: rgbaToHex(rgba),
            rgba,
            layerName,
            shapeName,
            type: 'stroke',
            path: [...shapePath, 'c', 'k'],
          });
        }
      }

      // Group
      if (shape.ty === 'gr' && Array.isArray(shape.it)) {
        traverseShapes(shape.it, [...shapePath, 'it'], layerName);
      }
    });
  }

  if (Array.isArray(json.layers)) {
    json.layers.forEach((layer: any, lIdx: number) => {
      const layerName = layer.nm || `Layer ${lIdx}`;
      if (Array.isArray(layer.shapes)) {
        traverseShapes(layer.shapes, ['layers', lIdx, 'shapes'], layerName);
      }
    });
  }

  return {
    json,
    width,
    height,
    fps,
    totalFrames,
    duration,
    colors,
    assets,
  };
}
