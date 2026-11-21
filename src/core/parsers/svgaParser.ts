import pako from 'pako';
import { MovieEntityType, SvgaMovieEntity } from '../types/svga.proto';

export interface ParsedSvgaData {
  entity: SvgaMovieEntity;
  width: number;
  height: number;
  fps: number;
  totalFrames: number;
  duration: number;
  images: { [key: string]: { data: Uint8Array; url: string; width?: number; height?: number } };
  audios: Array<{ key: string; startFrame: number; endFrame: number; startTime: number; totalTime: number; url?: string }>;
  spritesCount: number;
}

/**
 * Converts a Uint8Array into a data URL
 */
export function uint8ArrayToDataUrl(data: Uint8Array, mimeType: string = 'image/png'): string {
  let binary = '';
  const len = data.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

/**
 * Converts a Data URL or base64 string to Uint8Array
 */
export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Parses raw SVGA binary into an editable SvgaMovieEntity and extracted media
 */
export function parseSvga(buffer: ArrayBuffer): ParsedSvgaData {
  const bytes = new Uint8Array(buffer);
  let decompressed: Uint8Array;

  try {
    decompressed = pako.inflate(bytes);
  } catch (err) {
    // If raw uncompressed protobuf
    decompressed = bytes;
  }

  const rawEntity: any = MovieEntityType.decode(decompressed);
  const entity: SvgaMovieEntity = MovieEntityType.toObject(rawEntity, {
    defaults: true,
    arrays: true,
    objects: true,
    bytes: Uint8Array,
  }) as SvgaMovieEntity;

  const width = entity.params?.viewBoxWidth || 500;
  const height = entity.params?.viewBoxHeight || 500;
  const fps = entity.params?.fps || 30;
  const totalFrames = entity.params?.frames || 60;
  const duration = totalFrames / fps;

  const images: { [key: string]: { data: Uint8Array; url: string } } = {};
  if (entity.images) {
    for (const [key, rawData] of Object.entries(entity.images)) {
      if (rawData && rawData.length > 0) {
        // Detect mime type: PNG or JPEG
        const isJpeg = rawData[0] === 0xff && rawData[1] === 0xd8;
        const mime = isJpeg ? 'image/jpeg' : 'image/png';
        const url = uint8ArrayToDataUrl(rawData, mime);
        images[key] = {
          data: rawData,
          url,
        };
      }
    }
  }

  const audios: Array<any> = [];
  if (Array.isArray(entity.audios)) {
    entity.audios.forEach((audio) => {
      audios.push({
        key: audio.audioKey,
        startFrame: audio.startFrame,
        endFrame: audio.endFrame,
        startTime: audio.startTime,
        totalTime: audio.totalTime,
      });
    });
  }

  return {
    entity,
    width,
    height,
    fps,
    totalFrames,
    duration,
    images,
    audios,
    spritesCount: entity.sprites?.length || 0,
  };
}

/**
 * Packs an SvgaMovieEntity into a valid .svga binary buffer (Protobuf -> zlib deflate)
 */
export function packSvga(entity: SvgaMovieEntity): Uint8Array {
  // Validate and encode through Protobuf MovieEntityType
  const errMsg = MovieEntityType.verify(entity);
  if (errMsg) {
    console.warn('Protobuf verification notice:', errMsg);
  }

  const message = MovieEntityType.create(entity);
  const encodedBytes = MovieEntityType.encode(message).finish();

  // Compress using pako deflate (zlib format with header 0x78 0x9c)
  const compressed = pako.deflate(encodedBytes, { level: 9 });
  return compressed;
}
