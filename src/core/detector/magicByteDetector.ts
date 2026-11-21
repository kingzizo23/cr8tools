import pako from 'pako';
import * as fflate from 'fflate';
import { MovieEntityType } from '../types/svga.proto';
import { MotionFormat } from '../types/motion';

export interface DetectionResult {
  format: MotionFormat;
  formatVersion?: string;
  hasAlpha?: boolean;
  hasAudio?: boolean;
  subType?: string;
  meta?: any;
}

/**
 * Searches for a byte sequence within a Uint8Array
 */
function findSubarray(haystack: Uint8Array, needle: Uint8Array | number[]): number {
  const needleArr = Array.isArray(needle) ? needle : Array.from(needle);
  const nLen = needleArr.length;
  const hLen = haystack.length;
  if (nLen > hLen) return -1;

  for (let i = 0; i <= hLen - nLen; i++) {
    let match = true;
    for (let j = 0; j < nLen; j++) {
      if (haystack[i + j] !== needleArr[j]) {
        match = false;
        break;
      }
    }
    if (match) return i;
  }
  return -1;
}

/**
 * Helper to check ASCII string at offset
 */
function checkAscii(buffer: Uint8Array, offset: number, str: string): boolean {
  if (offset + str.length > buffer.length) return false;
  for (let i = 0; i < str.length; i++) {
    if (buffer[offset + i] !== str.charCodeAt(i)) return false;
  }
  return true;
}

/**
 * Deep magic byte inspection of buffer
 */
export function detectFormat(buffer: ArrayBuffer, fileName: string = ''): DetectionResult {
  const bytes = new Uint8Array(buffer);
  const sample = bytes.subarray(0, Math.min(bytes.length, 65536));

  // 1. Check PNG / APNG (89 50 4E 47 0D 0A 1A 0A)
  if (
    sample.length >= 8 &&
    sample[0] === 0x89 &&
    sample[1] === 0x50 &&
    sample[2] === 0x4e &&
    sample[3] === 0x47 &&
    sample[4] === 0x0d &&
    sample[5] === 0x0a &&
    sample[6] === 0x1a &&
    sample[7] === 0x0a
  ) {
    // Check for 'acTL' chunk (0x61, 0x63, 0x54, 0x4C)
    const acTL = [0x61, 0x63, 0x54, 0x4c];
    const isApng = findSubarray(sample, acTL) !== -1;
    return {
      format: isApng ? 'apng' : 'unknown',
      subType: isApng ? 'Animated PNG (APNG)' : 'Static PNG (Not supported as standalone image)',
      hasAlpha: true,
    };
  }

  // 2. Check WebP (RIFF....WEBP)
  if (checkAscii(sample, 0, 'RIFF') && checkAscii(sample, 8, 'WEBP')) {
    // Search for 'ANIM' chunk in sample
    const anim = [0x41, 0x4e, 0x49, 0x4d];
    const isAnimatedWebp = findSubarray(sample, anim) !== -1;
    return {
      format: isAnimatedWebp ? 'webp' : 'webp',
      formatVersion: isAnimatedWebp ? 'Animated WebP' : 'WebP',
      hasAlpha: true,
    };
  }

  // 3. Check GIF ('GIF87a' or 'GIF89a')
  if (checkAscii(sample, 0, 'GIF87a') || checkAscii(sample, 0, 'GIF89a')) {
    const version = String.fromCharCode(...sample.subarray(0, 6));
    return {
      format: 'gif',
      formatVersion: version,
      hasAlpha: true,
    };
  }

  // 4. Check PAG ('PAG' = 0x50, 0x41, 0x47)
  if (sample.length >= 3 && sample[0] === 0x50 && sample[1] === 0x41 && sample[2] === 0x47) {
    return {
      format: 'pag',
      formatVersion: 'PAG Binary',
      hasAlpha: true,
    };
  }

  // 5. Check SVGA 2.0 (zlib header 78 9C, 78 DA, or 78 01)
  if (
    sample.length >= 2 &&
    sample[0] === 0x78 &&
    (sample[1] === 0x9c || sample[1] === 0xda || sample[1] === 0x01 || sample[1] === 0x5e)
  ) {
    try {
      const decompressed = pako.inflate(bytes);
      const decoded: any = MovieEntityType.decode(decompressed);
      if (decoded && decoded.params) {
        return {
          format: 'svga',
          formatVersion: decoded.version || '2.0',
          hasAlpha: true,
          hasAudio: Array.isArray(decoded.audios) && decoded.audios.length > 0,
          meta: decoded,
        };
      }
    } catch {
      // Not a valid SVGA
    }
  }

  // 6. Check ZIP / DotLottie / PNG Sequence ('PK\x03\x04' = 0x50, 0x4B, 0x03, 0x04)
  if (sample.length >= 4 && sample[0] === 0x50 && sample[1] === 0x4b && sample[2] === 0x03 && sample[3] === 0x04) {
    try {
      // Peek files in zip
      const unzipped = fflate.unzipSync(bytes, { filter: (file) => file.name.endsWith('.json') || file.name.endsWith('.png') });
      const filenames = Object.keys(unzipped);

      if (filenames.some((name) => name.toLowerCase().includes('manifest.json') || name.toLowerCase().endsWith('.lottie'))) {
        return {
          format: 'dotlottie',
          formatVersion: 'DotLottie Archive',
          hasAlpha: true,
        };
      }

      const pngFiles = filenames.filter((name) => name.toLowerCase().endsWith('.png'));
      if (pngFiles.length > 0) {
        return {
          format: 'png-sequence',
          formatVersion: `PNG Sequence (${pngFiles.length} frames)`,
          hasAlpha: true,
        };
      }
    } catch {
      // Fallback
    }
  }

  // 7. Check WebM ('\x1A\x45\xDF\xA3')
  if (sample.length >= 4 && sample[0] === 0x1a && sample[1] === 0x45 && sample[2] === 0xdf && sample[3] === 0xa3) {
    return {
      format: 'webm',
      formatVersion: 'WebM Video',
      hasAlpha: true,
    };
  }

  // 8. Check MP4 / MOV (ftyp box at byte 4)
  if (sample.length >= 8 && checkAscii(sample, 4, 'ftyp')) {
    // Sub-inspect for 'vapc' (VAP) or 'yyeva' (YYEVA)
    const vapcTag = [0x76, 0x61, 0x70, 0x63]; // 'vapc'
    const yyevaTag = [0x79, 0x79, 0x65, 0x76, 0x61]; // 'yyeva'

    if (findSubarray(sample, vapcTag) !== -1) {
      return {
        format: 'vap',
        formatVersion: 'VAP Video (Tencent)',
        hasAlpha: true,
      };
    }

    if (findSubarray(sample, yyevaTag) !== -1) {
      return {
        format: 'yyeva',
        formatVersion: 'YYEVA Video (YY)',
        hasAlpha: true,
      };
    }

    // Standard MP4 or Dual-Channel
    const lowerName = fileName.toLowerCase();
    if (lowerName.includes('alpha') || lowerName.includes('dual') || lowerName.includes('vap') || lowerName.includes('yyeva')) {
      return {
        format: 'dual-channel',
        formatVersion: 'Dual-Channel MP4',
        hasAlpha: true,
      };
    }

    return {
      format: 'mp4',
      formatVersion: 'MPEG-4 Video',
      hasAlpha: false,
    };
  }

  // 9. Check Lottie JSON (JSON text with mandatory keys: v, fr, ip, op, w, h, layers)
  try {
    const textSample = new TextDecoder('utf-8', { fatal: false }).decode(bytes.subarray(0, Math.min(bytes.length, 10000)));
    const trimmed = textSample.trim();
    if (trimmed.startsWith('{') && (trimmed.includes('"layers"') || trimmed.includes('"fr"') || trimmed.includes('"op"'))) {
      const fullText = new TextDecoder('utf-8').decode(bytes);
      const json = JSON.parse(fullText);
      if (json && (json.layers || json.shapes || (json.v && json.fr))) {
        return {
          format: 'lottie',
          formatVersion: `Lottie JSON (v${json.v || 'unknown'})`,
          hasAlpha: true,
          meta: json,
        };
      }
    }
  } catch {
    // Not valid JSON
  }

  // Fallback by extension if magic bytes were ambiguous
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'svga':
      return { format: 'svga', formatVersion: '2.0', hasAlpha: true };
    case 'json':
      return { format: 'lottie', hasAlpha: true };
    case 'lottie':
      return { format: 'dotlottie', hasAlpha: true };
    case 'pag':
      return { format: 'pag', hasAlpha: true };
    case 'mp4':
      return { format: 'mp4', hasAlpha: false };
    case 'webm':
      return { format: 'webm', hasAlpha: true };
    case 'mov':
      return { format: 'mov', hasAlpha: true };
    case 'webp':
      return { format: 'webp', hasAlpha: true };
    case 'apng':
      return { format: 'apng', hasAlpha: true };
    case 'gif':
      return { format: 'gif', hasAlpha: true };
    case 'zip':
      return { format: 'png-sequence', hasAlpha: true };
    default:
      return { format: 'unknown' };
  }
}
