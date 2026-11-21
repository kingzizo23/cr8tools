import React from 'react';
import { Info, AlertTriangle, CheckCircle2, XCircle, HardDrive, Cpu, Film, Music } from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useI18n } from '../../i18n';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export const FileInfoInspector: React.FC = () => {
  const { t } = useI18n();
  const { asset } = useWorkspaceStore();

  if (!asset) return null;

  const ramMb = asset.estimatedRamBytes / (1024 * 1024);
  const isHighRam = ramMb > 100;

  return (
    <div className="bg-[#111114] border border-zinc-800/80 rounded-xl p-4 flex flex-col gap-4 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2 text-zinc-100 font-bold text-sm">
          <Info className="w-4 h-4 text-blue-400" />
          <span>{t.inspector.title}</span>
        </div>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase">
          {asset.format}
        </span>
      </div>

      {/* Grid of properties */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        {/* Dimensions */}
        <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/60">
          <span className="text-zinc-400 block text-[11px]">{t.inspector.dimensions}</span>
          <span className="font-mono font-bold text-zinc-200 mt-0.5 block">
            {asset.width} × {asset.height} px
          </span>
        </div>

        {/* File Size */}
        <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/60">
          <span className="text-zinc-400 block text-[11px] flex items-center gap-1">
            <HardDrive className="w-3 h-3 text-zinc-400" />
            {t.inspector.fileSize}
          </span>
          <span className="font-mono font-bold text-zinc-200 mt-0.5 block">
            {formatBytes(asset.size)}
          </span>
        </div>

        {/* Total Frames & FPS */}
        <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/60">
          <span className="text-zinc-400 block text-[11px] flex items-center gap-1">
            <Film className="w-3 h-3 text-zinc-400" />
            {t.inspector.totalFrames}
          </span>
          <span className="font-mono font-bold text-zinc-200 mt-0.5 block">
            {asset.totalFrames} f @ {asset.fps} FPS
          </span>
        </div>

        {/* Duration */}
        <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/60">
          <span className="text-zinc-400 block text-[11px]">{t.inspector.duration}</span>
          <span className="font-mono font-bold text-zinc-200 mt-0.5 block">
            {asset.duration.toFixed(2)}s
          </span>
        </div>

        {/* Alpha Transparency */}
        <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/60 flex items-center justify-between">
          <span className="text-zinc-400 text-[11px]">{t.inspector.alphaChannel}</span>
          {asset.hasAlpha ? (
            <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" /> {t.inspector.yes}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-zinc-400 font-semibold text-[11px]">
              <XCircle className="w-3.5 h-3.5" /> {t.inspector.no}
            </span>
          )}
        </div>

        {/* Audio Track */}
        <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/60 flex items-center justify-between">
          <span className="text-zinc-400 text-[11px] flex items-center gap-1">
            <Music className="w-3 h-3 text-zinc-400" />
            {t.inspector.audioTrack}
          </span>
          {asset.hasAudio ? (
            <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" /> {t.inspector.yes}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-zinc-400 font-semibold text-[11px]">
              <XCircle className="w-3.5 h-3.5" /> {t.inspector.no}
            </span>
          )}
        </div>
      </div>

      {/* Estimated Decoded RAM Gauge */}
      <div className={`p-3 rounded-lg border ${
        isHighRam ? 'bg-amber-500/10 border-amber-500/30' : 'bg-zinc-900/60 border-zinc-800/60'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            {t.inspector.estimatedRam}
          </span>
          <span className={`font-mono font-bold text-xs ${isHighRam ? 'text-amber-400' : 'text-zinc-200'}`}>
            ~{ramMb.toFixed(1)} MB
          </span>
        </div>

        {isHighRam && (
          <div className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <span>{t.inspector.ramWarning}</span>
          </div>
        )}
      </div>
    </div>
  );
};
