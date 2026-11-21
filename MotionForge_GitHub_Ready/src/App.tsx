import React, { useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import { MotionProcessingView } from './components/stage/MotionProcessingView';
import { SvgaEditorWorkbench } from './components/svga-editor/SvgaEditorWorkbench';
import { BatchWorkbench } from './components/batch/BatchWorkbench';
import { useWorkspaceStore } from './store/workspaceStore';
import { useBatchStore } from './store/batchStore';
import { useI18n } from './i18n';

export const App: React.FC = () => {
  const { activeTab, loadAssetFromFile } = useWorkspaceStore();
  const { addFiles } = useBatchStore();
  const { language } = useI18n();

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  // Window drag & drop handler
  const handleWindowDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    if (activeTab === 'batch') {
      addFiles(Array.from(files));
    } else {
      loadAssetFromFile(files[0]);
    }
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleWindowDrop}
      className="min-h-screen bg-[#09090B] text-zinc-100 flex flex-col font-sans"
    >
      <Navbar />

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6">
        {activeTab === 'processing' && <MotionProcessingView />}
        {activeTab === 'svga-editor' && <SvgaEditorWorkbench />}
        {activeTab === 'batch' && <BatchWorkbench />}
      </main>

      <footer className="h-12 border-t border-zinc-800/60 bg-[#0d0d11] text-[11px] text-zinc-400 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-300">MotionForge</span>
          <span>•</span>
          <span>100% Client-Side Web Workspace</span>
          <span>•</span>
          <span>Zero Server Uploads</span>
        </div>
        <div className="flex items-center gap-3">
          <span>SVGA • Lottie • VAP • YYEVA • Dual-Channel • WebP • APNG • GIF • AE JSX</span>
        </div>
      </footer>
    </div>
  );
};
