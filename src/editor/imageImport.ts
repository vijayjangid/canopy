import { MAX_IMAGE_CHARS, MAX_IMAGE_SIDE, type TopicImage } from '../model';

/** The longest side after scaling a picture to fit within `max`, never making it larger. */
export function fitSide(w: number, h: number, max: number): { w: number; h: number } {
  const scale = Math.min(1, max / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * scale)), h: Math.max(1, Math.round(h * scale)) };
}

/** Embedded pictures are kept well below the limit a file is allowed to carry. */
const TARGET_CHARS = Math.floor(MAX_IMAGE_CHARS * 0.6);

export class ImageTooLargeError extends Error {
  constructor() {
    super('That picture is too large to keep in the map.');
    this.name = 'ImageTooLargeError';
  }
}

async function decode(blob: Blob): Promise<{ source: CanvasImageSource; w: number; h: number }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob);
      return { source: bitmap, w: bitmap.width, h: bitmap.height };
    } catch {
      // Some formats (SVG, for one) only decode through an image element.
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { source: img, w: img.naturalWidth, h: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Reads a pasted picture and scales it to at most `MAX_IMAGE_SIDE` on its longest side, then
 * embeds it as a WebP (or PNG where WebP cannot be written). Smaller steps are tried when the
 * result is still too large for the map file.
 */
export async function imageFromBlob(blob: Blob): Promise<TopicImage> {
  const { source, w, h } = await decode(blob);
  if (w < 1 || h < 1) throw new Error('That picture is empty.');

  for (const [side, quality] of [
    [MAX_IMAGE_SIDE, 0.9],
    [MAX_IMAGE_SIDE, 0.75],
    [960, 0.75],
    [640, 0.7],
  ] as const) {
    const size = fitSide(w, h, side);
    const canvas = document.createElement('canvas');
    canvas.width = size.w;
    canvas.height = size.h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Pictures cannot be read in this browser.');
    ctx.drawImage(source, 0, 0, size.w, size.h);
    const src = canvas.toDataURL('image/webp', quality);
    if (src.length <= TARGET_CHARS) return { src, w: size.w, h: size.h };
  }
  throw new ImageTooLargeError();
}
