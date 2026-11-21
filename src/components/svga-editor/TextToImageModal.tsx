import React, { useState, useEffect, useRef } from 'react';
import { X, Type, Check } from 'lucide-react';
import { useI18n } from '../../i18n';
import { generateTextImage, TextImageOptions } from '../../core/editors/svgaAssetEditor';
import { createBlob } from '../../core/utils/blob';

interface TextToImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (imageBytes: Uint8Array) => void;
  assetKey: string;
}

export const TextToImageModal: React.FC<TextToImageModalProps> = ({
  isOpen,
  onClose,
  onApply,
  assetKey,
}) => {
  const { t } = useI18n();

  const [text, setText] = useState('WINNER: ALEX');
  const [fontFamily, setFontFamily] = useState('Impact');
  const [fontSize, setFontSize] = useState(48);
  const [textColor, setTextColor] = useState('#fbbf24'); // Amber-400
  const [bgColor, setBgColor] = useState('');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center');
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const opts: TextImageOptions = {
      text,
      fontFamily,
      fontSize,
      textColor,
      backgroundColor: bgColor || undefined,
      textAlign,
      padding: 16,
    };

    generateTextImage(opts).then((bytes) => {
      const blob = createBlob([bytes], { type: 'image/png' });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    });

    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [isOpen, text, fontFamily, fontSize, textColor, bgColor, textAlign]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    const opts: TextImageOptions = {
      text,
      fontFamily,
      fontSize,
      textColor,
      backgroundColor: bgColor || undefined,
      textAlign,
      padding: 16,
    };
    const bytes = await generateTextImage(opts);
    onApply(bytes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#111114] border border-zinc-800 rounded-2xl w-full max-w-lg p-5 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-100 font-bold text-sm">
            <Type className="w-4 h-4 text-blue-400" />
            <span>{t.textModal.title}</span>
            <span className="text-[11px] font-mono text-zinc-400 font-normal">({assetKey})</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Preview */}
        <div className="w-full h-32 bg-checkerboard rounded-xl border border-zinc-800/80 flex items-center justify-center p-3 overflow-hidden">
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Text Preview"
              className="max-h-full max-w-full object-contain drop-shadow"
            />
          )}
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-zinc-300 font-semibold">{t.textModal.textContent}</label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-zinc-300 font-semibold">{t.textModal.fontFamily}</label>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-100 focus:outline-none"
            >
              <option value="Impact">Impact (Heavy)</option>
              <option value="'Plus Jakarta Sans', sans-serif">Plus Jakarta Sans</option>
              <option value="'Cairo', sans-serif">Cairo (Arabic)</option>
              <option value="Arial, sans-serif">Arial</option>
              <option value="'Times New Roman', serif">Times New Roman</option>
              <option value="monospace">Monospace</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-zinc-300 font-semibold">{t.textModal.fontSize}</label>
            <input
              type="number"
              min={12}
              max={150}
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value, 10) || 24)}
              className="bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-100 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-zinc-300 font-semibold">{t.textModal.textColor}</label>
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-lg p-1.5">
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
              />
              <span className="font-mono text-zinc-300 text-xs">{textColor}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-zinc-300 font-semibold">{t.textModal.alignment}</label>
            <div className="grid grid-cols-3 gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-700">
              {(['left', 'center', 'right'] as const).map((align) => (
                <button
                  key={align}
                  type="button"
                  onClick={() => setTextAlign(align)}
                  className={`py-1 rounded text-[11px] font-semibold transition ${
                    textAlign === align ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {t.textModal[align]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition"
          >
            <Check className="w-4 h-4" />
            <span>{t.textModal.applyBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
