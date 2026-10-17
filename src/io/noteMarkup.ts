import {
  NOTE_BOX_SIZE,
  NOTE_LINE_HEIGHT,
  NOTE_MONO_FONT,
  runLook,
  TOPIC_PADDING,
  type NoteLine,
} from '../layout';

const f = (n: number) => String(Math.round(n * 100) / 100);

const escapeXml = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** The note preview of a topic as SVG: its lines, their markers, and the quote bars and rules. */
export function noteMarkup(
  lines: readonly NoteLine[],
  top: number,
  boxWidth: number,
  fontSize: number,
  ink: string,
): string {
  const left = TOPIC_PADDING.x;
  const out: string[] = [];
  lines.forEach((line, i) => {
    const y = top + i * NOTE_LINE_HEIGHT;
    const mid = y + NOTE_LINE_HEIGHT / 2;
    if (line.bar !== undefined) {
      out.push(
        `<line x1="${f(left + line.bar)}" x2="${f(left + line.bar)}" y1="${f(y + 1)}" y2="${f(y + NOTE_LINE_HEIGHT - 1)}" stroke="${ink}" stroke-opacity="0.4" stroke-width="2"/>`,
      );
    }
    if (line.rule) {
      out.push(
        `<line x1="${f(left + line.x)}" x2="${f(boxWidth - left)}" y1="${f(mid)}" y2="${f(mid)}" stroke="${ink}" stroke-opacity="0.3" stroke-width="1"/>`,
      );
      return;
    }
    const marker = line.marker;
    if (marker?.kind === 'bullet') {
      out.push(
        `<circle cx="${f(left + line.x - 9)}" cy="${f(mid)}" r="2" fill="${ink}" fill-opacity="0.6"/>`,
      );
    } else if (marker?.kind === 'todo' || marker?.kind === 'done') {
      const bx = left + line.x - 14;
      const by = mid - NOTE_BOX_SIZE / 2;
      out.push(
        `<rect x="${f(bx)}" y="${f(by)}" width="${NOTE_BOX_SIZE}" height="${NOTE_BOX_SIZE}" rx="2" fill="none" stroke="${ink}" stroke-opacity="0.7" stroke-width="1.2"/>`,
      );
      if (marker.kind === 'done') {
        out.push(
          `<path d="M${f(bx + 2)} ${f(mid)}l2 2 3.5-4" fill="none" stroke="${ink}" stroke-width="1.5"/>`,
        );
      }
    } else if (marker?.kind === 'number') {
      out.push(
        `<text x="${f(left + line.x - 4)}" y="${f(mid)}" text-anchor="end" dominant-baseline="central" font-size="${f(fontSize)}" fill="${ink}" fill-opacity="0.7">${escapeXml(marker.label)}</text>`,
      );
    }
    const spans = line.runs
      .map((run) => {
        const look = runLook(run);
        const attrs = [
          look.weight ? ` font-weight="${look.weight}"` : '',
          look.italic ? ' font-style="italic"' : '',
          look.mono ? ` font-family="${escapeXml(NOTE_MONO_FONT)}"` : '',
          look.decoration ? ` text-decoration="${look.decoration}"` : '',
        ].join('');
        const span = `<tspan${attrs}>${escapeXml(run.text)}</tspan>`;
        return run.href
          ? `<a href="${escapeXml(run.href)}" target="_blank" rel="noopener noreferrer">${span}</a>`
          : span;
      })
      .join('');
    out.push(
      `<text x="${f(left + line.x)}" y="${f(mid)}" dominant-baseline="central" xml:space="preserve" style="white-space:pre" font-size="${f(fontSize)}" fill="${ink}">${spans}</text>`,
    );
  });
  return out.join('');
}
