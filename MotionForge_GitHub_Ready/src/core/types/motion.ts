export type MotionFormat =
  | 'svga'
  | 'lottie'
  | 'dotlottie'
  | 'pag'
  | 'vap'
  | 'yyeva'
  | 'dual-channel'
  | 'webp'
  | 'apng'
  | 'gif'
  | 'mp4'
  | 'webm'
  | 'mov'
  | 'png-sequence'
  | 'unknown';

export type ExportFormat =
  | 'svga'
  | 'lottie'
  | 'dotlottie'
  | 'webp'
  | 'apng'
  | 'gif'
  | 'mp4'
  | 'webm'
  | 'mov'
  | 'png-sequence'
  | 'vap'
  | 'yyeva'
  | 'dual-channel'
  | 'ae-jsx';

export interface DynamicElementConfig {
  tag: string;
  type: 'image' | 'text';
  fitMode: 'aspectFill' | 'aspectFit' | 'scaleFill';
  defaultText?: string;
  fontSize?: number;
  color?: string;
  frameBounds?: { [frame: number]: { x: number; y: number; w: number; h: number } };
}

export interface WatermarkConfig {
  enabled: boolean;
  imageBlob?: Blob;
  imageUrl?: string;
  xPercent: number; // 0 to 100
  yPercent: number; // 0 to 100
  scalePercent: number; // 10 to 300
  opacity: number; // 0 to 1
  rotationDeg: number; // -180 to 180
}

export interface CanvasFeatherConfig {
  enabled: boolean;
  top: number;
  bottom: number;
  left: number;
  right: number;
  softness: number;
}

export interface ExportConfig {
  format: ExportFormat;
  width: number;
  height: number;
  fps: number;
  quality: number; // 1-100
  loop: boolean;
  mirrorX: boolean;
  mirrorY: boolean;
  removeBlackBg?: boolean;
  blackBgThreshold?: number; // 0 - 1
  blackBgSoftness?: number; // 0 - 1
  dualChannelLayout?: 'alpha-left' | 'rgb-left' | 'top-bottom';
  trimStart?: number; // seconds
  trimEnd?: number; // seconds
  dynamicElements?: DynamicElementConfig[];
  watermark?: WatermarkConfig;
  canvasFeather?: CanvasFeatherConfig;
}

export interface MotionAsset {
  id: string;
  name: string;
  size: number;
  format: MotionFormat;
  formatVersion?: string;
  width: number;
  height: number;
  fps: number;
  totalFrames: number;
  duration: number; // in seconds
  hasAlpha: boolean;
  hasAudio: boolean;
  rawBuffer: ArrayBuffer;
  objectUrl: string;
  estimatedRamBytes: number;
  parsedEntity?: any;
}

export interface BatchVariant {
  id: string;
  taskId: string;
  name: string;
  config: ExportConfig;
  status: 'idle' | 'processing' | 'done' | 'failed';
  progress: number;
  error?: string;
  outputBlob?: Blob;
  outputSize?: number;
  outputUrl?: string;
  outputDimensions?: { width: number; height: number };
  outputFps?: number;
  outputDuration?: number;
}

export interface BatchTask {
  id: string;
  asset: MotionAsset;
  variants: BatchVariant[];
  selected?: boolean;
}
