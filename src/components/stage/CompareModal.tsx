import React, { useRef, useState } from 'react';
import { X, RotateCcw, CheckCircle2, TrendingDown } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useBatchStore } from '../../store/batchStore';

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export const CompareModal: React.FC = () => {
  const { t } = useI18n();
  const { comparingVariant, closeCompareModal } = useBatchStore();

  const originalVideoRef = useRef<HTMLVideoElement | null>(null);
  const variantVideoRef = useRef<HTMLVideoElement | null>(null);

  const [replayKey, setReplayKey] = useState(0);

  if (!comparingVariant) return null;

  const { task, variant } = comparingVariant;
  const origAsset = task.asset;

  const origSize = origAsset.size;
  const newSize = variant.outputSize || 0;
  const savingsPct =
    origSize > 0 && newSize > 0 ? Math.round(((origSize - newSize) / origSize) * 100) : 0;

  const handleSyncReplay = () => {
    setReplayKey((k) => k + 1);
    if (originalVideoRef.current) {
      originalVideoRef.current.currentTime = 0;
      originalVideoRef.current.play();
    }
    if (variantVideoRef.current) {
      variantVideoRef.current.currentTime = 0;
      variantVideoRef.current.play();
    }
  };

  const isOrigVideo =
    origAsset.format === 'mp4' || origAsset.format === 'webm' || origAsset.format === 'mov';
  const isVarVideo =
    variant.config.format === 'mp4' ||
    variant.config.format === 'webm' ||
    variant.config.format === 'mov' ||
    variant.config.format === 'vap' ||
    variant.config.format === 'yyeva' ||
    variant.config.format === 'dual-channel';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#111114] border border-zinc-800 rounded-2xl w-full max-w-4xl p-6 shadow-2xl flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-bold text-zinc-100">{t.compare.title}</h3>
            {savingsPct > 0 && (
              <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <TrendingDown className="w-3.5 h-3.5" />
                {t.batch.savingLabel}: -{savingsPct}%
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncReplay}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
              <span>{t.compare.syncReplay}</span>
            </button>

            <button
              onClick={closeCompareModal}
              className="p-1 rounded-lg text-zinc-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Side-by-Side Visual Viewport */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Original Viewport */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-300">{t.compare.original}</span>
              <span className="text-[11px] font-mono text-zinc-400 uppercase">{origAsset.format}</span>
            </div>
            <div className="h-64 bg-checkerboard rounded-xl border border-zinc-800 flex items-center justify-center p-2 overflow-hidden">
              {isOrigVideo ? (
                <video
                  ref={originalVideoRef}
                  key={`orig_${replayKey}`}
                  src={origAsset.objectUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <img
                  key={`orig_img_${replayKey}`}
                  src={origAsset.objectUrl}
                  alt="Original"
                  className="max-h-full max-w-full object-contain drop-shadow"
                />
              )}
            </div>
          </div>

          {/* Variant Viewport */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-300">{t.compare.variant}</span>
              <span className="text-[11px] font-mono text-blue-400 font-bold uppercase">
                {variant.config.format}
              </span>
            </div>
            <div className="h-64 bg-checkerboard rounded-xl border border-blue-500/30 flex items-center justify-center p-2 overflow-hidden shadow-inner">
              {variant.outputUrl && (
                isVarVideo ? (
                  <video
                    ref={variantVideoRef}
                    key={`var_${replayKey}`}
                    src={variant.outputUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <img
                    key={`var_img_${replayKey}`}
                    src={variant.outputUrl}
                    alt="Variant"
                    className="max-h-full max-w-full object-contain drop-shadow"
                  />
                )
              )}
            </div>
          </div>
        </div>

        {/* Comparison Metrics Table */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-hidden text-xs">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-800 text-[11px] text-zinc-400 font-semibold bg-zinc-900/40">
                <th className="p-3">Metric</th>
                <th className="p-3">{t.compare.original}</th>
                <th className="p-3">{t.compare.variant}</th>
                <th className="p-3">Difference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono text-zinc-300">
              <tr>
                <td className="p-3 text-zinc-400 font-sans font-medium">{t.compare.dimensions}</td>
                <td className="p-3">{origAsset.width} × {origAsset.height} px</td>
                <td className="p-3 text-blue-400">{variant.config.width} × {variant.config.height} px</td>
                <td className="p-3 text-zinc-400">
                  {variant.config.width === origAsset.width && variant.config.height === origAsset.height
                    ? 'Same'
                    : `${variant.config.width - origAsset.width} × ${variant.config.height - origAsset.height} px`}
                </td>
              </tr>
              <tr>
                <td className="p-3 text-zinc-400 font-sans font-medium">{t.compare.fileSize}</td>
                <td className="p-3">{formatBytes(origSize)}</td>
                <td className="p-3 text-emerald-400 font-bold">{formatBytes(newSize)}</td>
                <td className="p-3">
                  <span className={`font-bold ${savingsPct > 0 ? 'text-emerald-400' : 'text-zinc-400'}`}>
                    {savingsPct > 0 ? `-${savingsPct}%` : '0%'}
                  </span>
                </td>
              </tr>
              <tr>
                <td className="p-3 text-zinc-400 font-sans font-medium">{t.compare.fps}</td>
                <td className="p-3">{origAsset.fps} FPS</td>
                <td className="p-3 text-blue-400">{variant.config.fps} FPS</td>
                <td className="p-3 text-zinc-400">
                  {variant.config.fps === origAsset.fps ? 'Same' : `${variant.config.fps - origAsset.fps} FPS`}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
