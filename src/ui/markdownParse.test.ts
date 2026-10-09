import { describe, expect, it } from 'vitest';
import { markdownToPlain, parseInline, parseMarkdown } from './markdownParse';

describe('inline Markdown', () => {
  it('reads bold, italic, strike and code', () => {
    expect(parseInline('a **b** *c* ~~d~~ `e`').map((n) => n.type)).toEqual([
      'text',
      'strong',
      'text',
      'em',
      'text',
      'del',
      'text',
      'code',
    ]);
  });

  it('keeps web and mail links and turns bare addresses into links', () => {
    const [link] = parseInline('[Site](https://example.com)');
    expect(link).toMatchObject({ type: 'link', href: 'https://example.com' });
    expect(parseInline('see https://example.com now').some((n) => n.type === 'link')).toBe(true);
    expect(parseInline('[Mail](mailto:a@b.co)')[0]).toMatchObject({ type: 'link' });
  });

  it('never makes a link from a script address', () => {
    for (const bad of ['javascript:alert(1)', 'data:text/html,hi', 'vbscript:x', ' javascript:x']) {
      const nodes = parseInline(`[x](${bad.trim()})`);
      expect(nodes.every((n) => n.type !== 'link')).toBe(true);
    }
  });

  it('treats raw HTML as text', () => {
    const nodes = parseInline('<img src=x onerror=alert(1)> <script>x</script>');
    expect(nodes.every((n) => n.type === 'text')).toBe(true);
  });

  it('honours escapes', () => {
    expect(parseInline('\\*not italic\\*')).toEqual([{ type: 'text', text: '*not italic*' }]);
  });
});

describe('block Markdown', () => {
  it('reads headings, paragraphs and rules', () => {
    const blocks = parseMarkdown('# Title\n\nSome text\nmore text\n\n---');
    expect(blocks.map((b) => b.type)).toEqual(['heading', 'paragraph', 'rule']);
    expect(blocks[1]).toMatchObject({ type: 'paragraph' });
  });

  it('reads lists, tasks and nesting', () => {
    const [list] = parseMarkdown('- [x] done\n- [ ] todo\n  - inner\n- plain');
    expect(list).toMatchObject({ type: 'list', ordered: false });
    if (list?.type !== 'list') throw new Error('expected a list');
    expect(list.items.map((i) => i.checked)).toEqual([true, false, undefined]);
    expect(list.items[1]?.nested[0]?.type).toBe('list');
  });

  it('reads fenced code without interpreting its contents', () => {
    const [code] = parseMarkdown('```ts\nconst a = **1**;\n```');
    expect(code).toEqual({ type: 'code', lang: 'ts', text: 'const a = **1**;' });
  });

  it('reads tables', () => {
    const [table] = parseMarkdown('| A | B |\n| - | - |\n| 1 | 2 |');
    expect(table).toMatchObject({ type: 'table' });
    if (table?.type !== 'table') throw new Error('expected a table');
    expect(table.head).toHaveLength(2);
    expect(table.rows).toHaveLength(1);
  });

  it('reads quotes', () => {
    const [quote] = parseMarkdown('> quoted\n> text');
    expect(quote?.type).toBe('quote');
  });

  it('survives deep nesting and odd input', () => {
    expect(() => parseMarkdown('>'.repeat(5000) + ' x')).not.toThrow();
    expect(() => parseInline('*'.repeat(5000))).not.toThrow();
    expect(() => parseMarkdown('\u0000\n|||\n- \n1)')).not.toThrow();
  });
});

describe('markdownToPlain', () => {
  it('strips markup and shortens', () => {
    expect(markdownToPlain('# Hi **there** [x](https://a.b)')).toBe('Hi there x');
    expect(markdownToPlain('a'.repeat(300), 10)).toHaveLength(10);
  });
});
