import React, { useState } from 'react';
import { Wand2, Download, Image as ImageIcon, Feather, Sparkles } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { ImageAssetsPanel } from './ImageAssetsPanel';
import { AudioPanel } from './AudioPanel';
import { WatermarkModal } from './WatermarkModal';
import { CanvasFeatherModal } from './CanvasFeatherModal';
import { DynamicElementsModal } from './DynamicElementsModal';
import { packSvga } from '../../core/parsers/svgaParser';
import { createBlob } from '../../core/utils/blob';

export const SvgaEditorWorkbench: React.FC = () => {
  const { t } = useI18n();
  const { asset, svgaEntity, setSvgaEntity } = useWorkspaceStore();

  const [isWatermarkOpen, setIsWatermarkOpen] = useState(false);
  const [isFeatherOpen, setIsFeatherOpen] = useState(false);
  const [isDynamicOpen, setIsDynamicOpen] = useState(false);

  if (!svgaEntity) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-[#111114] border border-zinc-800 rounded-2xl">
        <Wand2 className="w-10 h-10 text-zinc-600 mb-3" />
        <h3 className="text-sm font-bold text-zinc-300">No SVGA Asset Loaded</h3>
        <p className="text-xs text-zinc-400 mt-1 max-w-sm">
          Load an SVGA 2.0 animation from the Motion Processing tab to unlock deep editing of images, audio, watermarks, and dynamic elements.
        </p>
      </div>
    );
  }

  const handleExportSvga = () => {
    try {
      const packedBytes = packSvga(svgaEntity);
      const blob = createBlob([packedBytes], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const cleanName = asset?.name.replace(/\.[^/.]+$/, '') || 'modified_asset';

      const a = document.createElement('a');
      a.href = url;
      a.download = `${cleanName}_edited.svga`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Export error: ${err.message || 'Failed to pack SVGA'}`);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Top Action Bar */}
      <div className="bg-[#111114] border border-zinc-800/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-blue-400" />
          <div>
            <h2 className="text-sm font-bold text-zinc-100">{t.svgaEditor.title}</h2>
            <span className="text-[11px] text-zinc-400">
              Direct Binary Editing & Resource Replacement
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Watermark Modal Trigger */}
          <button
            onClick={() => setIsWatermarkOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold border border-zinc-800 flex items-center gap-1.5 transition"
          >
            <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
            <span>{t.svgaEditor.watermark}</span>
          </button>

          {/* Feathering Trigger */}
          <button
            onClick={() => setIsFeatherOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold border border-zinc-800 flex items-center gap-1.5 transition"
          >
            <Feather className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t.svgaEditor.feathering}</span>
          </button>

          {/* Dynamic Elements Trigger */}
          <button
            onClick={() => setIsDynamicOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold border border-zinc-800 flex items-center gap-1.5 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>{t.svgaEditor.dynamicElements}</span>
          </button>

          {/* Export Modified SVGA */}
          <button
            onClick={handleExportSvga}
            className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition transform active:scale-98"
          >
            <Download className="w-4 h-4" />
            <span>{t.svgaEditor.exportModifiedSvga}</span>
          </button>
        </div>
      </div>

      {/* Main Editing Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-[#111114] border border-zinc-800/80 rounded-2xl p-4 shadow-xl">
          <div className="pb-3 mb-3 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-sm font-bold text-zinc-200">{t.svgaEditor.imageAssets}</span>
            <span className="text-xs text-zinc-400 font-mono">
              {Object.keys(svgaEntity.images || {}).length} Total
            </span>
          </div>
          <ImageAssetsPanel />
        </div>

        <div className="flex flex-col gap-5">
          <AudioPanel />
        </div>
      </div>

      {/* Modals */}
      <WatermarkModal
        isOpen={isWatermarkOpen}
        onClose={() => setIsWatermarkOpen(false)}
        entity={svgaEntity}
        onApply={(updated) => setSvgaEntity(updated)}
      />

      <CanvasFeatherModal
        isOpen={isFeatherOpen}
        onClose={() => setIsFeatherOpen(false)}
      />

      <DynamicElementsModal
        isOpen={isDynamicOpen}
        onClose={() => setIsDynamicOpen(false)}
      />
    </div>
  );
};
