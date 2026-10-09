/** Safe file name from a map title. */
export function safeName(title: string, extension: string): string {
  const base = title.trim().replace(/[\\/:*?"<>|]+/g, '-') || 'Untitled map';
  return `${base}.${extension}`;
}

/** Saves a blob through the browser's download. */
export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Opens the print dialog for an SVG, sized to the picture, so "Save as PDF" gives one page with
 * selectable text and sharp lines. The page is built in a hidden frame and removed afterwards.
 */
export function printSvg(svg: string, width: number, height: number, title: string): void {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.append(frame);
  const doc = frame.contentDocument;
  if (!doc) {
    frame.remove();
    throw new Error('This browser cannot open the print view');
  }
  const safeTitle = title.replace(/[<>&]/g, '');
  doc.open();
  doc.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${safeTitle}</title>` +
      `<style>@page{size:${width}px ${height}px;margin:0}html,body{margin:0;padding:0}svg{display:block}</style>` +
      `</head><body>${svg}</body></html>`,
  );
  doc.close();
  const cleanup = () => setTimeout(() => frame.remove(), 500);
  const win = frame.contentWindow;
  if (!win) {
    frame.remove();
    return;
  }
  win.addEventListener('afterprint', cleanup);
  // Give the fonts a moment to apply before the dialog snapshots the page.
  setTimeout(() => {
    win.focus();
    win.print();
  }, 150);
}
