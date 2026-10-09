/** Browsers refuse canvases much larger than this on a side. */
export const MAX_CANVAS_SIDE = 16384;

export interface RasterResult {
  blob: Blob;
  width: number;
  height: number;
  /** The scale actually used, which is lower than asked when the image would be too large. */
  scale: number;
}

/** The scale to use so the picture fits in a canvas. */
export function fitScale(width: number, height: number, wanted: number): number {
  const longest = Math.max(width, height, 1);
  return Math.min(wanted, MAX_CANVAS_SIDE / longest);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('The map could not be drawn as an image'));
    img.src = url;
  });
}

/** Draws an SVG into a PNG. */
export async function svgToPng(
  svg: string,
  width: number,
  height: number,
  wanted: number,
): Promise<RasterResult> {
  const scale = fitScale(width, height, wanted);
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('This browser cannot draw images');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('The image could not be saved'))),
        'image/png',
      ),
    );
    return { blob, width: canvas.width, height: canvas.height, scale };
  } finally {
    URL.revokeObjectURL(url);
  }
}
