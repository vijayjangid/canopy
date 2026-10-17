import { describe, expect, it } from 'vitest';
import { noteLines, NOTE_MAX_LINES } from './notePreview';

const style = { size: 12, weight: 400, lineHeight: 16 };
const width = (text: string) => text.length * 7;
const lines = (note: string, max = 220) => noteLines(note, style, max, width);
const text = (line: { runs: Array<{ text: string }> }) => line.runs.map((r) => r.text).join('');

describe('note preview', () => {
  it('lays out a list with markers and a checklist', () => {
    const out = lines('- one\n- [ ] two\n- [x] three\n\n1. first');
    expect(out.map((l) => l.marker?.kind)).toEqual(['bullet', 'todo', 'done', 'number']);
    expect(out.map(text)).toEqual(['one', 'two', 'three', 'first']);
  });

  it('keeps bold, links and code as styled runs', () => {
    const [line] = lines('a **b** [c](https://example.com) `d`');
    expect(line?.runs.map((r) => [r.text, !!r.bold, !!r.link, !!r.code])).toEqual([
      ['a ', false, false, false],
      ['b', true, false, false],
      [' ', false, false, false],
      ['c', false, true, false],
      [' ', false, false, false],
      ['d', false, false, true],
    ]);
  });

  it('keeps where a link goes, including across its spaces', () => {
    const [line] = lines('[the docs](https://example.com)');
    expect(line?.runs).toEqual([{ text: 'the docs', link: true, href: 'https://example.com' }]);
  });

  it('wraps long text to the width, and splits words that are too long', () => {
    const out = lines('alpha beta gamma delta epsilon', 100);
    expect(out.length).toBeGreaterThan(1);
    for (const line of out) expect(line.width).toBeLessThanOrEqual(100);
    const word = lines('x'.repeat(60), 100);
    expect(word.length).toBeGreaterThan(1);
    expect(word.map(text).join('')).toBe('x'.repeat(60));
  });

  it('indents nested items, quotes and headings', () => {
    const out = lines('# Title\n- a\n  - b\n\n> quoted');
    expect(out[0]).toMatchObject({ heading: true });
    expect(out[2]?.x).toBeGreaterThan(out[1]?.x ?? 0);
    expect(out[3]?.bar).toBeDefined();
  });

  it('cuts a long note and marks the cut', () => {
    const out = lines(Array.from({ length: 30 }, (_, i) => `- ${i}`).join('\n'));
    expect(out).toHaveLength(NOTE_MAX_LINES);
    expect(text(out[NOTE_MAX_LINES - 1]!)).toMatch(/…$/);
  });

  it('draws nothing for blank notes', () => {
    expect(lines('  \n ')).toEqual([]);
  });
});
