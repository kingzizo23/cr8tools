import * as fflate from 'fflate';

export interface AeJsxExportOptions {
  name: string;
  width: number;
  height: number;
  fps: number;
  totalFrames: number;
  duration: number;
}

/**
 * Creates an After Effects JSX script and bundles all frame PNGs into an AE project ZIP
 */
export async function exportToAfterEffectsJsxZip(
  canvases: HTMLCanvasElement[],
  options: AeJsxExportOptions,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  const files: { [path: string]: Uint8Array } = {};
  const total = canvases.length;

  for (let i = 0; i < total; i++) {
    const canvas = canvases[i];
    const blob: Blob = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b || new Blob()), 'image/png');
    });
    const buf = await blob.arrayBuffer();
    const frameIndexStr = String(i + 1).padStart(4, '0');
    files[`footage/frame_${frameIndexStr}.png`] = new Uint8Array(buf);

    if (onProgress) {
      onProgress(Math.round(((i + 1) / total) * 80));
    }
  }

  // Generate import_to_ae.jsx
  const jsxScript = `// MotionForge After Effects Auto-Import Script
// Run via: File > Scripts > Run Script File... > import_to_ae.jsx

(function() {
  app.beginUndoGroup("Import MotionForge Animation");

  var scriptFolder = (new File($.fileName)).parent;
  var footageFolder = new Folder(scriptFolder.fsName + "/footage");

  if (!footageFolder.exists) {
    alert("Could not locate 'footage' folder next to the script!");
    return;
  }

  var compWidth = ${options.width};
  var compHeight = ${options.height};
  var compFps = ${options.fps};
  var compDuration = ${options.duration.toFixed(2)};
  var compName = "${options.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Comp";

  var comp = app.project.items.addComp(compName, compWidth, compHeight, 1.0, compDuration, compFps);

  // Import first frame as image sequence
  var firstFile = new File(footageFolder.fsName + "/frame_0001.png");
  if (firstFile.exists) {
    var importOptions = new ImportOptions(firstFile);
    importOptions.sequence = true;
    importOptions.forceAlphabetical = true;

    try {
      var footageItem = app.project.importFile(importOptions);
      footageItem.mainSource.conformFrameRate = compFps;
      var layer = comp.layers.add(footageItem);
      layer.startTime = 0;
    } catch(err) {
      alert("Error importing image sequence: " + err.toString());
    }
  }

  app.endUndoGroup();
  alert("Animation imported successfully to composition '" + compName + "'!");
})();
`;

  files['import_to_ae.jsx'] = fflate.strToU8(jsxScript);
  files['README_AE.txt'] = fflate.strToU8(
    `MotionForge Adobe After Effects Package\n=======================================\n\nTo import into After Effects:\n1. Extract this entire ZIP to a folder.\n2. Open Adobe After Effects.\n3. Go to menu: File -> Scripts -> Run Script File...\n4. Select 'import_to_ae.jsx'.\n5. The composition will be generated automatically with your footage.\n`
  );

  if (onProgress) onProgress(90);

  const zipBytes = fflate.zipSync(files, { level: 6 });
  if (onProgress) onProgress(100);

  return new Blob([zipBytes], { type: 'application/zip' });
}
