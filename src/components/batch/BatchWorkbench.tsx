import React, { useRef, useEffect } from 'react';
import {
  Upload,
  FolderOpen,
  Play,
  Pause,
  RotateCcw,
  Download,
  Trash2,
  CheckSquare,
  Square,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { useI18n } from '../../i18n';
import { useBatchStore } from '../../store/batchStore';
import { TaskTable } from './TaskTable';
import { SharedSettingsPanel } from './SharedSettingsPanel';
import { CompareModal } from '../stage/CompareModal';

export const BatchWorkbench: React.FC = () => {
  const { t } = useI18n();
  const {
    tasks,
    addFiles,
    clearAll,
    selectAllTasks,
    queueStatus,
    startQueue,
    pauseQueue,
    resumeQueue,
    cancelQueue,
    retryFailed,
    downloadAllZip,
  } = useBatchStore();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const totalTasks = tasks.length;
  const totalVariants = tasks.reduce((acc, t) => acc + t.variants.length, 0);
  const completedVariants = tasks.reduce(
    (acc, t) => acc + t.variants.filter((v) => v.status === 'done').length,
    0
  );
  const failedVariants = tasks.reduce(
    (acc, t) => acc + t.variants.filter((v) => v.status === 'failed').length,
    0
  );
  const allSelected = totalTasks > 0 && tasks.every((t) => t.selected);

  // Beforeunload warning if running or undownloaded items exist
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (queueStatus === 'running' || completedVariants > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [queueStatus, completedVariants]);

  const handleFilesChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Workbench Header & Stats */}
      <div className="bg-[#111114] border border-zinc-800/80 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-zinc-100">{t.batch.title}</h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              100% Free • No PRO Limits
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            {t.batch.subtitle}
          </p>
        </div>

        {/* Top Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* File Picker */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold border border-zinc-800 flex items-center gap-1.5 transition shadow-sm"
          >
            <Upload className="w-3.5 h-3.5 text-blue-400" />
            <span>{t.batch.addFiles}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFilesChosen}
            className="sr-only"
          />

          {/* Folder Picker */}
          <button
            onClick={() => folderInputRef.current?.click()}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold border border-zinc-800 flex items-center gap-1.5 transition shadow-sm"
          >
            <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span>{t.batch.addFolder}</span>
          </button>
          <input
            ref={folderInputRef}
            type="file"
            multiple
            // @ts-ignore
            webkitdirectory="true"
            onChange={handleFilesChosen}
            className="sr-only"
          />

          {totalTasks > 0 && (
            <button
              onClick={clearAll}
              className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 text-xs font-semibold border border-zinc-800 transition"
              title={t.batch.clearAll}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Memory Warning if > 100 files */}
      {totalTasks > 100 && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-2 text-xs text-amber-300">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Large batch ({totalTasks} files). Conversion queue runs concurrently in 2 workers to keep your browser fast and responsive.</span>
        </div>
      )}

      {/* Queue Controller Bar (when files exist) */}
      {totalTasks > 0 && (
        <div className="bg-[#111114] border border-zinc-800/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
          {/* Select All & Counts */}
          <div className="flex items-center gap-4 text-xs">
            <button
              onClick={() => selectAllTasks(!allSelected)}
              className="flex items-center gap-1.5 text-zinc-300 hover:text-white font-medium"
            >
              {allSelected ? (
                <CheckSquare className="w-4 h-4 text-blue-400" />
              ) : (
                <Square className="w-4 h-4 text-zinc-600" />
              )}
              <span>Select All</span>
            </button>

            <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-400">
              <span className="text-zinc-200 font-bold">{totalTasks}</span> {t.batch.tasksCount}
              <span>•</span>
              <span className="text-blue-400 font-bold">{totalVariants}</span> {t.batch.variantsCount}
              {completedVariants > 0 && (
                <>
                  <span>•</span>
                  <span className="text-emerald-400 font-bold">{completedVariants} Done</span>
                </>
              )}
            </div>
          </div>

          {/* Queue Execution Controls */}
          <div className="flex items-center gap-2">
            {failedVariants > 0 && queueStatus !== 'running' && (
              <button
                onClick={retryFailed}
                className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30 flex items-center gap-1.5 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t.batch.retryFailed}</span>
              </button>
            )}

            {queueStatus === 'running' ? (
              <button
                onClick={pauseQueue}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/30 flex items-center gap-1.5 transition"
              >
                <Pause className="w-4 h-4" />
                <span>{t.batch.pauseQueue}</span>
              </button>
            ) : queueStatus === 'paused' ? (
              <button
                onClick={resumeQueue}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{t.batch.resumeQueue}</span>
              </button>
            ) : (
              <button
                onClick={startQueue}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-1.5 transition transform active:scale-98"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{t.batch.startQueue}</span>
              </button>
            )}

            {completedVariants > 0 && (
              <button
                onClick={downloadAllZip}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition"
              >
                <Download className="w-4 h-4" />
                <span>{t.batch.downloadZip}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Shared Settings (shown when multiple tasks are selected) */}
      <SharedSettingsPanel />

      {/* Task List or Empty Dropzone */}
      {totalTasks === 0 ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              addFiles(Array.from(e.dataTransfer.files));
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-zinc-800 hover:border-blue-500/60 rounded-3xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 bg-[#111114]/50 hover:bg-[#111114] group"
        >
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-blue-600/20 transition-all border border-zinc-800">
            <Upload className="w-8 h-8 text-zinc-500 group-hover:text-blue-400 transition-colors" />
          </div>
          <h3 className="text-sm font-bold text-zinc-200 mb-1">{t.hero.dropPrompt}</h3>
          <p className="text-xs text-zinc-400 max-w-md">{t.hero.formatsList}</p>
          <span className="text-[11px] text-zinc-400 mt-4 flex items-center gap-1">
            {t.hero.privacyNote}
          </span>
        </div>
      ) : (
        <TaskTable />
      )}

      {/* Compare Modal */}
      <CompareModal />
    </div>
  );
};
