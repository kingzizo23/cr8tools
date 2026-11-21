import React, { useState } from 'react';
import { X, Image as ImageIcon, Check } from 'lucide-react';
import { useI18n } from '../../i18n';
import { addWatermarkToSvga } from '../../core/editors/svgaAssetEditor';
import { SvgaMovieEntity } from '../../core/types/svga.proto';

interface WatermarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity: SvgaMovieEntity;
  onApply: (updatedEntity: SvgaMovieEntity) => void;
}

export const WatermarkModal: React.FC<WatermarkModalProps> = ({
  isOpen,
  onClose,
  entity,
  onApply,
}) => {
  const { t } = useI18n();

  const [watermarkUrl, setWatermarkUrl] = useState<string>('');
  const [posX, setPosX] = useState(80);
  const [posY, setPosY] = useState(10);
  const [scale, setScale] = useState(60);
  const [opacity, setOpacity] = useState(0.85);
  const [rotation, setRotation] = useState(0);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setWatermarkUrl(url);
  };

  const handleConfirm = async () => {
    if (!watermarkUrl) return;
    const updated = await addWatermarkToSvga(
      entity,
      watermarkUrl,
      posX,
      posY,
      scale,
      opacity,
      rotation
    );
    onApply(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#111114] border border-zinc-800 rounded-2xl w-full max-w-md p-5 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-100 font-bold text-sm">
            <ImageIcon className="w-4 h-4 text-blue-400" />
            <span>{t.svgaEditor.watermark}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Upload Watermark */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-zinc-300">
            {t.svgaEditor.watermarkUpload}
          </label>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileUpload}
            className="text-xs text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer"
          />
        </div>

        {watermarkUrl && (
          <div className="flex flex-col gap-3 text-xs">
            {/* Position X */}
            <div className="flex flex-col gap-1">
              <span className="text-zinc-300 flex justify-between">
                <span>{t.svgaEditor.positionX}</span>
                <span className="font-mono text-blue-400">{posX}%</span>
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={posX}
                onChange={(e) => setPosX(parseInt(e.target.value, 10))}
                className="h-1.5 bg-zinc-800 rounded appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* Position Y */}
            <div className="flex flex-col gap-1">
              <span className="text-zinc-300 flex justify-between">
                <span>{t.svgaEditor.positionY}</span>
                <span className="font-mono text-blue-400">{posY}%</span>
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={posY}
                onChange={(e) => setPosY(parseInt(e.target.value, 10))}
                className="h-1.5 bg-zinc-800 rounded appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* Scale */}
            <div className="flex flex-col gap-1">
              <span className="text-zinc-300 flex justify-between">
                <span>{t.svgaEditor.scale}</span>
                <span className="font-mono text-blue-400">{scale}%</span>
              </span>
              <input
                type="range"
                min={10}
                max={200}
                value={scale}
                onChange={(e) => setScale(parseInt(e.target.value, 10))}
                className="h-1.5 bg-zinc-800 rounded appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* Opacity */}
            <div className="flex flex-col gap-1">
              <span className="text-zinc-300 flex justify-between">
                <span>{t.svgaEditor.opacity}</span>
                <span className="font-mono text-blue-400">{Math.round(opacity * 100)}%</span>
              </span>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
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
            onClick={handleConfirm}
            disabled={!watermarkUrl}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>Apply Watermark</span>
          </button>
        </div>
      </div>
    </div>
  );
};
