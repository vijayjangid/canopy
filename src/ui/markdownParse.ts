import { isSafeLink } from '../model/sanitize';

/** A small, safe subset of Markdown. Nothing here produces raw HTML. */
export type Inline =
  | { type: 'text'; text: string }
  | { type: 'code'; text: string }
  | { type: 'strong'; children: Inline[] }
  | { type: 'em'; children: Inline[] }
  | { type: 'del'; children: Inline[] }
  | { type: 'link'; href: string; children: Inline[] };

export type Block =
  | { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; children: Inline[] }
  | { type: 'paragraph'; children: Inline[] }
  | { type: 'code'; text: string; lang: string }
  | { type: 'quote'; children: Block[] }
  | { type: 'rule' }
  | { type: 'list'; ordered: boolean; items: ListItem[] }
  | { type: 'table'; head: Inline[][]; rows: Inline[][][] };

export interface ListItem {
  /** Set for task items: true when ticked. */
  checked?: boolean;
  children: Inline[];
  nested: Block[];
}

const MAX_DEPTH = 6;

/** Inline spans, such as **bold**, *italic*, `code` and [links](https://example.com). */
export function parseInline(src: string, depth = 0): Inline[] {
  const out: Inline[] = [];
  let text = '';
  const flush = () => {
    if (text) out.push({ type: 'text', text });
    text = '';
  };
  let i = 0;
  while (i < src.length) {
    const rest = src.slice(i);
    let m: RegExpExecArray | null;
    if (src[i] === '\\' && i + 1 < src.length) {
      text += src[i + 1];
      i += 2;
    } else if ((m = /^`([^`\n]+)`/.exec(rest))) {
      flush();
      out.push({ type: 'code', text: m[1] ?? '' });
      i += m[0].length;
    } else if (depth < MAX_DEPTH && (m = /^(\*\*|__)(?=\S)(.+?)(?<=\S)\1/.exec(rest))) {
      flush();
      out.push({ type: 'strong', children: parseInline(m[2] ?? '', depth + 1) });
      i += m[0].length;
    } else if (depth < MAX_DEPTH && (m = /^~~(?=\S)(.+?)(?<=\S)~~/.exec(rest))) {
      flush();
      out.push({ type: 'del', children: parseInline(m[1] ?? '', depth + 1) });
      i += m[0].length;
    } else if (depth < MAX_DEPTH && (m = /^([*_])(?=\S)(.+?)(?<=\S)\1/.exec(rest))) {
      flush();
      out.push({ type: 'em', children: parseInline(m[2] ?? '', depth + 1) });
      i += m[0].length;
    } else if (depth < MAX_DEPTH && (m = /^\[([^\]\n]+)\]\(([^)\s]+)\)/.exec(rest))) {
      const href = m[2] ?? '';
      if (isSafeLink(href)) {
        flush();
        out.push({ type: 'link', href, children: parseInline(m[1] ?? '', depth + 1) });
      } else {
        // An unsafe address is shown as plain text, never as a link.
        text += m[0];
      }
      i += m[0].length;
    } else if ((m = /^https?:\/\/[^\s<>)]+/.exec(rest))) {
      flush();
      out.push({ type: 'link', href: m[0], children: [{ type: 'text', text: m[0] }] });
      i += m[0].length;
    } else {
      text += src[i];
      i += 1;
    }
  }
  flush();
  return out;
}

const FENCE = /^(\s*)(```|~~~)\s*([\w-]*)\s*$/;
const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const RULE = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/;
const ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const TABLE_SEPARATOR = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

const cells = (line: string): string[] =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());

/** Reads Markdown into blocks. Anything it does not know becomes a paragraph. */
export function parseMarkdown(src: string, depth = 0): Block[] {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? '';
    if (line.trim() === '') {
      i++;
      continue;
    }

    const fence = FENCE.exec(line);
    if (fence) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !(lines[i] ?? '').trim().startsWith(fence[2] ?? '```')) {
        body.push(lines[i] ?? '');
        i++;
      }
      i++;
      blocks.push({ type: 'code', text: body.join('\n'), lang: fence[3] ?? '' });
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      blocks.push({
        type: 'heading',
        level: (heading[1]?.length ?? 1) as 1 | 2 | 3 | 4 | 5 | 6,
        children: parseInline(heading[2] ?? ''),
      });
      i++;
      continue;
    }

    if (RULE.test(line)) {
      blocks.push({ type: 'rule' });
      i++;
      continue;
    }

    if (line.trimStart().startsWith('>') && depth < MAX_DEPTH) {
      const body: string[] = [];
      while (i < lines.length && (lines[i] ?? '').trimStart().startsWith('>')) {
        body.push((lines[i] ?? '').replace(/^\s*>\s?/, ''));
        i++;
      }
      blocks.push({ type: 'quote', children: parseMarkdown(body.join('\n'), depth + 1) });
      continue;
    }

    if (
      line.includes('|') &&
      (lines[i + 1] ?? '').includes('|') &&
      TABLE_SEPARATOR.test(lines[i + 1] ?? '')
    ) {
      const head = cells(line).map((c) => parseInline(c));
      i += 2;
      const rows: Inline[][][] = [];
      while (i < lines.length && (lines[i] ?? '').includes('|') && (lines[i] ?? '').trim() !== '') {
        rows.push(cells(lines[i] ?? '').map((c) => parseInline(c)));
        i++;
      }
      blocks.push({ type: 'table', head, rows });
      continue;
    }

    const item = ITEM.exec(line);
    if (item) {
      const base = item[1]?.length ?? 0;
      const ordered = /\d/.test(item[2] ?? '');
      const items: ListItem[] = [];
      while (i < lines.length) {
        const m = ITEM.exec(lines[i] ?? '');
        if (!m || (m[1]?.length ?? 0) !== base) break;
        let content = m[3] ?? '';
        let checked: boolean | undefined;
        const task = /^\[([ xX])\]\s+(.*)$/.exec(content);
        if (task) {
          checked = task[1] !== ' ';
          content = task[2] ?? '';
        }
        i++;
        const nestedLines: string[] = [];
        while (i < lines.length) {
          const next = lines[i] ?? '';
          const nm = ITEM.exec(next);
          if (next.trim() !== '' && nm && (nm[1]?.length ?? 0) > base) {
            nestedLines.push(next);
            i++;
          } else break;
        }
        items.push({
          ...(checked === undefined ? {} : { checked }),
          children: parseInline(content),
          nested: depth < MAX_DEPTH ? parseMarkdown(nestedLines.join('\n'), depth + 1) : [],
        });
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    // A paragraph runs until a blank line or the start of another kind of block.
    const body: string[] = [];
    while (i < lines.length) {
      const next = lines[i] ?? '';
      if (next.trim() === '') break;
      if (body.length > 0 && (FENCE.test(next) || HEADING.test(next) || ITEM.test(next))) break;
      body.push(next.trim());
      i++;
    }
    blocks.push({ type: 'paragraph', children: parseInline(body.join(' ')) });
  }
  return blocks;
}

/** Text without markup, for previews and search. */
export function markdownToPlain(src: string, limit = 200): string {
  const plain = src
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~|-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > limit ? `${plain.slice(0, limit - 1)}…` : plain;
}
