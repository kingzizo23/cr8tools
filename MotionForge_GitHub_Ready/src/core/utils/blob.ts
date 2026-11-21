/**
 * Cross-platform Blob helper to prevent TypeScript ArrayBufferLike variance mismatches
 */
export function createBlob(parts: any[], options?: BlobPropertyBag): Blob {
  return new Blob(parts, options);
}
