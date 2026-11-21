import React, { useState } from 'react';
import { X, Sparkles, Plus, Trash2, Check } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { DynamicElementConfig } from '../../core/types/motion';

interface DynamicElementsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DynamicElementsModal: React.FC<DynamicElementsModalProps> = ({ isOpen, onClose }) => {
  const { t } = useI18n();
  const { exportConfig, addDynamicElement, removeDynamicElement } = useWorkspaceStore();

  const [tag, setTag] = useState('user_avatar');
  const [type, setType] = useState<'image' | 'text'>('image');
  const [fitMode, setFitMode] = useState<'aspectFill' | 'aspectFit' | 'scaleFill'>('aspectFill');
  const [defaultText, setDefaultText] = useState('Live Winner');
  const [textColor, setTextColor] = useState('#ffffff');
  const [fontSize, setFontSize] = useState(32);

  if (!isOpen) return null;

  const elements = exportConfig.dynamicElements || [];

  const handleAdd = () => {
    if (!tag.trim()) return;
    const config: DynamicElementConfig = {
      tag: tag.trim(),
      type,
      fitMode,
      ...(type === 'text' ? { defaultText, color: textColor, fontSize } : {}),
    };
    addDynamicElement(config);
    setTag(`dynamic_${Date.now().toString().slice(-4)}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#111114] border border-zinc-800 rounded-2xl w-full max-w-lg p-5 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-100 font-bold text-sm">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span>{t.dynamicModal.title}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11px] text-zinc-400 leading-relaxed">
          {t.dynamicModal.help}
        </p>

        {/* Existing Elements List */}
        <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
          {elements.length === 0 ? (
            <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 text-center text-xs text-zinc-400">
              No dynamic tags configured yet.
            </div>
          ) : (
            elements.map((el) => (
              <div
                key={el.tag}
                className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-blue-400">{el.tag}</span>
                  <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                    {el.type}
                  </span>
                  <span className="text-[10px] text-zinc-400">{el.fitMode}</span>
                </div>
                <button
                  onClick={() => removeDynamicElement(el.tag)}
                  className="p-1 rounded hover:bg-red-500/10 text-zinc-400 hover:text-red-400 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add Element Form */}
        <div className="p-3 bg-zinc-900/70 border border-zinc-800/80 rounded-xl flex flex-col gap-2.5 text-xs">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1 flex flex-col gap-1">
              <label className="text-zinc-300 font-semibold">{t.dynamicModal.tag}</label>
              <input
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg p-1.5 text-zinc-200 font-mono text-xs focus:outline-none"
              />
            </div>

            <div className="col-span-1 flex flex-col gap-1">
              <label className="text-zinc-300 font-semibold">{t.dynamicModal.type}</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg p-1.5 text-zinc-200 text-xs focus:outline-none"
              >
                <option value="image">Image Asset</option>
                <option value="text">Text Asset</option>
              </select>
            </div>

            <div className="col-span-1 flex flex-col gap-1">
              <label className="text-zinc-300 font-semibold">{t.dynamicModal.fitMode}</label>
              <select
                value={fitMode}
                onChange={(e) => setFitMode(e.target.value as any)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg p-1.5 text-zinc-200 text-xs focus:outline-none"
              >
                <option value="aspectFill">aspectFill</option>
                <option value="aspectFit">aspectFit</option>
                <option value="scaleFill">scaleFill</option>
              </select>
            </div>
          </div>

          {type === 'text' && (
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-zinc-800">
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-zinc-300 font-semibold">{t.dynamicModal.defaultText}</label>
                <input
                  type="text"
                  value={defaultText}
                  onChange={(e) => setDefaultText(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg p-1.5 text-zinc-200 text-xs focus:outline-none"
                />
              </div>
              <div className="col-span-1 flex flex-col gap-1">
                <label className="text-zinc-300 font-semibold">{t.dynamicModal.fontSize}</label>
                <input
                  type="number"
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg p-1.5 text-zinc-200 text-xs focus:outline-none"
                />
              </div>
            </div>
          )}

          <button
            onClick={handleAdd}
            className="mt-1 py-1.5 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-blue-400 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.dynamicModal.addDynamic}</span>
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1"
          >
            <Check className="w-4 h-4" />
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
};
