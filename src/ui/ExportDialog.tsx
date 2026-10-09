import { useEffect, useId, useMemo, useState } from 'react';
import { announce } from '../a11y';
import { measureTopic, textWidth } from '../canvas/metrics';
import {
  buildSvg,
  downloadBlob,
  embeddedFontCss,
  fitScale,
  mapToMarkdown,
  pickBoxes,
  printSvg,
  readExportTheme,
  safeName,
  svgToPng,
  type BuiltSvg,
} from '../io';
import { A4, compactLayout, computeLayout, edgeGap, type Orientation } from '../layout';
import { today } from '../model';
import { tableRows, toCsv } from '../model';
import { useCanopy } from '../store';
import { useActiveFilter } from './filter';
import './export.css';

type Format = 'png' | 'svg' | 'pdf' | 'md' | 'csv';

const FORMATS: Array<{ id: Format; label: string; hint: string }> = [
  { id: 'png', label: 'PNG', hint: 'For slides, chats and documents.' },
  { id: 'svg', label: 'SVG', hint: 'Sharp at any size. Opens in design tools.' },
  {
    id: 'pdf',
    label: 'PDF',
    hint: 'One page, with selectable text. Uses your browser’s print dialog.',
  },
  {
    id: 'md',
    label: 'Markdown',
    hint: 'A nested list that note and document apps understand.',
  },
  {
    id: 'csv',
    label: 'Table (CSV)',
    hint: 'One row per topic with its properties, for spreadsheets.',
  },
];

const SCALES = [1, 2, 4] as const;

const ORIENTATIONS: Array<{ id: Orientation; label: string }> = [
  { id: 'auto', label: 'Best fit' },
  { id: 'portrait', label: 'Portrait' },
  { id: 'landscape', label: 'Landscape' },
];

const PAGE_MARGIN = 28;

const fontCache = new Map<string, string>();
async function fontsFor(stack: string): Promise<string> {
  const hit = fontCache.get(stack);
  if (hit !== undefined) return hit;
  const css = await embeddedFontCss(stack);
  fontCache.set(stack, css);
  return css;
}

export function ExportBody() {
  const doc = useCanopy((s) => s.doc);
  const selection = useCanopy((s) => s.selection);
  const [format, setFormat] = useState<Format>('png');
  const [scale, setScale] = useState<(typeof SCALES)[number]>(2);
  const [transparent, setTransparent] = useState(false);
  const [stickers, setStickers] = useState(true);
  const [notes, setNotes] = useState(true);
  const [selectedOnly, setSelectedOnly] = useState(false);
  const [compact, setCompact] = useState(false);
  const [orientation, setOrientation] = useState<Orientation>('auto');
  const [tokens, setTokens] = useState(false);
  const [filterOnly, setFilterOnly] = useState(true);
  const filter = useActiveFilter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [preview, setPreview] = useState<{ built: BuiltSvg; url: string } | null>(null);
  const formatId = useId();
  const hintId = useId();

  const hasSelection =
    selection.length > 0 && !(selection.length === 1 && selection[0] === doc.coreId);
  const roots = selectedOnly && hasSelection ? selection : undefined;
  const layout = useMemo(
    () =>
      computeLayout(doc, {
        flow: doc.prefs.flow,
        density: doc.prefs.density,
        measure: measureTopic,
        edgeGap: (t) => edgeGap(t, doc.prefs.flow, textWidth),
      }),
    [doc],
  );
  const image = format === 'png' || format === 'svg' || format === 'pdf';

  // With a compact layout, topics move to fill an A4 page and the picture takes the page's size.
  const fitted = useMemo(() => {
    if (!compact || !image) return null;
    return compactLayout(doc, pickBoxes(layout, roots), {
      page: A4,
      orientation,
      margin: PAGE_MARGIN,
      edgeGap: (t, flow) => edgeGap(t, flow, textWidth),
    });
  }, [compact, image, doc, layout, roots, orientation]);
  const drawn = fitted?.layout ?? layout;
  const page = useMemo(
    () =>
      fitted ? { width: fitted.page.w, height: fitted.page.h, margin: PAGE_MARGIN } : undefined,
    [fitted],
  );

  // Draws the preview, with the map's font inside it so it matches what will be saved.
  useEffect(() => {
    if (!image) return;
    let cancelled = false;
    let url = '';
    void (async () => {
      await document.fonts?.ready;
      const theme = readExportTheme();
      const fontCss = await fontsFor(theme.fontStack);
      const built = buildSvg(doc, drawn, {
        theme,
        textWidth,
        stickers,
        transparent,
        roots,
        fontCss,
        page,
      });
      if (cancelled || !built.svg) return;
      url = URL.createObjectURL(new Blob([built.svg], { type: 'image/svg+xml;charset=utf-8' }));
      setPreview({ built, url });
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [doc, drawn, page, stickers, transparent, roots, image]);

  const run = async () => {
    setBusy(true);
    setStatus('');
    try {
      const name = (ext: string) => safeName(doc.meta.title, ext);
      if (format === 'csv') {
        const only =
          filter && filterOnly
            ? new Set(filter.result.matches)
            : selectedOnly && hasSelection
              ? new Set(selection)
              : undefined;
        const csv = toCsv(tableRows(doc, today(), only));
        downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), name('csv'));
        setStatus(`Saved ${name('csv')}`);
      } else if (format === 'md') {
        const only = filter && filterOnly ? filter.paths : undefined;
        const text = mapToMarkdown(doc, { notes, roots, tokens, only });
        downloadBlob(new Blob([text], { type: 'text/markdown;charset=utf-8' }), name('md'));
        setStatus(`Saved ${name('md')}`);
      } else {
        await document.fonts?.ready;
        const theme = readExportTheme();
        const fontCss = await fontsFor(theme.fontStack);
        const built = buildSvg(doc, drawn, {
          theme,
          textWidth,
          stickers,
          transparent: format === 'pdf' ? false : transparent,
          roots,
          fontCss,
          page,
        });
        if (!built.svg) throw new Error('There is nothing to export');
        if (format === 'svg') {
          downloadBlob(new Blob([built.svg], { type: 'image/svg+xml;charset=utf-8' }), name('svg'));
          setStatus(`Saved ${name('svg')}`);
        } else if (format === 'png') {
          const result = await svgToPng(built.svg, built.width, built.height, scale);
          downloadBlob(result.blob, name('png'));
          const reduced =
            result.scale < scale ? ` (reduced to ${result.scale.toFixed(1)}× to fit)` : '';
          setStatus(`Saved ${name('png')}, ${result.width} × ${result.height} px${reduced}`);
        } else {
          printSvg(built.svg, built.width, built.height, doc.meta.title || 'Mind map');
          setStatus('Choose “Save as PDF” in the print dialog.');
        }
      }
      announce('Export ready');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'The export failed');
    } finally {
      setBusy(false);
    }
  };

  const wanted = preview ? fitScale(preview.built.width, preview.built.height, scale) : scale;

  return (
    <>
      <div className="export">
        <div className="export-options">
          <div
            role="radiogroup"
            aria-labelledby={formatId}
            aria-describedby={hintId}
            className="export-formats"
          >
            <p id={formatId} className="export-label">
              Format
            </p>
            {FORMATS.map((f) => (
              <label key={f.id} className="export-format">
                <input
                  type="radio"
                  name="format"
                  value={f.id}
                  checked={format === f.id}
                  onChange={() => setFormat(f.id)}
                />
                <span>{f.label}</span>
              </label>
            ))}
            <p className="export-format-hint" id={hintId}>
              {FORMATS.find((f) => f.id === format)?.hint}
            </p>
          </div>

          <fieldset className="export-fieldset">
            <legend className="export-label">Options</legend>
            {format === 'png' && (
              <div className="export-row">
                <span id="export-scale">Resolution</span>
                <div className="segmented" role="group" aria-labelledby="export-scale">
                  {SCALES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={scale === s}
                      onClick={() => setScale(s)}
                    >
                      {s}×
                    </button>
                  ))}
                </div>
              </div>
            )}
            {(format === 'png' || format === 'svg') && (
              <label className="export-check">
                <input
                  type="checkbox"
                  checked={transparent}
                  onChange={(e) => setTransparent(e.target.checked)}
                />
                Transparent background
              </label>
            )}
            {image && (
              <>
                <label className="export-check">
                  <input
                    type="checkbox"
                    checked={compact}
                    onChange={(e) => setCompact(e.target.checked)}
                  />
                  Compact layout to fit an A4 page
                </label>
                {compact && (
                  <div className="export-row">
                    <span id="export-orientation">Page</span>
                    <div className="segmented" role="group" aria-labelledby="export-orientation">
                      {ORIENTATIONS.map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          aria-pressed={orientation === o.id}
                          onClick={() => setOrientation(o.id)}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            {image && (
              <label className="export-check">
                <input
                  type="checkbox"
                  checked={stickers}
                  onChange={(e) => setStickers(e.target.checked)}
                />
                Include stickers
              </label>
            )}
            {format === 'md' && (
              <>
                <label className="export-check">
                  <input
                    type="checkbox"
                    checked={notes}
                    onChange={(e) => setNotes(e.target.checked)}
                  />
                  Include notes
                </label>
                <label className="export-check">
                  <input
                    type="checkbox"
                    checked={tokens}
                    onChange={(e) => setTokens(e.target.checked)}
                  />
                  Write properties as shorthand (@owner !p1 ^date)
                </label>
              </>
            )}
            {(format === 'md' || format === 'csv') && filter && (
              <label className="export-check">
                <input
                  type="checkbox"
                  checked={filterOnly}
                  onChange={(e) => setFilterOnly(e.target.checked)}
                />
                Only what the “{filter.filter.name}” Filter picks out
              </label>
            )}
            <label className="export-check">
              <input
                type="checkbox"
                checked={selectedOnly && hasSelection}
                disabled={!hasSelection}
                onChange={(e) => setSelectedOnly(e.target.checked)}
              />
              Only the selected branches
            </label>
          </fieldset>
        </div>

        {image && (
          <div className="export-preview" aria-label="Preview">
            {preview ? (
              <>
                {/* The preview is decorative: the options and status above carry the same facts. */}
                <img src={preview.url} alt="" />
                <p>
                  {preview.built.topics} {preview.built.topics === 1 ? 'topic' : 'topics'},{' '}
                  {format === 'png'
                    ? `${Math.round(preview.built.width * wanted)} × ${Math.round(preview.built.height * wanted)} px`
                    : `${preview.built.width} × ${preview.built.height}`}
                  {fitted &&
                    `, A4 ${fitted.orientation}, ${Math.round((preview.built.scale ?? 1) * 100)}% size`}
                </p>
              </>
            ) : (
              <p>Preparing preview…</p>
            )}
          </div>
        )}

        <footer className="export-footer">
          <p role="status" className="export-status">
            {status}
          </p>
          <button
            type="button"
            onClick={() => void run()}
            disabled={busy}
            className="export-primary"
          >
            {busy ? 'Working…' : format === 'pdf' ? 'Print or save PDF' : 'Export'}
          </button>
        </footer>
      </div>
    </>
  );
}
