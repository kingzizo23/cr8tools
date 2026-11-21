import React from 'react';
import {
  Copy,
  Trash2,
  Download,
  Eye,
  Plus,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  Square,
  CheckSquare,
} from 'lucide-react';
import { useI18n } from '../../i18n';
import { useBatchStore } from '../../store/batchStore';
import { getSupportedOutputs } from '../../core/converters/conversionMatrix';
import { ExportFormat } from '../../core/types/motion';

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export const TaskTable: React.FC = () => {
  const { t } = useI18n();
  const {
    tasks,
    removeTask,
    toggleTaskSelect,
    addVariantToTask,
    duplicateVariant,
    removeVariant,
    updateVariantConfig,
    openCompareModal,
    downloadVariant,
  } = useBatchStore();

  if (tasks.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {tasks.map((task) => {
        const supported = getSupportedOutputs(task.asset.format);

        return (
          <div
            key={task.id}
            className={`p-4 rounded-2xl border transition shadow-lg ${
              task.selected
                ? 'bg-zinc-900/90 border-blue-500/50 ring-1 ring-blue-500/30'
                : 'bg-[#111114] border-zinc-800/80 hover:border-zinc-700'
            }`}
          >
            {/* Task Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => toggleTaskSelect(task.id)}
                  className="text-zinc-400 hover:text-white"
                >
                  {task.selected ? (
                    <CheckSquare className="w-4 h-4 text-blue-400" />
                  ) : (
                    <Square className="w-4 h-4 text-zinc-600" />
                  )}
                </button>

                <div className="flex flex-col">
                  <span className="font-bold text-sm text-zinc-100 truncate max-w-xs sm:max-w-md">
                    {task.asset.name}
                  </span>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono mt-0.5">
                    <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-blue-400 font-bold uppercase">
                      {task.asset.format}
                    </span>
                    <span>{task.asset.width}×{task.asset.height}px</span>
                    <span>•</span>
                    <span>{formatBytes(task.asset.size)}</span>
                    <span>•</span>
                    <span>{task.asset.fps} FPS</span>
                  </div>
                </div>
              </div>

              {/* Add Variant & Delete Task */}
              <div className="flex items-center gap-2">
                {/* Format Adder */}
                <div className="flex items-center gap-1.5">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        addVariantToTask(task.id, e.target.value as ExportFormat);
                        e.target.value = '';
                      }
                    }}
                    defaultValue=""
                    className="bg-zinc-900 border border-zinc-700/80 text-zinc-300 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none"
                  >
                    <option value="" disabled>
                      {t.batch.addFormat}
                    </option>
                    {supported.map((fmt) => (
                      <option key={fmt} value={fmt}>
                        {fmt.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => removeTask(task.id)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition"
                  title="Remove File"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Output Variants List */}
            <div className="flex flex-col gap-2.5 mt-3">
              {task.variants.map((v) => {
                const savingsPct =
                  task.asset.size > 0 && v.outputSize && v.outputSize > 0
                    ? Math.round(((task.asset.size - v.outputSize) / task.asset.size) * 100)
                    : null;

                return (
                  <div
                    key={v.id}
                    className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    {/* Left: Target Format & Config Inputs */}
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30 uppercase">
                        {v.config.format}
                      </span>

                      {/* Dimensions Input */}
                      <div className="flex items-center gap-1 font-mono text-[11px] text-zinc-300">
                        <input
                          type="number"
                          value={v.config.width}
                          disabled={v.status === 'processing'}
                          onChange={(e) =>
                            updateVariantConfig(task.id, v.id, {
                              width: parseInt(e.target.value, 10) || 100,
                            })
                          }
                          className="w-14 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-center focus:outline-none"
                        />
                        <span className="text-zinc-500">×</span>
                        <input
                          type="number"
                          value={v.config.height}
                          disabled={v.status === 'processing'}
                          onChange={(e) =>
                            updateVariantConfig(task.id, v.id, {
                              height: parseInt(e.target.value, 10) || 100,
                            })
                          }
                          className="w-14 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-center focus:outline-none"
                        />
                      </div>

                      {/* FPS */}
                      <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-mono">
                        <span>FPS:</span>
                        <input
                          type="number"
                          min={10}
                          max={60}
                          value={v.config.fps}
                          disabled={v.status === 'processing'}
                          onChange={(e) =>
                            updateVariantConfig(task.id, v.id, {
                              fps: parseInt(e.target.value, 10) || 30,
                            })
                          }
                          className="w-10 bg-zinc-800 border border-zinc-700 rounded px-1 text-center text-zinc-200 focus:outline-none"
                        />
                      </div>

                      {/* Quality */}
                      <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-mono">
                        <span>Q:</span>
                        <input
                          type="number"
                          min={20}
                          max={100}
                          value={v.config.quality}
                          disabled={v.status === 'processing'}
                          onChange={(e) =>
                            updateVariantConfig(task.id, v.id, {
                              quality: parseInt(e.target.value, 10) || 80,
                            })
                          }
                          className="w-12 bg-zinc-800 border border-zinc-700 rounded px-1 text-center text-zinc-200 focus:outline-none"
                        />
                        <span>%</span>
                      </div>
                    </div>

                    {/* Middle: Progress / Status / Savings */}
                    <div className="flex items-center gap-3">
                      {v.status === 'idle' && (
                        <span className="flex items-center gap-1 text-zinc-400 text-[11px]">
                          <Clock className="w-3.5 h-3.5" />
                          {t.batch.status.idle}
                        </span>
                      )}

                      {v.status === 'processing' && (
                        <div className="flex items-center gap-2">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                          <span className="text-[11px] font-mono text-blue-400 font-semibold">
                            {v.progress}%
                          </span>
                        </div>
                      )}

                      {v.status === 'done' && (
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {t.batch.status.done}
                          </span>
                          <span className="font-mono text-[11px] text-zinc-300">
                            ({formatBytes(v.outputSize || 0)})
                          </span>
                          {savingsPct !== null && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              -{savingsPct}%
                            </span>
                          )}
                        </div>
                      )}

                      {v.status === 'failed' && (
                        <span className="flex items-center gap-1 text-red-400 text-[11px]" title={v.error}>
                          <AlertCircle className="w-3.5 h-3.5" />
                          {t.batch.status.failed}
                        </span>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1.5">
                      {/* Duplicate Plan button */}
                      <button
                        onClick={() => duplicateVariant(task.id, v.id)}
                        className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition"
                        title={t.batch.duplicateVariant}
                      >
                        <Copy className="w-3 h-3 text-blue-400" />
                        <span>{t.batch.duplicateVariant}</span>
                      </button>

                      {/* Compare Button */}
                      {v.status === 'done' && (
                        <button
                          onClick={() => openCompareModal(task, v)}
                          className="px-2 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-[11px] font-semibold flex items-center gap-1 border border-indigo-500/30 transition"
                          title={t.batch.compareBtn}
                        >
                          <Eye className="w-3 h-3" />
                          <span>{t.batch.compareBtn}</span>
                        </button>
                      )}

                      {/* Download Single Variant */}
                      {v.status === 'done' && (
                        <button
                          onClick={() => downloadVariant(v)}
                          className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm"
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Remove Variant */}
                      {task.variants.length > 1 && (
                        <button
                          onClick={() => removeVariant(task.id, v.id)}
                          className="p-1 rounded text-zinc-500 hover:text-red-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
