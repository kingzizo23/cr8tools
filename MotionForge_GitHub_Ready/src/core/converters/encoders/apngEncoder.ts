import pako from 'pako';
import { createBlob } from '../../utils/blob';

// CRC table for PNG chunks
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  CRC_TABLE[n] = c;
}

function crc32(buf: Uint8Array, offset: number, len: number): number {
  let c = 0xffffffff;
  for (let i = 0; i < len; i++) {
    c = CRC_TABLE[(c ^ buf[offset + i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function writeUint32(buf: Uint8Array, offset: number, val: number) {
  buf[offset] = (val >>> 24) & 0xff;
  buf[offset + 1] = (val >>> 16) & 0xff;
  buf[offset + 2] = (val >>> 8) & 0xff;
  buf[offset + 3] = val & 0xff;
}

function writeUint16(buf: Uint8Array, offset: number, val: number) {
  buf[offset] = (val >>> 8) & 0xff;
  buf[offset + 1] = val & 0xff;
}

function createChunk(type: string, data: Uint8Array): Uint8Array {
  const len = data.length;
  const chunk = new Uint8Array(4 + 4 + len + 4);
  writeUint32(chunk, 0, len);
  for (let i = 0; i < 4; i++) {
    chunk[4 + i] = type.charCodeAt(i);
  }
  chunk.set(data, 8);
  const crc = crc32(chunk, 4, 4 + len);
  writeUint32(chunk, 8 + len, crc);
  return chunk;
}

export interface ApngOptions {
  fps: number;
  loop?: boolean;
}

/**
 * Encodes an array of HTMLCanvasElement frames into an animated PNG (APNG) Blob
 */
export async function encodeApng(
  canvases: HTMLCanvasElement[],
  options: ApngOptions,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  const numFrames = canvases.length;
  const width = canvases[0].width;
  const height = canvases[0].height;
  const fps = options.fps || 30;

  const chunks: Uint8Array[] = [];

  // PNG Signature
  const signature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  chunks.push(signature);

  // IHDR chunk (13 bytes)
  const ihdrData = new Uint8Array(13);
  writeUint32(ihdrData, 0, width);
  writeUint32(ihdrData, 4, height);
  ihdrData[8] = 8; // bit depth: 8
  ihdrData[9] = 6; // color type: 6 (RGBA)
  ihdrData[10] = 0; // compression method: 0
  ihdrData[11] = 0; // filter method: 0
  ihdrData[12] = 0; // interlace method: 0
  chunks.push(createChunk('IHDR', ihdrData));

  // acTL chunk (8 bytes)
  const actlData = new Uint8Array(8);
  writeUint32(actlData, 0, numFrames);
  writeUint32(actlData, 4, options.loop !== false ? 0 : 1); // 0 = loop forever
  chunks.push(createChunk('acTL', actlData));

  let seq = 0;

  for (let i = 0; i < numFrames; i++) {
    const canvas = canvases[i];
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.getImageData(0, 0, width, height);

    // Filter type 0 (None) for each scanline: scanline length = 1 + width * 4
    const scanlineLength = 1 + width * 4;
    const rawData = new Uint8Array(height * scanlineLength);

    for (let y = 0; y < height; y++) {
      const rowOffset = y * scanlineLength;
      rawData[rowOffset] = 0; // filter: none
      const srcOffset = y * width * 4;
      rawData.set(imgData.data.subarray(srcOffset, srcOffset + width * 4), rowOffset + 1);
    }

    const compressed = pako.deflate(rawData, { level: 8 });

    // fcTL chunk (26 bytes)
    const fctlData = new Uint8Array(26);
    writeUint32(fctlData, 0, seq++);
    writeUint32(fctlData, 4, width);
    writeUint32(fctlData, 8, height);
    writeUint32(fctlData, 12, 0); // x offset
    writeUint32(fctlData, 16, 0); // y offset
    writeUint16(fctlData, 20, 1); // delay num
    writeUint16(fctlData, 22, fps); // delay den
    fctlData[24] = 0; // dispose op: 0 (APNG_DISPOSE_OP_NONE)
    fctlData[25] = 0; // blend op: 0 (APNG_BLEND_OP_SOURCE)
    chunks.push(createChunk('fcTL', fctlData));

    if (i === 0) {
      // First frame data is in IDAT
      chunks.push(createChunk('IDAT', compressed));
    } else {
      // Subsequent frames use fdAT: 4 bytes seq + data
      const fdatData = new Uint8Array(4 + compressed.length);
      writeUint32(fdatData, 0, seq++);
      fdatData.set(compressed, 4);
      chunks.push(createChunk('fdAT', fdatData));
    }

    if (onProgress) {
      onProgress(Math.round(((i + 1) / numFrames) * 100));
    }
  }

  // IEND chunk (0 bytes)
  chunks.push(createChunk('IEND', new Uint8Array(0)));

  return createBlob(chunks, { type: 'image/apng' });
}
