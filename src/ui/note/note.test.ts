import { Editor } from '@tiptap/core';
import { describe, expect, it } from 'vitest';
import { noteExtensions } from './extensions';

const roundTrip = (md: string) => {
  const editor = new Editor({ extensions: noteExtensions(), content: md, contentType: 'markdown' });
  const out = editor.getMarkdown();
  editor.destroy();
  return out;
};

describe('note editor Markdown', () => {
  it.each([
    '# Title\n\nSome **bold**, *italic*, ~~gone~~ and `code`.',
    '- one\n- two\n  - nested',
    '1. first\n2. second',
    '- [ ] todo\n- [x] done',
    '[the docs](https://example.com)',
    '> quoted',
    '```\ncode\n```',
    '---',
  ])('keeps %j', (md) => {
    expect(roundTrip(md).trim()).toBe(md);
  });

  it('never draws a link that is not a web or mail address', () => {
    const editor = new Editor({
      extensions: noteExtensions(),
      content: '[x](javascript:alert(1)) [y](https://example.com)',
      contentType: 'markdown',
    });
    const html = editor.getHTML();
    editor.destroy();
    expect(html).not.toContain('href="javascript:');
    expect(html).toContain('href="https://example.com"');
  });
});
