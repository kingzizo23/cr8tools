import React, { useState } from 'react';
import { Search, Upload, Type, Feather, Edit2, Trash2, Download, CheckSquare, Square } from 'lucide-react';
import * as fflate from 'fflate';
import { useI18n } from '../../i18n';
import { useWorkspaceStore } from '../../store/workspaceStore';
import {
  replaceSvgaImage,
  renameSvgaImageKey,
  deleteSvgaImageKey,
  featherImageAsset,
} from '../../core/editors/svgaAssetEditor';
import { uint8ArrayToDataUrl } from '../../core/parsers/svgaParser';
import { TextToImageModal } from './TextToImageModal';

export const ImageAssetsPanel: React.FC = () => {
  const { t } = useI18n();
  const { svgaEntity, setSvgaEntity } = useWorkspaceStore();

  const [search, setSearch] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [activeTextModalKey, setActiveTextModalKey] = useState<string | null>(null);

  if (!svgaEntity || !svgaEntity.images) {
    return (
      <div className="p-6 text-center text-xs text-zinc-400 bg-[#111114] rounded-xl border border-zinc-800">
        {t.svgaEditor.noImagesFound}
      </div>
    );
  }

  const imageEntries = Object.entries(svgaEntity.images as { [key: string]: Uint8Array });
  const filteredEntries = imageEntries.filter(([key]) =>
    key.toLowerCase().includes(search.toLowerCase())
  );

  const handleFileReplace = (key: string, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const bytes = new Uint8Array(reader.result as ArrayBuffer);
      const updated = replaceSvgaImage(svgaEntity, key, bytes);
      setSvgaEntity(updated);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleRename = (oldKey: string) => {
    const newKey = prompt(`Enter new key name for '${oldKey}':`, oldKey);
    if (newKey && newKey.trim() && newKey !== oldKey) {
      const updated = renameSvgaImageKey(svgaEntity, oldKey, newKey.trim());
      setSvgaEntity(updated);
    }
  };

  const handleDelete = (key: string) => {
    if (confirm(`Delete image asset '${key}'?`)) {
      const updated = deleteSvgaImageKey(svgaEntity, key);
      setSvgaEntity(updated);
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleFeather = async (key: string) => {
    const rawBytes = svgaEntity.images[key];
    if (!rawBytes) return;
    const feathered = await featherImageAsset(rawBytes, 20);
    const updated = replaceSvgaImage(svgaEntity, key, feathered);
    setSvgaEntity(updated);
  };

  const handleToggleSelect = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleDownloadAllZip = () => {
    const files: { [key: string]: Uint8Array } = {};
    for (const [key, bytes] of imageEntries) {
      const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
      const ext = isJpeg ? 'jpg' : 'png';
      files[`${key}.${ext}`] = bytes;
    }
    const zipBytes = fflate.zipSync(files, { level: 6 });
    const blob = new Blob([zipBytes], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `svga_images_${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleBatchDelete = () => {
    if (selectedKeys.size === 0) return;
    if (confirm(`Delete ${selectedKeys.size} selected image assets?`)) {
      let current = svgaEntity;
      selectedKeys.forEach((key) => {
        current = deleteSvgaImageKey(current, key);
      });
      setSvgaEntity(current);
      setSelectedKeys(new Set());
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Search & Actions Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search assets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <button
          onClick={handleDownloadAllZip}
          className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-800 flex items-center gap-1.5 transition shrink-0"
          title={t.svgaEditor.downloadAllImages}
        >
          <Download className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline">ZIP</span>
        </button>
      </div>

      {/* Batch Selection Banner */}
      {selectedKeys.size > 0 && (
        <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center justify-between text-xs">
          <span className="text-blue-300 font-semibold">
            {selectedKeys.size} assets selected
          </span>
          <button
            onClick={handleBatchDelete}
            className="px-2 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded font-semibold flex items-center gap-1 transition"
          >
            <Trash2 className="w-3 h-3" />
            Delete Selected
          </button>
        </div>
      )}

      {/* Images Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
        {filteredEntries.map(([key, rawBytes]) => {
          const isJpeg = rawBytes[0] === 0xff && rawBytes[1] === 0xd8;
          const mime = isJpeg ? 'image/jpeg' : 'image/png';
          const dataUrl = uint8ArrayToDataUrl(rawBytes, mime);
          const isSelected = selectedKeys.has(key);

          return (
            <div
              key={key}
              className={`p-2.5 rounded-xl border transition flex flex-col gap-2 ${
                isSelected ? 'bg-blue-500/5 border-blue-500/40' : 'bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700'
              }`}
            >
              {/* Header with checkbox & key */}
              <div className="flex items-center justify-between gap-1">
                <button
                  onClick={() => handleToggleSelect(key)}
                  className="text-zinc-400 hover:text-white"
                >
                  {isSelected ? (
                    <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-zinc-600" />
                  )}
                </button>
                <span className="font-mono text-[11px] font-semibold text-zinc-200 truncate flex-1 ml-1" title={key}>
                  {key}
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {Math.round(rawBytes.length / 1024)} KB
                </span>
              </div>

              {/* Thumbnail Stage */}
              <div
                className="w-full h-24 bg-checkerboard rounded-lg border border-zinc-800 flex items-center justify-center p-2 overflow-hidden relative group cursor-pointer"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileReplace(key, file);
                }}
              >
                <img
                  src={dataUrl}
                  alt={key}
                  className="max-h-full max-w-full object-contain drop-shadow transition-transform group-hover:scale-105"
                />

                {/* Drag & drop overlay hint */}
                <div className="absolute inset-0 bg-blue-600/80 backdrop-blur-xs flex items-center justify-center text-white text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                  Drop to Replace
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="grid grid-cols-4 gap-1 pt-1 border-t border-zinc-800/60 text-zinc-400">
                {/* File picker replace */}
                <label className="p-1 rounded hover:bg-zinc-800 hover:text-white flex items-center justify-center cursor-pointer transition" title={t.svgaEditor.replaceImage}>
                  <Upload className="w-3.5 h-3.5" />
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileReplace(key, file);
                    }}
                  />
                </label>

                {/* Text to image replacement */}
                <button
                  onClick={() => setActiveTextModalKey(key)}
                  className="p-1 rounded hover:bg-zinc-800 hover:text-blue-400 flex items-center justify-center transition"
                  title={t.svgaEditor.textToImage}
                >
                  <Type className="w-3.5 h-3.5" />
                </button>

                {/* Feather edge */}
                <button
                  onClick={() => handleFeather(key)}
                  className="p-1 rounded hover:bg-zinc-800 hover:text-emerald-400 flex items-center justify-center transition"
                  title={t.svgaEditor.featherEdge}
                >
                  <Feather className="w-3.5 h-3.5" />
                </button>

                {/* Rename */}
                <button
                  onClick={() => handleRename(key)}
                  className="p-1 rounded hover:bg-zinc-800 hover:text-amber-400 flex items-center justify-center transition"
                  title={t.svgaEditor.renameKey}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Text to image modal */}
      {activeTextModalKey && (
        <TextToImageModal
          isOpen={true}
          assetKey={activeTextModalKey}
          onClose={() => setActiveTextModalKey(null)}
          onApply={(bytes) => {
            const updated = replaceSvgaImage(svgaEntity, activeTextModalKey, bytes);
            setSvgaEntity(updated);
          }}
        />
      )}
    </div>
  );
};
