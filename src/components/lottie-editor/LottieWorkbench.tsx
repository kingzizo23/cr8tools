import React, { useState } from 'react';
import { Palette, Minimize2, Download, Check, Sparkles } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { updateLottieColor, replaceLottieColorGlobal } from '../../core/editors/lottieColorEditor';
import { compressLottieJson } from '../../core/editors/lottieCompressor';
import { packDotLottie } from '../../core/parsers/dotLottieParser';
import { parseLottie, LottieColorItem } from '../../core/parsers/lottieParser';
import { createBlob } from '../../core/utils/blob';

export const LottieWorkbench: React.FC = () => {
  const { t } = useI18n();
  const { asset, lottieData, setLottieData } = useWorkspaceStore();

  const [roundDecimals, setRoundDecimals] = useState(true);
  const [stripMeta, setStripMeta] = useState(true);
  const [compressedNotice, setCompressedNotice] = useState<string | null>(null);

  if (!lottieData) return null;

  const colors: LottieColorItem[] = lottieData.colors || [];

  const handleColorChange = (colorItem: LottieColorItem, newHex: string) => {
    const updatedJson = updateLottieColor(lottieData.json, colorItem.path, newHex);
    const reParsed = parseLottie(updatedJson);
    setLottieData(reParsed);
  };

  const handleCompress = () => {
    const origStr = JSON.stringify(lottieData.json);
    const origSize = new Blob([origStr]).size;

    const compressed = compressLottieJson(lottieData.json, {
      roundDecimals: roundDecimals ? 2 : 6,
      removeMetadata: stripMeta,
    });

    const newStr = JSON.stringify(compressed);
    const newSize = new Blob([newStr]).size;
    const savings = Math.round(((origSize - newSize) / origSize) * 100);

    const reParsed = parseLottie(compressed);
    setLottieData(reParsed);
    setCompressedNotice(`Reduced by ${savings}% (${Math.round(origSize / 1024)} KB -> ${Math.round(newSize / 1024)} KB)`);
    setTimeout(() => setCompressedNotice(null), 4000);
  };

  const handleDownloadJson = () => {
    const jsonStr = JSON.stringify(lottieData.json, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${asset?.name.replace(/\.[^/.]+$/, '') || 'animation'}_optimized.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadDotLottie = () => {
    const zipBytes = packDotLottie(lottieData.json, asset?.name.replace(/\.[^/.]+$/, '') || 'animation');
    const blob = createBlob([zipBytes], { type: 'application/x-dotlottie' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${asset?.name.replace(/\.[^/.]+$/, '') || 'animation'}.lottie`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[#111114] border border-zinc-800/80 rounded-2xl p-4 flex flex-col gap-4 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2 text-zinc-100 font-bold text-sm">
          <Palette className="w-4 h-4 text-blue-400" />
          <span>{t.lottieEditor.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadDotLottie}
            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-blue-400 text-xs font-semibold flex items-center gap-1 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>.dotlottie</span>
          </button>
          <button
            onClick={handleDownloadJson}
            className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-blue-600/30 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Colors Grid */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-zinc-300">
          {t.lottieEditor.colorSwapper} ({colors.length})
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
          {colors.map((c) => (
            <div
              key={c.id}
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <input
                  type="color"
                  value={c.hex}
                  onChange={(e) => handleColorChange(c, e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 shrink-0"
                />
                <div className="flex flex-col min-w-0">
                  <span className="font-mono text-[11px] text-zinc-200">{c.hex}</span>
                  <span className="text-[10px] text-zinc-400 truncate" title={c.name}>
                    {c.shapeName || c.name}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Compression & Optimization */}
      <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl flex flex-col gap-2.5 text-xs">
        <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
          <Minimize2 className="w-3.5 h-3.5 text-blue-400" />
          {t.lottieEditor.compressJson}
        </span>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-1.5 cursor-pointer text-zinc-300">
            <input
              type="checkbox"
              checked={roundDecimals}
              onChange={(e) => setRoundDecimals(e.target.checked)}
              className="rounded bg-zinc-800 border-zinc-700 text-blue-600"
            />
            <span>{t.lottieEditor.roundDecimals}</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-zinc-300">
            <input
              type="checkbox"
              checked={stripMeta}
              onChange={(e) => setStripMeta(e.target.checked)}
              className="rounded bg-zinc-800 border-zinc-700 text-blue-600"
            />
            <span>{t.lottieEditor.stripMeta}</span>
          </label>
        </div>

        <button
          onClick={handleCompress}
          className="w-full mt-1 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-blue-400 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
        >
          <Check className="w-3.5 h-3.5" />
          <span>{t.lottieEditor.applyCompression}</span>
        </button>

        {compressedNotice && (
          <span className="text-[11px] text-emerald-400 font-semibold text-center mt-1 animate-pulse">
            {compressedNotice}
          </span>
        )}
      </div>
    </div>
  );
};
