import { createBlob } from '../../utils/blob';

export interface WebpOptions {
  fps: number;
  quality?: number; // 0.1 to 1.0
  loop?: boolean;
}

function write24(buf: Uint8Array, offset: number, val: number) {
  buf[offset] = val & 0xff;
  buf[offset + 1] = (val >>> 8) & 0xff;
  buf[offset + 2] = (val >>> 16) & 0xff;
}

function write32(buf: Uint8Array, offset: number, val: number) {
  buf[offset] = val & 0xff;
  buf[offset + 1] = (val >>> 8) & 0xff;
  buf[offset + 2] = (val >>> 16) & 0xff;
  buf[offset + 3] = (val >>> 24) & 0xff;
}

function write16(buf: Uint8Array, offset: number, val: number) {
  buf[offset] = val & 0xff;
  buf[offset + 1] = (val >>> 8) & 0xff;
}

/**
 * Extracts the inner VP8 / VP8L / ALPH payload from a single-frame WebP blob
 */
async function extractWebpFramePayload(canvas: HTMLCanvasElement, quality: number = 0.8): Promise<Uint8Array> {
  const blob: Blob = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b || new Blob()), 'image/webp', quality);
  });

  const arrayBuf = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuf);

  // Look for 'VP8 ', 'VP8L', or 'ALPH' after byte 12
  let offset = 12;
  const chunks: Uint8Array[] = [];

  while (offset < bytes.length - 8) {
    const tag = String.fromCharCode(...bytes.subarray(offset, offset + 4));
    const size =
      bytes[offset + 4] |
      (bytes[offset + 5] << 8) |
      (bytes[offset + 6] << 16) |
      (bytes[offset + 7] << 24);

    const chunkTotal = 8 + size + (size % 2); // 4 tag + 4 size + data + pad

    if (tag === 'VP8 ' || tag === 'VP8L' || tag === 'ALPH') {
      chunks.push(bytes.subarray(offset, offset + chunkTotal));
    }

    offset += chunkTotal;
  }

  // Combine extracted sub-chunks
  const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
  const result = new Uint8Array(totalLen);
  let pos = 0;
  for (const c of chunks) {
    result.set(c, pos);
    pos += c.length;
  }

  return result;
}

/**
 * Encodes multiple canvas frames into an animated WebP file
 */
export async function encodeAnimatedWebp(
  canvases: HTMLCanvasElement[],
  options: WebpOptions,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  const numFrames = canvases.length;
  const width = canvases[0].width;
  const height = canvases[0].height;
  const fps = options.fps || 30;
  const frameDurationMs = Math.round(1000 / fps);
  const quality = (options.quality ?? 80) / 100;

  const framePayloads: Uint8Array[] = [];

  for (let i = 0; i < numFrames; i++) {
    const payload = await extractWebpFramePayload(canvases[i], quality);
    framePayloads.push(payload);

    if (onProgress) {
      onProgress(Math.round(((i + 1) / numFrames) * 90));
    }
  }

  // Calculate file sizes
  // VP8X header (18 bytes)
  const vp8x = new Uint8Array(18);
  vp8x.set([0x56, 0x50, 0x38, 0x58]); // 'VP8X'
  write32(vp8x, 4, 10); // length: 10
  vp8x[8] = 0x12; // Flags: Animation (0x02) + Alpha (0x10)
  write24(vp8x, 12, width - 1);
  write24(vp8x, 15, height - 1);

  // ANIM chunk (14 bytes)
  const anim = new Uint8Array(14);
  anim.set([0x41, 0x4e, 0x49, 0x4d]); // 'ANIM'
  write32(anim, 4, 6); // length: 6
  write32(anim, 8, 0); // Background color (transparent)
  write16(anim, 12, options.loop !== false ? 0 : 1); // Loop count (0 = infinite)

  // ANMF chunks
  const anmfChunks: Uint8Array[] = [];
  for (let i = 0; i < numFrames; i++) {
    const payload = framePayloads[i];
    const payloadLen = payload.length;
    const anmfDataLen = 16 + payloadLen;
    const pad = anmfDataLen % 2;
    const anmfTotal = 8 + anmfDataLen + pad;

    const chunk = new Uint8Array(anmfTotal);
    chunk.set([0x41, 0x4e, 0x4d, 0x46]); // 'ANMF'
    write32(chunk, 4, anmfDataLen);
    write24(chunk, 8, 0); // Frame X
    write24(chunk, 11, 0); // Frame Y
    write24(chunk, 14, width - 1); // Frame W - 1
    write24(chunk, 17, height - 1); // Frame H - 1
    write24(chunk, 20, frameDurationMs); // Duration ms
    chunk[23] = 0x02; // Flags: do not blend (replace), dispose to background

    chunk.set(payload, 24);
    anmfChunks.push(chunk);
  }

  const anmfTotalBytes = anmfChunks.reduce((acc, c) => acc + c.length, 0);
  const totalRiffSize = 4 + vp8x.length + anim.length + anmfTotalBytes;

  const riffHeader = new Uint8Array(12);
  riffHeader.set([0x52, 0x49, 0x46, 0x46]); // 'RIFF'
  write32(riffHeader, 4, totalRiffSize);
  riffHeader.set([0x57, 0x45, 0x42, 0x50], 8); // 'WEBP'

  if (onProgress) onProgress(100);

  return createBlob([riffHeader, vp8x, anim, ...anmfChunks], { type: 'image/webp' });
}
