export interface Mp4TransparentMeta {
  type: 'vap' | 'yyeva' | 'dual-channel' | 'standard';
  version?: number;
  width: number;
  height: number;
  fps: number;
  layout: 'alpha-left' | 'rgb-left' | 'top-bottom';
  rgbRect?: [number, number, number, number];
  alphaRect?: [number, number, number, number];
  dynamicElements?: Array<{ tag: string; type: string; [key: string]: any }>;
}

/**
 * Searches for box tag and extracts JSON payload from MP4/MOV bytes
 */
export function extractMp4Meta(buffer: ArrayBuffer): Mp4TransparentMeta {
  const bytes = new Uint8Array(buffer);
  const len = bytes.length;

  // Search for 'vapc'
  const vapcTag = [0x76, 0x61, 0x70, 0x63];
  for (let i = 0; i < len - 4; i++) {
    if (
      bytes[i] === vapcTag[0] &&
      bytes[i + 1] === vapcTag[1] &&
      bytes[i + 2] === vapcTag[2] &&
      bytes[i + 3] === vapcTag[3]
    ) {
      try {
        // Read string until closing brace
        const jsonStart = i + 4;
        let jsonEnd = jsonStart;
        let braceCount = 0;
        let started = false;

        for (let j = jsonStart; j < Math.min(len, jsonStart + 16384); j++) {
          if (bytes[j] === 0x7b) {
            // '{'
            braceCount++;
            started = true;
          } else if (bytes[j] === 0x7d) {
            // '}'
            braceCount--;
            if (started && braceCount === 0) {
              jsonEnd = j + 1;
              break;
            }
          }
        }

        if (jsonEnd > jsonStart) {
          const jsonStr = new TextDecoder('utf-8').decode(bytes.subarray(jsonStart, jsonEnd));
          const parsed = JSON.parse(jsonStr);
          const info = parsed.info || {};
          return {
            type: 'vap',
            version: info.v || 2,
            width: info.w || 750,
            height: info.h || 1334,
            fps: info.fps || 30,
            layout: 'alpha-left',
            dynamicElements: parsed.data?.src,
          };
        }
      } catch {
        // Ignore JSON error
      }
    }
  }

  // Search for 'yyeva'
  const yyevaTag = [0x79, 0x79, 0x65, 0x76, 0x61];
  for (let i = 0; i < len - 5; i++) {
    if (
      bytes[i] === yyevaTag[0] &&
      bytes[i + 1] === yyevaTag[1] &&
      bytes[i + 2] === yyevaTag[2] &&
      bytes[i + 3] === yyevaTag[3] &&
      bytes[i + 4] === yyevaTag[4]
    ) {
      try {
        const jsonStart = i + 5;
        let jsonEnd = jsonStart;
        let braceCount = 0;
        let started = false;

        for (let j = jsonStart; j < Math.min(len, jsonStart + 16384); j++) {
          if (bytes[j] === 0x7b) {
            braceCount++;
            started = true;
          } else if (bytes[j] === 0x7d) {
            braceCount--;
            if (started && braceCount === 0) {
              jsonEnd = j + 1;
              break;
            }
          }
        }

        if (jsonEnd > jsonStart) {
          const jsonStr = new TextDecoder('utf-8').decode(bytes.subarray(jsonStart, jsonEnd));
          const parsed = JSON.parse(jsonStr);
          const desc = parsed.descript || {};
          return {
            type: 'yyeva',
            width: desc.width || 1080,
            height: desc.height || 1920,
            fps: desc.fps || 30,
            layout: 'alpha-left',
            rgbRect: desc.rgbFrame,
            alphaRect: desc.alphaFrame,
            dynamicElements: parsed.dynamic,
          };
        }
      } catch {
        // Ignore
      }
    }
  }

  return {
    type: 'standard',
    width: 0,
    height: 0,
    fps: 30,
    layout: 'alpha-left',
  };
}
