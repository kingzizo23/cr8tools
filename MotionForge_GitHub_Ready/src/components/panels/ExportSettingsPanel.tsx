import React, { useState } from 'react';
import { Download, Sliders, Lock, Unlock, EyeOff, Layers, RefreshCw } from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useI18n } from '../../i18n';
import { getSupportedOutputs } from '../../core/converters/conversionMatrix';
import { runConversionPipeline } from '../../core/converters/pipelineRunner';
import { ExportFormat } from '../../core/types/motion';

export const ExportSettingsPanel: React.FC = () => {
  const { t } = useI18n();
  const {
    asset,
    exportConfig,
    updateExportConfig,
    aspectLocked,
    setAspectLocked,
  } = useWorkspaceStore();

  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);

  if (!asset) return null;

  const supportedFormats = getSupportedOutputs(asset.format);

  const handleConvert = async () => {
    if (!asset || isConverting) return;
    setIsConverting(true);
    setProgress(0);

    try {
      const result = await runConversionPipeline(asset, exportConfig, (pct) => {
        setProgress(pct);
      });

      // Trigger instant download
      const ext = exportConfig.format === 'ae-jsx' ? 'zip' : exportConfig.format;
      const cleanName = asset.name.replace(/\.[^/.]+$/, '');
      const downloadName = `${cleanName}_converted.${ext}`;

      const a = document.createElement('a');
      a.href = result.url;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Conversion failed:', err);
      alert(`Conversion error: ${err.message || 'Unknown error'}`);
    } finally {
      setIsConverting(false);
      setProgress(0);
    }
  };

  const isVideoSource =
    asset.format === 'mp4' || asset.format === 'mov' || asset.format === 'webm';
  const isDualChannelTarget =
    exportConfig.format === 'vap' ||
    exportConfig.format === 'yyeva' ||
    exportConfig.format === 'dual-channel';

  return (
    <div className="bg-[#111114] border border-zinc-800/80 rounded-xl p-4 flex flex-col gap-4 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2 text-zinc-100 font-bold text-sm">
          <Sliders className="w-4 h-4 text-blue-400" />
          <span>{t.export.title}</span>
        </div>
      </div>

      {/* Target Format Selector */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-zinc-300">
          {t.export.targetFormat}
        </label>
        <select
          value={exportConfig.format}
          onChange={(e) => updateExportConfig({ format: e.target.value as ExportFormat })}
          className="bg-zinc-900 border border-zinc-700/80 text-zinc-200 text-xs rounded-lg p-2 font-mono uppercase focus:ring-1 focus:ring-blue-500 focus:outline-none"
        >
          {supportedFormats.map((fmt) => (
            <option key={fmt} value={fmt}>
              {fmt.toUpperCase()}
            </option>
          ))}
        </select>
        {exportConfig.format === 'ae-jsx' && (
          <p className="text-[11px] text-blue-400/90 leading-tight">
            {t.export.aeJsxNote}
          </p>
        )}
      </div>

      {/* Dimensions (Width / Height / Aspect Lock) */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-zinc-300">
            {t.inspector.dimensions}
          </label>
          <button
            onClick={() => setAspectLocked(!aspectLocked)}
            className={`p-1 rounded text-xs transition flex items-center gap-1 ${
              aspectLocked ? 'text-blue-400 bg-blue-500/10' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title={t.export.lockAspect}
          >
            {aspectLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            <span className="text-[10px]">{aspectLocked ? 'Locked' : 'Unlocked'}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center bg-zinc-900 border border-zinc-700/80 rounded-lg px-2 py-1.5">
            <span className="text-[11px] text-zinc-400 mr-1.5">W:</span>
            <input
              type="number"
              min={16}
              max={3840}
              value={exportConfig.width}
              onChange={(e) => updateExportConfig({ width: parseInt(e.target.value, 10) || 100 })}
              className="bg-transparent font-mono text-xs text-zinc-200 w-full focus:outline-none"
            />
          </div>

          <div className="flex items-center bg-zinc-900 border border-zinc-700/80 rounded-lg px-2 py-1.5">
            <span className="text-[11px] text-zinc-400 mr-1.5">H:</span>
            <input
              type="number"
              min={16}
              max={3840}
              value={exportConfig.height}
              onChange={(e) => updateExportConfig({ height: parseInt(e.target.value, 10) || 100 })}
              className="bg-transparent font-mono text-xs text-zinc-200 w-full focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* FPS & Quality */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-zinc-300 flex justify-between">
            <span>{t.export.fps}</span>
            <span className="font-mono text-blue-400">{exportConfig.fps}</span>
          </label>
          <input
            type="range"
            min={10}
            max={60}
            step={1}
            value={exportConfig.fps}
            onChange={(e) => updateExportConfig({ fps: parseInt(e.target.value, 10) })}
            className="h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-zinc-300 flex justify-between">
            <span>{t.export.quality}</span>
            <span className="font-mono text-blue-400">{exportConfig.quality}%</span>
          </label>
          <input
            type="range"
            min={20}
            max={100}
            step={5}
            value={exportConfig.quality}
            onChange={(e) => updateExportConfig({ quality: parseInt(e.target.value, 10) })}
            className="h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      </div>

      {/* Mirror Transformations */}
      <div className="flex items-center gap-4 pt-1">
        <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
          <input
            type="checkbox"
            checked={exportConfig.mirrorX}
            onChange={(e) => updateExportConfig({ mirrorX: e.target.checked })}
            className="rounded bg-zinc-800 border-zinc-700 text-blue-600 focus:ring-0 cursor-pointer"
          />
          <span>{t.export.mirrorHorizontal}</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
          <input
            type="checkbox"
            checked={exportConfig.mirrorY}
            onChange={(e) => updateExportConfig({ mirrorY: e.target.checked })}
            className="rounded bg-zinc-800 border-zinc-700 text-blue-600 focus:ring-0 cursor-pointer"
          />
          <span>{t.export.mirrorVertical}</span>
        </label>
      </div>

      {/* Black Background Removal (for MP4 / standard videos) */}
      {isVideoSource && (
        <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/80 flex flex-col gap-2.5">
          <label className="flex items-center justify-between cursor-pointer text-xs font-semibold text-zinc-200">
            <span className="flex items-center gap-1.5">
              <EyeOff className="w-3.5 h-3.5 text-blue-400" />
              {t.export.removeBlackBg}
            </span>
            <input
              type="checkbox"
              checked={exportConfig.removeBlackBg}
              onChange={(e) => updateExportConfig({ removeBlackBg: e.target.checked })}
              className="rounded bg-zinc-800 border-zinc-700 text-blue-600 focus:ring-0 cursor-pointer"
            />
          </label>

          {exportConfig.removeBlackBg && (
            <div className="flex flex-col gap-2 pt-1 border-t border-zinc-800/60 text-xs">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-zinc-400 flex justify-between">
                  <span>{t.export.blackThreshold}</span>
                  <span className="font-mono text-zinc-300">
                    {Math.round((exportConfig.blackBgThreshold ?? 0.05) * 100)}%
                  </span>
                </span>
                <input
                  type="range"
                  min={0.01}
                  max={0.4}
                  step={0.01}
                  value={exportConfig.blackBgThreshold ?? 0.05}
                  onChange={(e) => updateExportConfig({ blackBgThreshold: parseFloat(e.target.value) })}
                  className="h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-zinc-400 flex justify-between">
                  <span>{t.export.blackSoftness}</span>
                  <span className="font-mono text-zinc-300">
                    {Math.round((exportConfig.blackBgSoftness ?? 0.15) * 100)}%
                  </span>
                </span>
                <input
                  type="range"
                  min={0.02}
                  max={0.5}
                  step={0.01}
                  value={exportConfig.blackBgSoftness ?? 0.15}
                  onChange={(e) => updateExportConfig({ blackBgSoftness: parseFloat(e.target.value) })}
                  className="h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dual Channel Layout Selector (if output is VAP / YYEVA / Dual-Channel) */}
      {isDualChannelTarget && (
        <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/80 flex flex-col gap-2">
          <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            {t.export.dualLayout}
          </label>
          <select
            value={exportConfig.dualChannelLayout || 'alpha-left'}
            onChange={(e) => updateExportConfig({ dualChannelLayout: e.target.value as any })}
            className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs rounded-lg p-1.5 focus:outline-none"
          >
            <option value="alpha-left">{t.export.alphaLeft}</option>
            <option value="rgb-left">{t.export.rgbLeft}</option>
            <option value="top-bottom">{t.export.topBottom}</option>
          </select>
        </div>
      )}

      {/* Convert & Download Button */}
      <div className="pt-2">
        <button
          onClick={handleConvert}
          disabled={isConverting}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-98"
        >
          {isConverting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>{t.export.converting} {progress}%</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>{t.export.convertBtn}</span>
            </>
          )}
        </button>

        {isConverting && (
          <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
