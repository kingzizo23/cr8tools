import { create } from 'zustand';
import * as fflate from 'fflate';
import { BatchTask, BatchVariant, ExportConfig, ExportFormat } from '../core/types/motion';
import { detectFormat } from '../core/detector/magicByteDetector';
import { runConversionPipeline } from '../core/converters/pipelineRunner';
import { getSupportedOutputs } from '../core/converters/conversionMatrix';

export type QueueStatus = 'idle' | 'running' | 'paused' | 'done';

interface BatchState {
  tasks: BatchTask[];
  queueStatus: QueueStatus;
  concurrency: number;
  activeWorkers: number;

  // Comparison modal state
  comparingVariant: { task: BatchTask; variant: BatchVariant } | null;

  // Actions
  addFiles: (files: File[]) => Promise<void>;
  removeTask: (taskId: string) => void;
  clearAll: () => void;
  toggleTaskSelect: (taskId: string) => void;
  selectAllTasks: (select: boolean) => void;

  addVariantToTask: (taskId: string, format: ExportFormat) => void;
  duplicateVariant: (taskId: string, variantId: string) => void;
  removeVariant: (taskId: string, variantId: string) => void;
  updateVariantConfig: (taskId: string, variantId: string, partial: Partial<ExportConfig>) => void;
  applySharedConfig: (partial: Partial<ExportConfig>) => void;

  startQueue: () => Promise<void>;
  pauseQueue: () => void;
  resumeQueue: () => void;
  cancelQueue: () => void;
  retryFailed: () => void;

  openCompareModal: (task: BatchTask, variant: BatchVariant) => void;
  closeCompareModal: () => void;

  downloadVariant: (variant: BatchVariant) => void;
  downloadAllZip: () => Promise<void>;
}

export const useBatchStore = create<BatchState>((set, get) => ({
  tasks: [],
  queueStatus: 'idle',
  concurrency: 2,
  activeWorkers: 0,
  comparingVariant: null,

  addFiles: async (files: File[]) => {
    const newTasks: BatchTask[] = [];

    for (const file of files) {
      try {
        const buffer = await file.arrayBuffer();
        const detected = detectFormat(buffer, file.name);

        const width = 500;
        const height = 500;
        const fps = 30;
        const totalFrames = 60;
        const duration = 2;
        const objectUrl = URL.createObjectURL(file);

        const asset = {
          id: `batch_asset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          size: file.size,
          format: detected.format,
          formatVersion: detected.formatVersion,
          width,
          height,
          fps,
          totalFrames,
          duration,
          hasAlpha: detected.hasAlpha ?? true,
          hasAudio: detected.hasAudio ?? false,
          rawBuffer: buffer,
          objectUrl,
          estimatedRamBytes: totalFrames * (width * height * 4),
        };

        const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const supported = getSupportedOutputs(detected.format);
        const initialFormat = supported.includes('webp') ? 'webp' : supported[0] || 'webp';

        const initialVariant: BatchVariant = {
          id: `var_${Date.now()}_1`,
          taskId,
          name: `${file.name.replace(/\.[^/.]+$/, '')}.${initialFormat}`,
          config: {
            format: initialFormat,
            width,
            height,
            fps,
            quality: 85,
            loop: true,
            mirrorX: false,
            mirrorY: false,
          },
          status: 'idle',
          progress: 0,
        };

        newTasks.push({
          id: taskId,
          asset,
          variants: [initialVariant],
          selected: false,
        });
      } catch (err) {
        console.error('Failed to parse file for batch:', file.name, err);
      }
    }

    set((state) => ({ tasks: [...state.tasks, ...newTasks] }));
  },

  removeTask: (taskId) => {
    const target = get().tasks.find((t) => t.id === taskId);
    if (target?.asset.objectUrl) URL.revokeObjectURL(target.asset.objectUrl);
    target?.variants.forEach((v) => {
      if (v.outputUrl) URL.revokeObjectURL(v.outputUrl);
    });

    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== taskId) }));
  },

  clearAll: () => {
    get().tasks.forEach((t) => {
      if (t.asset.objectUrl) URL.revokeObjectURL(t.asset.objectUrl);
      t.variants.forEach((v) => {
        if (v.outputUrl) URL.revokeObjectURL(v.outputUrl);
      });
    });
    set({ tasks: [], queueStatus: 'idle' });
  },

  toggleTaskSelect: (taskId) => {
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, selected: !t.selected } : t)),
    }));
  },

  selectAllTasks: (select) => {
    set((state) => ({
      tasks: state.tasks.map((t) => ({ ...t, selected: select })),
    }));
  },

  addVariantToTask: (taskId, format) => {
    set((state) => ({
      tasks: state.tasks.map((task) => {
        if (task.id !== taskId) return task;
        const newVarId = `var_${Date.now()}_${task.variants.length + 1}`;
        const newVariant: BatchVariant = {
          id: newVarId,
          taskId,
          name: `${task.asset.name.replace(/\.[^/.]+$/, '')}.${format}`,
          config: {
            format,
            width: task.asset.width,
            height: task.asset.height,
            fps: task.asset.fps,
            quality: 85,
            loop: true,
            mirrorX: false,
            mirrorY: false,
          },
          status: 'idle',
          progress: 0,
        };
        return { ...task, variants: [...task.variants, newVariant] };
      }),
    }));
  },

  duplicateVariant: (taskId, variantId) => {
    set((state) => ({
      tasks: state.tasks.map((task) => {
        if (task.id !== taskId) return task;
        const original = task.variants.find((v) => v.id === variantId);
        if (!original) return task;

        const newVarId = `var_${Date.now()}_copy`;
        const clone: BatchVariant = {
          ...original,
          id: newVarId,
          name: `${original.name.replace(/\.[^/.]+$/, '')}_copy.${original.config.format}`,
          status: 'idle',
          progress: 0,
          outputBlob: undefined,
          outputUrl: undefined,
          outputSize: undefined,
        };

        return { ...task, variants: [...task.variants, clone] };
      }),
    }));
  },

  removeVariant: (taskId, variantId) => {
    set((state) => ({
      tasks: state.tasks.map((task) => {
        if (task.id !== taskId) return task;
        const targetVar = task.variants.find((v) => v.id === variantId);
        if (targetVar?.outputUrl) URL.revokeObjectURL(targetVar.outputUrl);
        return { ...task, variants: task.variants.filter((v) => v.id !== variantId) };
      }),
    }));
  },

  updateVariantConfig: (taskId, variantId, partial) => {
    set((state) => ({
      tasks: state.tasks.map((task) => {
        if (task.id !== taskId) return task;
        return {
          ...task,
          variants: task.variants.map((v) => {
            if (v.id !== variantId) return v;
            return {
              ...v,
              config: { ...v.config, ...partial },
              status: 'idle',
              progress: 0,
            };
          }),
        };
      }),
    }));
  },

  applySharedConfig: (partial) => {
    set((state) => ({
      tasks: state.tasks.map((task) => {
        if (!task.selected) return task;
        return {
          ...task,
          variants: task.variants.map((v) => {
            if (v.status === 'processing') return v;
            return {
              ...v,
              config: { ...v.config, ...partial },
              status: 'idle',
              progress: 0,
            };
          }),
        };
      }),
    }));
  },

  startQueue: async () => {
    set({ queueStatus: 'running' });
    const { concurrency } = get();

    // Helper to find next pending variant
    const getNextPending = () => {
      const { tasks, queueStatus } = get();
      if (queueStatus !== 'running') return null;

      for (const task of tasks) {
        for (const variant of task.variants) {
          if (variant.status === 'idle') {
            return { task, variant };
          }
        }
      }
      return null;
    };

    // Worker execution loop
    const runWorker = async () => {
      while (get().queueStatus === 'running') {
        const next = getNextPending();
        if (!next) break;

        const { task, variant } = next;

        // Set processing
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === task.id
              ? {
                  ...t,
                  variants: t.variants.map((v) =>
                    v.id === variant.id ? { ...v, status: 'processing', progress: 5 } : v
                  ),
                }
              : t
          ),
        }));

        try {
          const result = await runConversionPipeline(task.asset, variant.config, (pct) => {
            set((state) => ({
              tasks: state.tasks.map((t) =>
                t.id === task.id
                  ? {
                      ...t,
                      variants: t.variants.map((v) =>
                        v.id === variant.id ? { ...v, progress: pct } : v
                      ),
                    }
                  : t
              ),
            }));
          });

          // Mark done
          set((state) => ({
            tasks: state.tasks.map((t) =>
              t.id === task.id
                ? {
                    ...t,
                    variants: t.variants.map((v) =>
                      v.id === variant.id
                        ? {
                            ...v,
                            status: 'done',
                            progress: 100,
                            outputBlob: result.blob,
                            outputSize: result.size,
                            outputUrl: result.url,
                            outputDimensions: { width: result.width, height: result.height },
                            outputFps: result.fps,
                            outputDuration: result.duration,
                          }
                        : v
                    ),
                  }
                : t
            ),
          }));
        } catch (err: any) {
          console.error('Variant conversion error:', err);
          set((state) => ({
            tasks: state.tasks.map((t) =>
              t.id === task.id
                ? {
                    ...t,
                    variants: t.variants.map((v) =>
                      v.id === variant.id ? { ...v, status: 'failed', error: err.message || 'Error' } : v
                    ),
                  }
                : t
            ),
          }));
        }
      }
    };

    // Launch workers
    const workerPromises = Array.from({ length: concurrency }).map(() => runWorker());
    await Promise.all(workerPromises);

    if (get().queueStatus === 'running') {
      set({ queueStatus: 'done' });
    }
  },

  pauseQueue: () => set({ queueStatus: 'paused' }),
  resumeQueue: () => {
    get().startQueue();
  },
  cancelQueue: () => {
    set((state) => ({
      queueStatus: 'idle',
      tasks: state.tasks.map((t) => ({
        ...t,
        variants: t.variants.map((v) =>
          v.status === 'processing' ? { ...v, status: 'idle', progress: 0 } : v
        ),
      })),
    }));
  },

  retryFailed: () => {
    set((state) => ({
      tasks: state.tasks.map((t) => ({
        ...t,
        variants: t.variants.map((v) =>
          v.status === 'failed' ? { ...v, status: 'idle', progress: 0, error: undefined } : v
        ),
      })),
    }));
    get().startQueue();
  },

  openCompareModal: (task, variant) => set({ comparingVariant: { task, variant } }),
  closeCompareModal: () => set({ comparingVariant: null }),

  downloadVariant: (variant) => {
    if (!variant.outputBlob || !variant.outputUrl) return;
    const a = document.createElement('a');
    a.href = variant.outputUrl;
    a.download = variant.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },

  downloadAllZip: async () => {
    const { tasks } = get();
    const files: { [name: string]: Uint8Array } = {};
    const usedNames = new Set<string>();

    for (const task of tasks) {
      for (const v of task.variants) {
        if (v.status === 'done' && v.outputBlob) {
          let filename = v.name;
          let counter = 1;
          while (usedNames.has(filename)) {
            const ext = filename.split('.').pop();
            const base = filename.replace(/\.[^/.]+$/, '');
            filename = `${base}_${counter}.${ext}`;
            counter++;
          }
          usedNames.add(filename);

          const buf = await v.outputBlob.arrayBuffer();
          files[filename] = new Uint8Array(buf);
        }
      }
    }

    if (Object.keys(files).length === 0) return;

    const zipBytes = fflate.zipSync(files, { level: 6 });
    const zipBlob = new Blob([zipBytes], { type: 'application/zip' });
    const url = URL.createObjectURL(zipBlob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `MotionForge_Batch_${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
}));
