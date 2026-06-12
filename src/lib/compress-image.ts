/**
 * Resize and compress an image file in the browser before upload.
 *
 * - Uses createImageBitmap with imageOrientation:'from-image' so EXIF
 *   orientation is normalized (iPhone portrait photos no longer rotate).
 * - Caps the longest edge at maxSize px (default 1920).
 * - Re-encodes as JPEG at the given quality (default 0.85).
 * - Skips compression for non-images, files already under skipUnderBytes,
 *   or if compression doesn't actually shrink the file.
 *
 * Returns the original File if compression isn't beneficial, otherwise a
 * new File with `.jpg` extension and `image/jpeg` mime type.
 */
export async function compressImage(
  file: File,
  opts: { maxSize?: number; quality?: number; skipUnderBytes?: number } = {},
): Promise<File> {
  const { maxSize = 1920, quality = 0.85, skipUnderBytes = 400 * 1024 } = opts;

  if (!file.type.startsWith('image/')) return file;
  if (file.type === 'image/gif') return file; // animated; don't flatten
  if (file.size < skipUnderBytes) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file; // unsupported source — fall back to original
  }

  const { width, height } = bitmap;
  const longestEdge = Math.max(width, height);
  const scale = longestEdge > maxSize ? maxSize / longestEdge : 1;
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);

  const canvas = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(w, h)
    : Object.assign(document.createElement('canvas'), { width: w, height: h });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctx = (canvas as any).getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob: Blob | null = await new Promise((resolve) => {
    if ('convertToBlob' in canvas) {
      (canvas as OffscreenCanvas)
        .convertToBlob({ type: 'image/jpeg', quality })
        .then(resolve)
        .catch(() => resolve(null));
    } else {
      (canvas as HTMLCanvasElement).toBlob(resolve, 'image/jpeg', quality);
    }
  });
  if (!blob) return file;
  if (blob.size >= file.size) return file; // compression made it bigger; keep original

  const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
  return new File([blob], newName, { type: 'image/jpeg', lastModified: file.lastModified });
}
