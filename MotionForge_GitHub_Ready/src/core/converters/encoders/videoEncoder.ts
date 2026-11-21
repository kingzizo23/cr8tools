export interface VideoExportOptions {
  format: 'mp4' | 'webm' | 'mov' | 'vap' | 'yyeva' | 'dual-channel';
  fps: number;
  width: number;
  height: number;
  quality?: number; // 1-100
  dualLayout?: 'alpha-left' | 'rgb-left' | 'top-bottom';
}

/**
 * Creates a dual-channel canvas combining Alpha and RGB
 */
function createDualChannelFrame(
  sourceCanvas: HTMLCanvasElement,
  targetCanvas: HTMLCanvasElement,
  layout: 'alpha-left' | 'rgb-left' | 'top-bottom'
) {
  const ctx = targetCanvas.getContext('2d')!;
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;

  const srcCtx = sourceCanvas.getContext('2d')!;
  const imgData = srcCtx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Create grayscale alpha image
  const alphaData = ctx.createImageData(w, h);
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    alphaData.data[i] = a;
    alphaData.data[i + 1] = a;
    alphaData.data[i + 2] = a;
    alphaData.data[i + 3] = 255;
  }

  // Create temporary canvas for alpha
  const alphaCanvas = document.createElement('canvas');
  alphaCanvas.width = w;
  alphaCanvas.height = h;
  alphaCanvas.getContext('2d')!.putImageData(alphaData, 0, 0);

  ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);

  if (layout === 'alpha-left') {
    ctx.drawImage(alphaCanvas, 0, 0, w, h);
    ctx.drawImage(sourceCanvas, w, 0, w, h);
  } else if (layout === 'rgb-left') {
    ctx.drawImage(sourceCanvas, 0, 0, w, h);
    ctx.drawImage(alphaCanvas, w, 0, w, h);
  } else {
    // top-bottom
    ctx.drawImage(alphaCanvas, 0, 0, w, h);
    ctx.drawImage(sourceCanvas, 0, h, w, h);
  }
}

/**
 * Encodes canvas frames into MP4 or WebM video using browser MediaRecorder
 */
export async function encodeVideo(
  canvases: HTMLCanvasElement[],
  options: VideoExportOptions,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  const isDualChannel =
    options.format === 'vap' || options.format === 'yyeva' || options.format === 'dual-channel';
  const layout = options.dualLayout || 'alpha-left';

  const origW = canvases[0].width;
  const origH = canvases[0].height;

  let targetW = origW;
  let targetH = origH;
  if (isDualChannel) {
    if (layout === 'top-bottom') {
      targetH = origH * 2;
    } else {
      targetW = origW * 2;
    }
  }

  const renderCanvas = document.createElement('canvas');
  renderCanvas.width = targetW;
  renderCanvas.height = targetH;
  const ctx = renderCanvas.getContext('2d')!;

  const fps = options.fps || 30;
  const stream = renderCanvas.captureStream(fps);

  // Pick suitable mimeType
  let mimeType = 'video/webm;codecs=vp9';
  if (options.format === 'mp4' || isDualChannel) {
    if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01E')) {
      mimeType = 'video/mp4;codecs=avc1.42E01E';
    } else if (MediaRecorder.isTypeSupported('video/mp4')) {
      mimeType = 'video/mp4';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
      mimeType = 'video/webm;codecs=h264';
    }
  } else if (options.format === 'webm') {
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
      mimeType = 'video/webm;codecs=vp9';
    } else {
      mimeType = 'video/webm';
    }
  }

  const recorder = new MediaRecorder(stream, {
    mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined,
    videoBitsPerSecond: Math.round(((options.quality ?? 80) / 100) * 8000000), // up to 8Mbps
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  recorder.start();

  const numFrames = canvases.length;
  const frameIntervalMs = 1000 / fps;

  for (let i = 0; i < numFrames; i++) {
    const srcCanvas = canvases[i];
    if (isDualChannel) {
      createDualChannelFrame(srcCanvas, renderCanvas, layout);
    } else {
      ctx.clearRect(0, 0, targetW, targetH);
      ctx.drawImage(srcCanvas, 0, 0, targetW, targetH);
    }

    // Force frame push
    const tracks = stream.getVideoTracks();
    if (tracks[0] && (tracks[0] as any).requestFrame) {
      (tracks[0] as any).requestFrame();
    }

    if (onProgress) {
      onProgress(Math.round(((i + 1) / numFrames) * 95));
    }

    await new Promise((r) => setTimeout(r, frameIntervalMs));
  }

  return new Promise((resolve) => {
    recorder.onstop = () => {
      const finalBlob = new Blob(chunks, { type: recorder.mimeType || 'video/mp4' });
      if (onProgress) onProgress(100);
      resolve(finalBlob);
    };
    recorder.stop();
  });
}
