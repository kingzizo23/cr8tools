import React, { useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Palette } from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useI18n } from '../../i18n';
import { UnifiedRenderer } from '../../core/renderers/UnifiedRenderer';

export const PreviewCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<UnifiedRenderer | null>(null);

  const { t } = useI18n();
  const {
    asset,
    currentFrame,
    isPlaying,
    setFrame,
    setIsPlaying,
    bgType,
    setBgType,
    customBgColor,
    zoom,
    setZoom,
    exportConfig,
  } = useWorkspaceStore();

  // Initialize renderer on asset change
  useEffect(() => {
    if (!asset || !canvasRef.current) return;

    const renderer = new UnifiedRenderer(asset, canvasRef.current);
    rendererRef.current = renderer;

    renderer.init().then(() => {
      renderer.renderFrame(
        currentFrame,
        exportConfig.dualChannelLayout,
        exportConfig.removeBlackBg,
        exportConfig.blackBgThreshold,
        exportConfig.blackBgSoftness
      );
    });

    return () => {
      renderer.destroy();
      rendererRef.current = null;
    };
  }, [asset?.id]);

  // Re-render frame when frame index or config changes
  useEffect(() => {
    if (!rendererRef.current) return;
    rendererRef.current.renderFrame(
      currentFrame,
      exportConfig.dualChannelLayout,
      exportConfig.removeBlackBg,
      exportConfig.blackBgThreshold,
      exportConfig.blackBgSoftness
    );
  }, [
    currentFrame,
    exportConfig.dualChannelLayout,
    exportConfig.removeBlackBg,
    exportConfig.blackBgThreshold,
    exportConfig.blackBgSoftness,
  ]);

  // Animation playback loop
  useEffect(() => {
    if (!isPlaying || !asset) return;

    let animId: number;
    let lastTime = performance.now();
    const fps = asset.fps || 30;
    const interval = 1000 / fps;
    const total = asset.totalFrames || 60;

    const tick = (now: number) => {
      const delta = now - lastTime;
      if (delta >= interval) {
        setFrame((useWorkspaceStore.getState().currentFrame + 1) % total);
        lastTime = now - (delta % interval);
      }
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, asset?.totalFrames, asset?.fps]);

  // Keyboard shortcuts (Space: play/pause, ArrowLeft/Right: frame step)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(!isPlaying);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setIsPlaying(false);
        const total = asset?.totalFrames || 60;
        setFrame((currentFrame - 1 + total) % total);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setIsPlaying(false);
        const total = asset?.totalFrames || 60;
        setFrame((currentFrame + 1) % total);
      }
    },
    [isPlaying, currentFrame, asset?.totalFrames]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Background styling
  const getBgStyle = () => {
    if (bgType === 'black') return { backgroundColor: '#000000' };
    if (bgType === 'white') return { backgroundColor: '#ffffff' };
    if (bgType === 'custom') return { backgroundColor: customBgColor };
    return {}; // checkerboard via css class
  };

  const getCanvasScaleStyle = () => {
    if (zoom === 0) {
      // Fit
      return { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' as const };
    }
    return {
      transform: `scale(${zoom})`,
      transformOrigin: 'center center',
      transition: 'transform 0.15s ease-out',
    };
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex items-center justify-center overflow-hidden rounded-xl border border-zinc-800/80 shadow-2xl select-none ${
        bgType === 'checkerboard' ? 'bg-checkerboard' : ''
      }`}
      style={getBgStyle()}
    >
      {/* Canvas Viewport */}
      <canvas
        ref={canvasRef}
        width={asset?.width || 500}
        height={asset?.height || 500}
        className="rounded shadow-lg transition-transform"
        style={getCanvasScaleStyle()}
      />

      {/* Floating Stage Controls (Background & Zoom) */}
      <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
        {/* Background Switcher */}
        <div className="pointer-events-auto flex items-center gap-1 bg-[#111114]/80 backdrop-blur-md px-2 py-1.5 rounded-lg border border-zinc-800 shadow-md">
          <button
            onClick={() => setBgType('checkerboard')}
            className={`w-6 h-6 rounded border transition ${
              bgType === 'checkerboard' ? 'ring-2 ring-blue-500 border-white' : 'border-zinc-700'
            } bg-checkerboard`}
            title={t.stage.bgTransparent}
          />
          <button
            onClick={() => setBgType('black')}
            className={`w-6 h-6 rounded bg-black border transition ${
              bgType === 'black' ? 'ring-2 ring-blue-500 border-white' : 'border-zinc-700'
            }`}
            title={t.stage.bgBlack}
          />
          <button
            onClick={() => setBgType('white')}
            className={`w-6 h-6 rounded bg-white border transition ${
              bgType === 'white' ? 'ring-2 ring-blue-500 border-zinc-900' : 'border-zinc-300'
            }`}
            title={t.stage.bgWhite}
          />
          <label
            className={`w-6 h-6 rounded flex items-center justify-center cursor-pointer border transition ${
              bgType === 'custom' ? 'ring-2 ring-blue-500 border-white' : 'border-zinc-700'
            }`}
            style={{ backgroundColor: customBgColor }}
            title={t.stage.bgCustom}
          >
            <Palette className="w-3 h-3 text-white/90 drop-shadow" />
            <input
              type="color"
              value={customBgColor}
              onChange={(e) => setBgType('custom', e.target.value)}
              className="sr-only"
            />
          </label>
        </div>

        {/* Zoom Controls */}
        <div className="pointer-events-auto flex items-center gap-1 bg-[#111114]/80 backdrop-blur-md px-2 py-1.5 rounded-lg border border-zinc-800 shadow-md">
          <button
            onClick={() => setZoom(0)}
            className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
              zoom === 0 ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {t.stage.zoomFit}
          </button>
          <button
            onClick={() => setZoom(0.5)}
            className={`px-1.5 py-1 rounded text-[11px] font-semibold transition ${
              zoom === 0.5 ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            50%
          </button>
          <button
            onClick={() => setZoom(1)}
            className={`px-1.5 py-1 rounded text-[11px] font-semibold transition ${
              zoom === 1 ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            100%
          </button>
          <button
            onClick={() => setZoom(2)}
            className={`px-1.5 py-1 rounded text-[11px] font-semibold transition ${
              zoom === 2 ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            200%
          </button>
        </div>
      </div>
    </div>
  );
};
