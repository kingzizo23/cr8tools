import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Repeat, Clock, HelpCircle } from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useI18n } from '../../i18n';

export const TimelineBar: React.FC = () => {
  const { t } = useI18n();
  const {
    asset,
    currentFrame,
    setFrame,
    isPlaying,
    setIsPlaying,
    totalFrames,
    loop,
  } = useWorkspaceStore();

  const handleStep = (step: number) => {
    setIsPlaying(false);
    const next = (currentFrame + step + totalFrames) % totalFrames;
    setFrame(next);
  };

  const fps = asset?.fps || 30;
  const currentTimeSec = (currentFrame / fps).toFixed(2);
  const totalTimeSec = ((totalFrames || 1) / fps).toFixed(2);

  return (
    <div className="w-full bg-[#111114] border border-zinc-800/80 rounded-xl p-3 flex flex-col gap-2.5 shadow-lg">
      {/* Top Scrubber Row */}
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-mono text-zinc-400 min-w-16">
          {currentTimeSec}s / {totalTimeSec}s
        </span>

        {/* Custom Range Slider */}
        <div className="relative flex-1 flex items-center">
          <input
            type="range"
            min={0}
            max={Math.max(1, totalFrames - 1)}
            value={currentFrame}
            onChange={(e) => {
              setIsPlaying(false);
              setFrame(parseInt(e.target.value, 10));
            }}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none"
          />
        </div>

        <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-zinc-800/80 text-blue-400 border border-zinc-700/50">
          {t.stage.frameCounter} {currentFrame + 1} {t.stage.of} {totalFrames}
        </span>
      </div>

      {/* Bottom Controls Row */}
      <div className="flex items-center justify-between pt-1 border-t border-zinc-800/50 text-zinc-300">
        <div className="flex items-center gap-1.5">
          {/* Step Back */}
          <button
            onClick={() => handleStep(-1)}
            className="p-1.5 rounded-lg hover:bg-zinc-800 hover:text-white transition"
            title={t.stage.stepBack}
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* Play / Pause */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition transform active:scale-95"
            title={isPlaying ? t.stage.pause : t.stage.play}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>

          {/* Step Forward */}
          <button
            onClick={() => handleStep(1)}
            className="p-1.5 rounded-lg hover:bg-zinc-800 hover:text-white transition"
            title={t.stage.stepForward}
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcut Hint */}
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-zinc-400">
          <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
          <span>{t.stage.shortcutsHint}</span>
        </div>

        {/* FPS Badge */}
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
            <Clock className="w-3 h-3 text-zinc-400" />
            {fps} FPS
          </span>
        </div>
      </div>
    </div>
  );
};
