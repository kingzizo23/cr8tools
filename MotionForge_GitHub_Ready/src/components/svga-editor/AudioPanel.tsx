import React, { useState } from 'react';
import { Music, Volume2, VolumeX, Upload, Trash2 } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useWorkspaceStore } from '../../store/workspaceStore';

export const AudioPanel: React.FC = () => {
  const { t } = useI18n();
  const { svgaEntity, setSvgaEntity } = useWorkspaceStore();

  const [volume, setVolume] = useState<number>(100);

  if (!svgaEntity) return null;

  const audios = svgaEntity.audios || [];

  const handleRemoveAudio = () => {
    if (confirm('Remove all audio tracks from this SVGA animation?')) {
      const updated = {
        ...svgaEntity,
        audios: [],
      };
      setSvgaEntity(updated);
    }
  };

  const handleReplaceAudio = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create a new AudioEntity
    const reader = new FileReader();
    reader.onload = () => {
      const newAudio = {
        audioKey: `audio_${Date.now()}`,
        startFrame: 0,
        endFrame: svgaEntity.params?.frames || 60,
        startTime: 0,
        totalTime: Math.round(((svgaEntity.params?.frames || 60) / (svgaEntity.params?.fps || 30)) * 1000),
      };
      const updated = {
        ...svgaEntity,
        audios: [newAudio],
      };
      setSvgaEntity(updated);
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="bg-[#111114] border border-zinc-800/80 rounded-xl p-4 flex flex-col gap-3 shadow-md">
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
        <div className="flex items-center gap-2 text-zinc-100 font-bold text-sm">
          <Music className="w-4 h-4 text-blue-400" />
          <span>{t.svgaEditor.audioAssets}</span>
        </div>
        <span className="text-[11px] font-mono text-zinc-400">
          {audios.length} {audios.length === 1 ? 'Track' : 'Tracks'}
        </span>
      </div>

      {audios.length === 0 ? (
        <div className="p-4 bg-zinc-900/40 rounded-lg border border-dashed border-zinc-800 text-center flex flex-col items-center gap-2">
          <VolumeX className="w-6 h-6 text-zinc-600" />
          <span className="text-xs text-zinc-400">This SVGA is currently silent.</span>
          <label className="mt-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition">
            <Upload className="w-3.5 h-3.5" />
            <span>Add MP3 Track</span>
            <input type="file" accept="audio/mp3,audio/wav" onChange={handleReplaceAudio} className="sr-only" />
          </label>
        </div>
      ) : (
        <div className="flex flex-col gap-3 text-xs">
          {audios.map((a: any, idx: number) => (
            <div key={idx} className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold text-zinc-200">{a.audioKey || `Audio Track #${idx + 1}`}</span>
                <span className="text-[11px] text-zinc-400 font-mono">Frames: {a.startFrame} - {a.endFrame}</span>
              </div>

              {/* Volume Slider & Quick Presets */}
              <div className="flex flex-col gap-1.5 pt-1 border-t border-zinc-800/50">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-[11px] flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5 text-blue-400" />
                    {t.svgaEditor.volume}
                  </span>
                  <span className="font-mono text-blue-400 font-bold">{volume}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volume}
                  onChange={(e) => setVolume(parseInt(e.target.value, 10))}
                  className="h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />

                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    onClick={() => setVolume(0)}
                    className={`px-2 py-1 rounded text-[10px] font-semibold transition ${
                      volume === 0 ? 'bg-zinc-700 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {t.svgaEditor.mute}
                  </button>
                  <button
                    onClick={() => setVolume(70)}
                    className={`px-2 py-1 rounded text-[10px] font-semibold transition ${
                      volume === 70 ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {t.svgaEditor.softVolume}
                  </button>
                  <button
                    onClick={() => setVolume(100)}
                    className={`px-2 py-1 rounded text-[10px] font-semibold transition ${
                      volume === 100 ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {t.svgaEditor.fullVolume}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-1 border-t border-zinc-800/50">
                <label className="text-[11px] text-blue-400 hover:underline cursor-pointer flex items-center gap-1">
                  <Upload className="w-3 h-3" />
                  {t.svgaEditor.replaceAudio}
                  <input type="file" accept="audio/mp3,audio/wav" onChange={handleReplaceAudio} className="sr-only" />
                </label>

                <button
                  onClick={handleRemoveAudio}
                  className="text-[11px] text-red-400 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  {t.svgaEditor.deleteAudio}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
