import React, { useState } from 'react';
import { SlidersHorizontal, Check } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useBatchStore } from '../../store/batchStore';
import { ExportConfig } from '../../core/types/motion';

export const SharedSettingsPanel: React.FC = () => {
  const { t } = useI18n();
  const { tasks, applySharedConfig } = useBatchStore();

  const selectedTasks = tasks.filter((t) => t.selected);
  const selectedCount = selectedTasks.length;

  const [width, setWidth] = useState<number>(512);
  const [height, setHeight] = useState<number>(512);
  const [fps, setFps] = useState<number>(30);
  const [quality, setQuality] = useState<number>(85);
  const [mirrorX, setMirrorX] = useState<boolean>(false);
  const [mirrorY, setMirrorY] = useState<boolean>(false);

  if (selectedCount === 0) return null;

  const handleApply = () => {
    const partial: Partial<ExportConfig> = {
      width,
      height,
      fps,
      quality,
      mirrorX,
      mirrorY,
    };
    applySharedConfig(partial);
  };

  return (
    <div className="bg-blue-600/10 border border-blue-500/30 rounded-2xl p-4 flex flex-col gap-3 shadow-lg animate-in fade-in duration-150">
      <div className="flex items-center justify-between pb-2 border-b border-blue-500/20">
        <div className="flex items-center gap-2 text-blue-300 font-bold text-xs sm:text-sm">
          <SlidersHorizontal className="w-4 h-4 text-blue-400" />
          <span>{t.batch.sharedSettings}</span>
          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
            {selectedCount} Tasks
          </span>
        </div>

        <button
          onClick={handleApply}
          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition"
        >
          <Check className="w-3.5 h-3.5" />
          <span>{t.batch.applyToSelected}</span>
        </button>
      </div>

      {/* Grid of Shared Controls */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="flex flex-col gap-1">
          <label className="text-zinc-300 font-semibold">{t.export.width}</label>
          <input
            type="number"
            value={width}
            onChange={(e) => setWidth(parseInt(e.target.value, 10) || 100)}
            className="bg-zinc-900 border border-zinc-700/80 rounded-lg p-1.5 text-zinc-100 font-mono text-xs focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-zinc-300 font-semibold">{t.export.height}</label>
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(parseInt(e.target.value, 10) || 100)}
            className="bg-zinc-900 border border-zinc-700/80 rounded-lg p-1.5 text-zinc-100 font-mono text-xs focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-zinc-300 font-semibold flex justify-between">
            <span>{t.export.fps}</span>
            <span className="font-mono text-blue-400">{fps}</span>
          </label>
          <input
            type="range"
            min={10}
            max={60}
            value={fps}
            onChange={(e) => setFps(parseInt(e.target.value, 10))}
            className="h-1.5 bg-zinc-800 rounded appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-zinc-300 font-semibold flex justify-between">
            <span>{t.export.quality}</span>
            <span className="font-mono text-blue-400">{quality}%</span>
          </label>
          <input
            type="range"
            min={20}
            max={100}
            step={5}
            value={quality}
            onChange={(e) => setQuality(parseInt(e.target.value, 10))}
            className="h-1.5 bg-zinc-800 rounded appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      </div>
    </div>
  );
};
