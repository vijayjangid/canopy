import { parseMarkdown, type Block, type Inline } from '../model/markdown';
import type { TextWidth, TypeStyle } from './measure';

/** Line height of the note preview under a title, in px. */
export const NOTE_LINE_HEIGHT = 16;
/** Space between the title and the note, with the divider in the middle. */
export const NOTE_GAP = 6;
/** Room kept to the right of the longest note line. */
export const NOTE_RIGHT_PADDING = 14;
/** Most lines a note shows on its node. The rest is read in the inspector. */
export const NOTE_MAX_LINES = 8;
/** Width of the marker column of a list item. */
export const NOTE_MARKER_INSET = 16;
/** Size of a task checkbox. */
export const NOTE_BOX_SIZE = 9;

const QUOTE_INDENT = 10;
const MONO_ADVANCE = 0.6;
const BOLD_WEIGHT = 650;
/** Inline code and fenced code are set in this face. */
export const NOTE_MONO_FONT = "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace";

export interface NoteRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
  code?: boolean;
  link?: boolean;
  /** Where a link goes. Set with `link`. */
  href?: string;
}

export type NoteMarker =
  { kind: 'bullet' } | { kind: 'todo' } | { kind: 'done' } | { kind: 'number'; label: string };

/** One drawn line of a note. `x` is where its text starts, from the left padding of the topic. */
export interface NoteLine {
  x: number;
  runs: NoteRun[];
  width: number;
  marker?: NoteMarker;
  /** Where the bar of a block quote sits. */
  bar?: number;
  rule?: boolean;
  heading?: boolean;
}

interface Para {
  runs: NoteRun[];
  x: number;
  marker?: NoteMarker;
  bar?: number;
  heading?: boolean;
  /** Code keeps its line breaks and is cut instead of wrapped. */
  verbatim?: boolean;
  rule?: boolean;
}

type Format = Omit<NoteRun, 'text'>;

function runsOf(nodes: readonly Inline[], format: Format = {}): NoteRun[] {
  return nodes.flatMap((node): NoteRun[] => {
    switch (node.type) {
      case 'text':
        return [{ ...format, text: node.text }];
      case 'code':
        return [{ ...format, code: true, text: node.text }];
      case 'strong':
        return runsOf(node.children, { ...format, bold: true });
      case 'em':
        return runsOf(node.children, { ...format, italic: true });
      case 'del':
        return runsOf(node.children, { ...format, strike: true });
      case 'link':
        return runsOf(node.children, { ...format, link: true, href: node.href });
    }
  });
}

interface Walk {
  x: number;
  bar?: number;
}

function paragraphs(blocks: readonly Block[], at: Walk, out: Para[]): void {
  for (const block of blocks) {
    switch (block.type) {
      case 'heading':
        out.push({
          runs: runsOf(block.children, { bold: true }),
          x: at.x,
          heading: true,
          ...(at.bar === undefined ? {} : { bar: at.bar }),
        });
        break;
      case 'paragraph':
        out.push({
          runs: runsOf(block.children),
          x: at.x,
          ...(at.bar === undefined ? {} : { bar: at.bar }),
        });
        break;
      case 'code':
        for (const text of block.text.split('\n')) {
          out.push({
            runs: [{ text, code: true }],
            x: at.x,
            verbatim: true,
            ...(at.bar === undefined ? {} : { bar: at.bar }),
          });
        }
        break;
      case 'quote':
        paragraphs(block.children, { x: at.x + QUOTE_INDENT, bar: at.x + 2 }, out);
        break;
      case 'rule':
        out.push({ runs: [], x: at.x, rule: true });
        break;
      case 'list':
        block.items.forEach((item, index) => {
          const marker: NoteMarker =
            item.checked === undefined
              ? block.ordered
                ? { kind: 'number', label: `${index + 1}.` }
                : { kind: 'bullet' }
              : { kind: item.checked ? 'done' : 'todo' };
          const x = at.x + NOTE_MARKER_INSET;
          out.push({
            runs: runsOf(item.children),
            x,
            marker,
            ...(at.bar === undefined ? {} : { bar: at.bar }),
          });
          paragraphs(item.nested, { ...at, x }, out);
        });
        break;
      case 'table':
        for (const [i, row] of [block.head, ...block.rows].entries()) {
          out.push({
            runs: row.flatMap((cell, j) => [
              ...(j > 0 ? [{ text: ' · ' }] : []),
              ...runsOf(cell, i === 0 ? { bold: true } : {}),
            ]),
            x: at.x,
            ...(at.bar === undefined ? {} : { bar: at.bar }),
          });
        }
        break;
    }
  }
}

const sameFormat = (a: NoteRun, b: NoteRun) =>
  !!a.bold === !!b.bold &&
  !!a.italic === !!b.italic &&
  !!a.strike === !!b.strike &&
  !!a.code === !!b.code &&
  !!a.link === !!b.link &&
  a.href === b.href;

/** Breaks text into words that may span styles, and the single spaces between them. */
function units(runs: readonly NoteRun[]): Array<NoteRun[] | 'space'> {
  const result: Array<NoteRun[] | 'space'> = [];
  let word: NoteRun[] = [];
  const endWord = () => {
    if (word.length > 0) result.push(word);
    word = [];
  };
  for (const run of runs) {
    for (const part of run.text.match(/\s+|\S+/g) ?? []) {
      if (/^\s/.test(part)) {
        endWord();
        if (result[result.length - 1] !== 'space' && result.length > 0) result.push('space');
      } else {
        word.push({ ...run, text: part });
      }
    }
  }
  endWord();
  return result[result.length - 1] === 'space' ? result.slice(0, -1) : result;
}

/** Reads a note as Markdown and lays it out as short lines, so a node can show a preview of it. */
export function noteLines(
  note: string,
  style: TypeStyle,
  maxWidth: number,
  textWidth: TextWidth,
): NoteLine[] {
  const runWidth = (run: NoteRun) =>
    run.code
      ? run.text.length * style.size * MONO_ADVANCE
      : textWidth(run.text, { ...style, weight: run.bold ? BOLD_WEIGHT : style.weight });

  const paras: Para[] = [];
  paragraphs(parseMarkdown(note), { x: 0 }, paras);

  const lines: NoteLine[] = [];
  const append = (line: NoteLine, run: NoteRun) => {
    const last = line.runs[line.runs.length - 1];
    if (last && sameFormat(last, run)) last.text += run.text;
    else line.runs.push({ ...run });
    line.width += runWidth(run);
  };

  for (const para of paras) {
    const base = {
      x: para.x,
      ...(para.bar === undefined ? {} : { bar: para.bar }),
      ...(para.heading ? { heading: true } : {}),
    };
    if (para.rule) {
      lines.push({ ...base, runs: [], width: 0, rule: true });
      continue;
    }
    const room = Math.max(40, maxWidth - para.x);
    const open = (first: boolean): NoteLine => ({
      ...base,
      runs: [],
      width: 0,
      ...(first && para.marker ? { marker: para.marker } : {}),
    });

    if (para.verbatim) {
      const line = open(true);
      const code = para.runs[0]?.text ?? '';
      const fit = Math.max(1, Math.floor(room / (style.size * MONO_ADVANCE)));
      append(line, { text: code.length > fit ? `${code.slice(0, fit - 1)}…` : code, code: true });
      lines.push(line);
      continue;
    }

    let line = open(true);
    let first = true;
    let gap = false;
    const wrap = () => {
      if (line.runs.length > 0 || first) lines.push(line);
      first = false;
      line = open(false);
      gap = false;
    };
    for (const unit of units(para.runs)) {
      if (unit === 'space') {
        gap = line.runs.length > 0;
        continue;
      }
      // A space between two words in the same style belongs to that style.
      const before = line.runs[line.runs.length - 1];
      const after = unit[0];
      const space: NoteRun = { text: ' ' };
      for (const key of ['bold', 'italic', 'strike'] as const) {
        if (before?.[key] && after?.[key]) space[key] = true;
      }
      if (before?.link && after?.link && before.href === after.href) {
        space.link = true;
        space.href = before.href;
      }
      const spaceW = gap ? runWidth(space) : 0;
      const wordW = unit.reduce((sum, run) => sum + runWidth(run), 0);
      if (line.runs.length > 0 && line.width + spaceW + wordW > room) wrap();
      else if (gap) append(line, space);
      gap = false;
      if (wordW <= room) {
        for (const run of unit) append(line, run);
        continue;
      }
      // A word wider than the line is split between characters.
      for (const run of unit) {
        for (const char of run.text) {
          if (line.runs.length > 0 && line.width + runWidth({ ...run, text: char }) > room) wrap();
          append(line, { ...run, text: char });
        }
      }
    }
    if (line.runs.length > 0 || first) lines.push(line);
  }

  if (lines.length <= NOTE_MAX_LINES) return lines;
  const shown = lines.slice(0, NOTE_MAX_LINES);
  const last = shown[NOTE_MAX_LINES - 1];
  if (last && !last.rule) append(last, { text: '…' });
  return shown;
}

/** How far to the right a note reaches from the left padding of the topic. */
export const noteReach = (lines: readonly NoteLine[]): number =>
  lines.reduce((reach, line) => Math.max(reach, line.x + line.width), 0);

/** How a run is set, in terms both the canvas and the export can draw. */
export function runLook(run: NoteRun): {
  weight?: number;
  italic: boolean;
  mono: boolean;
  decoration?: string;
} {
  const decoration = [run.link ? 'underline' : '', run.strike ? 'line-through' : '']
    .filter(Boolean)
    .join(' ');
  return {
    ...(run.bold ? { weight: BOLD_WEIGHT } : {}),
    italic: !!run.italic,
    mono: !!run.code,
    ...(decoration ? { decoration } : {}),
  };
}
