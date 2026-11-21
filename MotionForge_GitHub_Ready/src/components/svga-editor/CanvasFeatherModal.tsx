import React, { useState } from 'react';
import { X, Feather, Check } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useWorkspaceStore } from '../../store/workspaceStore';

interface CanvasFeatherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CanvasFeatherModal: React.FC<CanvasFeatherModalProps> = ({ isOpen, onClose }) => {
  const { t } = useI18n();
  const { exportConfig, updateExportConfig } = useWorkspaceStore();

  const current = exportConfig.canvasFeather || {
    enabled: false,
    top: 20,
    bottom: 20,
    left: 20,
    right: 20,
    softness: 0.8,
  };

  const [enabled, setEnabled] = useState(current.enabled);
  const [top, setTop] = useState(current.top);
  const [bottom, setBottom] = useState(current.bottom);
  const [left, setLeft] = useState(current.left);
  const [right, setRight] = useState(current.right);
  const [softness, setSoftness] = useState(current.softness);

  if (!isOpen) return null;

  const handleApply = () => {
    updateExportConfig({
      canvasFeather: {
        enabled,
        top,
        bottom,
        left,
        right,
        softness,
      },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#111114] border border-zinc-800 rounded-2xl w-full max-w-md p-5 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-100 font-bold text-sm">
            <Feather className="w-4 h-4 text-blue-400" />
            <span>{t.svgaEditor.feathering}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800 cursor-pointer">
          <span className="text-xs font-semibold text-zinc-200">Enable Canvas Feather Mask</span>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="rounded bg-zinc-800 border-zinc-700 text-blue-600 focus:ring-0 cursor-pointer"
          />
        </label>

        {enabled && (
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex flex-col gap-1">
              <span className="text-zinc-300 flex justify-between">
                <span>{t.svgaEditor.featherTop}</span>
                <span className="font-mono text-blue-400">{top}px</span>
              </span>
              <input
                type="range"
                min={0}
                max={150}
                value={top}
                onChange={(e) => setTop(parseInt(e.target.value, 10))}
                className="h-1.5 bg-zinc-800 rounded appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-zinc-300 flex justify-between">
                <span>{t.svgaEditor.featherBottom}</span>
                <span className="font-mono text-blue-400">{bottom}px</span>
              </span>
              <input
                type="range"
                min={0}
                max={150}
                value={bottom}
                onChange={(e) => setBottom(parseInt(e.target.value, 10))}
                className="h-1.5 bg-zinc-800 rounded appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-zinc-300 flex justify-between">
                <span>{t.svgaEditor.featherLeft}</span>
                <span className="font-mono text-blue-400">{left}px</span>
              </span>
              <input
                type="range"
                min={0}
                max={150}
                value={left}
                onChange={(e) => setLeft(parseInt(e.target.value, 10))}
                className="h-1.5 bg-zinc-800 rounded appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-zinc-300 flex justify-between">
                <span>{t.svgaEditor.featherRight}</span>
                <span className="font-mono text-blue-400">{right}px</span>
              </span>
              <input
                type="range"
                min={0}
                max={150}
                value={right}
                onChange={(e) => setRight(parseInt(e.target.value, 10))}
                className="h-1.5 bg-zinc-800 rounded appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            <div className="col-span-2 flex flex-col gap-1 pt-1 border-t border-zinc-800">
              <span className="text-zinc-300 flex justify-between">
                <span>{t.svgaEditor.featherSoftness}</span>
                <span className="font-mono text-blue-400">{Math.round(softness * 100)}%</span>
              </span>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={softness}
                onChange={(e) => setSoftness(parseFloat(e.target.value))}
                className="h-1.5 bg-zinc-800 rounded appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1"
          >
            <Check className="w-4 h-4" />
            <span>Apply</span>
          </button>
        </div>
      </div>
    </div>
  );
};
