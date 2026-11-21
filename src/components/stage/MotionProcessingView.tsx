import React, { useRef } from 'react';
import { Upload, Film, Sparkles, X } from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useI18n } from '../../i18n';
import { PreviewCanvas } from './PreviewCanvas';
import { TimelineBar } from './TimelineBar';
import { FileInfoInspector } from '../panels/FileInfoInspector';
import { ExportSettingsPanel } from '../panels/ExportSettingsPanel';
import { LottieWorkbench } from '../lottie-editor/LottieWorkbench';

export const MotionProcessingView: React.FC = () => {
  const { t } = useI18n();
  const { asset, loadAssetFromFile, clearAsset, isLoading, loadError } = useWorkspaceStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      loadAssetFromFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadAssetFromFile(file);
    }
  };

  if (!asset) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-140px)] p-4 max-w-4xl mx-auto w-full">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-zinc-800 hover:border-blue-500/60 rounded-3xl p-12 sm:p-16 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 bg-[#111114]/60 hover:bg-[#111114] group shadow-2xl relative overflow-hidden"
        >
          {/* Subtle glow background */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-blue-600/20 group-hover:border-blue-500/40 transition-all shadow-lg">
            <Upload className="w-10 h-10 text-zinc-400 group-hover:text-blue-400 transition-colors" />
          </div>

          <h2 className="text-lg sm:text-xl font-extrabold text-zinc-100 mb-2 tracking-tight">
            {t.hero.title}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mb-6 leading-relaxed">
            {t.hero.subtitle}
          </p>

          <div className="px-5 py-2.5 rounded-xl bg-blue-600 group-hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-600/30 flex items-center gap-2 transition transform active:scale-95">
            <Upload className="w-4 h-4" />
            <span>{t.hero.dropPrompt}</span>
          </div>

          <div className="mt-8 pt-6 border-t border-zinc-800/80 w-full flex flex-col items-center gap-2 text-[11px] text-zinc-400">
            <span className="font-mono text-zinc-400">{t.hero.formatsList}</span>
            <span className="text-zinc-400">{t.hero.privacyNote}</span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            className="sr-only"
          />
        </div>

        {loadError && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
            {loadError}
          </div>
        )}
      </div>
    );
  }

  const isLottie = asset.format === 'lottie' || asset.format === 'dotlottie';

  return (
    <div className="flex flex-col gap-4">
      {/* File Action Top Bar */}
      <div className="bg-[#111114] border border-zinc-800/80 rounded-xl px-4 py-2.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <Film className="w-4 h-4 text-blue-400 shrink-0" />
          <span className="font-bold text-xs sm:text-sm text-zinc-100 truncate max-w-sm sm:max-w-md">
            {asset.name}
          </span>
          <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
            {asset.format}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-800 transition"
          >
            Open Another
          </button>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            className="sr-only"
          />

          <button
            onClick={clearAsset}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition"
            title="Close File"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3-Column Studio Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (3 of 12): Inspector + Lottie Workbench */}
        <div className="lg:col-span-3 flex flex-col gap-4 order-2 lg:order-1">
          <FileInfoInspector />
          {isLottie && <LottieWorkbench />}
        </div>

        {/* Center Column (6 of 12): Interactive Stage & Timeline */}
        <div className="lg:col-span-6 flex flex-col gap-3 order-1 lg:order-2">
          <div className="w-full aspect-[4/3] max-h-[540px]">
            <PreviewCanvas />
          </div>
          <TimelineBar />
        </div>

        {/* Right Column (3 of 12): Export & Conversion Settings */}
        <div className="lg:col-span-3 flex flex-col gap-4 order-3">
          <ExportSettingsPanel />
        </div>
      </div>
    </div>
  );
};
