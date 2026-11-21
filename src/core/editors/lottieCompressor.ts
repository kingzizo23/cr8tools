export interface LottieCompressionOptions {
  roundDecimals?: number; // e.g. 2
  removeNames?: boolean; // remove 'nm'
  removeMetadata?: boolean; // remove 'mn', 'ix', 'cix', 'np'
}

/**
 * Rounds numbers to given decimal places
 */
function roundNum(val: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

/**
 * Compresses Lottie JSON AST by rounding float numbers and stripping redundant metadata
 */
export function compressLottieJson(
  lottieJson: any,
  options: LottieCompressionOptions = { roundDecimals: 2, removeNames: false, removeMetadata: true }
): any {
  const decimals = options.roundDecimals ?? 2;
  const removeNames = options.removeNames ?? false;
  const removeMeta = options.removeMetadata ?? true;

  function processValue(val: any): any {
    if (typeof val === 'number') {
      return roundNum(val, decimals);
    }
    if (Array.isArray(val)) {
      return val.map(processValue);
    }
    if (val && typeof val === 'object') {
      const out: any = {};
      for (const [k, v] of Object.entries(val)) {
        if (removeNames && k === 'nm') continue;
        if (removeMeta && (k === 'mn' || k === 'ix' || k === 'cix' || k === 'np')) continue;
        out[k] = processValue(v);
      }
      return out;
    }
    return val;
  }

  return processValue(lottieJson);
}
