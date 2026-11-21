import { create } from 'zustand';
import { MotionAsset, ExportConfig, ExportFormat, DynamicElementConfig } from '../core/types/motion';
import { detectFormat } from '../core/detector/magicByteDetector';
import { parseSvga } from '../core/parsers/svgaParser';
import { parseLottie } from '../core/parsers/lottieParser';
import { parseDotLottie } from '../core/parsers/dotLottieParser';
import { parseSequenceZip } from '../core/parsers/sequenceZipParser';
import { extractMp4Meta } from '../core/parsers/mp4BoxParser';

export type ActiveTab = 'processing' | 'svga-editor' | 'batch';

interface WorkspaceState {
  activeTab: ActiveTab;
  asset: MotionAsset | null;
  isLoading: boolean;
  loadError: string | null;

  // Stage state
  isPlaying: boolean;
  currentFrame: number;
  totalFrames: number;
  loop: boolean;
  zoom: number; // 0 = fit, 1 = 100%, 0.5 = 50%, 2 = 200%
  bgType: 'checkerboard' | 'black' | 'white' | 'custom';
  customBgColor: string;

  // Export settings
  exportConfig: ExportConfig;
  aspectLocked: boolean;
  aspectRatio: number; // width / height

  // Modified entities for deep editing
  svgaEntity: any | null;
  lottieData: any | null;

  // Actions
  setActiveTab: (tab: ActiveTab) => void;
  loadAssetFromFile: (file: File) => Promise<void>;
  updateExportConfig: (partial: Partial<ExportConfig>) => void;
  setFrame: (frame: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setZoom: (zoom: number) => void;
  setBgType: (bg: 'checkerboard' | 'black' | 'white' | 'custom', customColor?: string) => void;
  setAspectLocked: (locked: boolean) => void;
  setSvgaEntity: (entity: any) => void;
  setLottieData: (data: any) => void;
  addDynamicElement: (el: DynamicElementConfig) => void;
  removeDynamicElement: (tag: string) => void;
  clearAsset: () => void;
}

const defaultExportConfig: ExportConfig = {
  format: 'webp',
  width: 500,
  height: 500,
  fps: 30,
  quality: 85,
  loop: true,
  mirrorX: false,
  mirrorY: false,
  removeBlackBg: false,
  blackBgThreshold: 0.05,
  blackBgSoftness: 0.15,
  dualChannelLayout: 'alpha-left',
  dynamicElements: [],
};

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  activeTab: 'processing',
  asset: null,
  isLoading: false,
  loadError: null,

  isPlaying: true,
  currentFrame: 0,
  totalFrames: 60,
  loop: true,
  zoom: 0, // Fit
  bgType: 'checkerboard',
  customBgColor: '#2563eb',

  exportConfig: defaultExportConfig,
  aspectLocked: true,
  aspectRatio: 1,

  svgaEntity: null,
  lottieData: null,

  setActiveTab: (tab) => set({ activeTab: tab }),

  loadAssetFromFile: async (file: File) => {
    set({ isLoading: true, loadError: null });

    try {
      const buffer = await file.arrayBuffer();
      const detected = detectFormat(buffer, file.name);

      let width = 500;
      let height = 500;
      let fps = 30;
      let totalFrames = 60;
      let duration = 2;
      let hasAlpha = detected.hasAlpha ?? true;
      let hasAudio = detected.hasAudio ?? false;
      let parsedEntity: any = null;

      // Extract details by format
      if (detected.format === 'svga') {
        const parsed = parseSvga(buffer);
        parsedEntity = parsed;
        width = parsed.width;
        height = parsed.height;
        fps = parsed.fps;
        totalFrames = parsed.totalFrames;
        duration = parsed.duration;
        hasAudio = parsed.audios.length > 0;
        set({ svgaEntity: parsed.entity });
      } else if (detected.format === 'lottie') {
        const text = new TextDecoder().decode(buffer);
        const json = JSON.parse(text);
        const parsed = parseLottie(json);
        parsedEntity = parsed;
        width = parsed.width;
        height = parsed.height;
        fps = parsed.fps;
        totalFrames = parsed.totalFrames;
        duration = parsed.duration;
        set({ lottieData: parsed });
      } else if (detected.format === 'dotlottie') {
        const parsed = parseDotLottie(buffer);
        parsedEntity = parsed;
        width = parsed.width;
        height = parsed.height;
        fps = parsed.fps;
        totalFrames = parsed.totalFrames;
        duration = parsed.duration;
        set({ lottieData: parsed });
      } else if (detected.format === 'png-sequence') {
        const parsed = await parseSequenceZip(buffer, 30);
        parsedEntity = parsed;
        width = parsed.width;
        height = parsed.height;
        fps = parsed.fps;
        totalFrames = parsed.totalFrames;
        duration = parsed.duration;
      } else if (
        detected.format === 'mp4' ||
        detected.format === 'webm' ||
        detected.format === 'mov' ||
        detected.format === 'vap' ||
        detected.format === 'yyeva' ||
        detected.format === 'dual-channel'
      ) {
        const meta = extractMp4Meta(buffer);
        if (meta.width > 0) {
          width = meta.width;
          height = meta.height;
          fps = meta.fps;
        }

        // Get actual video dimensions & duration via HTMLVideoElement
        const tempVideo = document.createElement('video');
        const url = URL.createObjectURL(file);
        tempVideo.src = url;
        tempVideo.muted = true;
        tempVideo.preload = 'metadata';

        await new Promise<void>((resolve) => {
          tempVideo.onloadedmetadata = () => {
            if (tempVideo.videoWidth > 0) {
              if (meta.type === 'vap' || meta.type === 'yyeva' || detected.format === 'dual-channel') {
                width = Math.round(tempVideo.videoWidth / 2);
                height = tempVideo.videoHeight;
              } else {
                width = tempVideo.videoWidth;
                height = tempVideo.videoHeight;
              }
            }
            if (tempVideo.duration && isFinite(tempVideo.duration)) {
              duration = tempVideo.duration;
              totalFrames = Math.max(1, Math.round(duration * (fps || 30)));
            }
            resolve();
          };
          tempVideo.onerror = () => resolve();
          setTimeout(resolve, 1000);
        });
        URL.revokeObjectURL(url);
      }

      // Memory estimation: totalFrames * (width * height * 4)
      const estimatedRamBytes = totalFrames * (width * height * 4);
      const objectUrl = URL.createObjectURL(file);

      const asset: MotionAsset = {
        id: `asset_${Date.now()}`,
        name: file.name,
        size: file.size,
        format: detected.format,
        formatVersion: detected.formatVersion,
        width,
        height,
        fps,
        totalFrames,
        duration,
        hasAlpha,
        hasAudio,
        rawBuffer: buffer,
        objectUrl,
        estimatedRamBytes,
        parsedEntity,
      };

      // Set initial export config
      let initialOutFormat: ExportFormat = 'webp';
      if (detected.format === 'svga') initialOutFormat = 'webp';
      else if (detected.format === 'lottie') initialOutFormat = 'dotlottie';
      else if (detected.format === 'dotlottie') initialOutFormat = 'lottie';

      const config: ExportConfig = {
        ...defaultExportConfig,
        format: initialOutFormat,
        width,
        height,
        fps,
      };

      set({
        asset,
        isLoading: false,
        totalFrames,
        currentFrame: 0,
        isPlaying: true,
        aspectRatio: width / (height || 1),
        exportConfig: config,
      });
    } catch (err: any) {
      console.error('Error loading motion asset:', err);
      set({ isLoading: false, loadError: err.message || 'Failed to parse motion file' });
    }
  },

  updateExportConfig: (partial) => {
    set((state) => {
      let newConfig = { ...state.exportConfig, ...partial };
      // If width changed and aspect ratio locked
      if (partial.width && state.aspectLocked && state.aspectRatio) {
        newConfig.height = Math.round(partial.width / state.aspectRatio);
      } else if (partial.height && state.aspectLocked && state.aspectRatio) {
        newConfig.width = Math.round(partial.height * state.aspectRatio);
      }
      return { exportConfig: newConfig };
    });
  },

  setFrame: (frame) => set({ currentFrame: frame }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setZoom: (zoom) => set({ zoom }),
  setBgType: (bgType, customBgColor) =>
    set({ bgType, ...(customBgColor ? { customBgColor } : {}) }),
  setAspectLocked: (locked) => set({ aspectLocked: locked }),
  setSvgaEntity: (entity) => set({ svgaEntity: entity }),
  setLottieData: (data) => set({ lottieData: data }),

  addDynamicElement: (el) =>
    set((state) => {
      const list = state.exportConfig.dynamicElements || [];
      return {
        exportConfig: {
          ...state.exportConfig,
          dynamicElements: [...list.filter((x) => x.tag !== el.tag), el],
        },
      };
    }),

  removeDynamicElement: (tag) =>
    set((state) => ({
      exportConfig: {
        ...state.exportConfig,
        dynamicElements: (state.exportConfig.dynamicElements || []).filter((x) => x.tag !== tag),
      },
    })),

  clearAsset: () => {
    const curr = get().asset;
    if (curr && curr.objectUrl) {
      URL.revokeObjectURL(curr.objectUrl);
    }
    set({
      asset: null,
      svgaEntity: null,
      lottieData: null,
      currentFrame: 0,
      totalFrames: 60,
    });
  },
}));
