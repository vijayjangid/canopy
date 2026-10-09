import { describe, expect, it } from 'vitest';
import { computeLayout, type Measure } from '../layout';
import {
  addSticker,
  ensureTag,
  parseTitle,
  setProps,
  createMap,
  createSubTopic,
  setFolded,
  setNote,
  setPrefs,
  type CanopyMap,
} from '../model';
import { legibleOn, luminance, type ExportTheme } from './exportTheme';
import { fitScale, MAX_CANVAS_SIDE } from './raster';
import { mapToMarkdown } from './markdownExport';
import { buildSvg, escapeXml } from './svg';
import { safeName } from './download';

const measure: Measure = (topic) => ({ w: 60 + topic.title.length * 7, h: 36 });
const textWidth = (text: string) => text.length * 7;
const theme: ExportTheme = {
  look: 'minimal',
  bg: '#ffffff',
  accent: '#5b4bdb',
  level1: '#5b4bdb',
  selection: '#5b4bdb',
  topicBg: '#ffffff',
  topicBorder: '#c9cad4',
  topicText: '#1b1b1f',
  coreBg: '#5b4bdb',
  coreText: '#ffffff',
  connector: '#b4b5c3',
  muted: '#5f6068',
  surface: '#ffffff',
  good: '#2b8a3e',
  warn: '#c2410c',
  info: '#1c7ed6',
  pending: '#7048e8',
  fontStack: "'Source Serif 4', serif",
  levels: Array.from({ length: 6 }, (_, i) => ({ hue: `#00${i}000`, a: '#eeeeee', b: '#dddddd' })),
};

function sample(): CanopyMap {
  let map = createMap({ coreId: 'core' });
  map = createSubTopic(map, 'core', { id: 'a', title: 'Alpha & <Beta>' }).map;
  map = createSubTopic(map, 'core', { id: 'b', title: 'Second' }).map;
  map = createSubTopic(map, 'a', { id: 'a1', title: 'Deep' }).map;
  return map;
}

const draw = (map: CanopyMap, extra: Partial<Parameters<typeof buildSvg>[2]> = {}) =>
  buildSvg(map, computeLayout(map, { flow: map.prefs.flow, density: 'comfortable', measure }), {
    theme,
    textWidth,
    stickers: true,
    transparent: false,
    ...extra,
  });

describe('legibleOn', () => {
  it('keeps a readable colour and pulls a faint one toward the text colour', () => {
    expect(legibleOn('#0b5cad', '#ffffff', '#111111')).toBe('#0b5cad');
    const pulled = legibleOn('#ffe066', '#ffffff', '#111111');
    expect(pulled).not.toBe('#ffe066');
    expect(luminance(pulled)).toBeLessThan(0.3);
    expect(legibleOn('not a colour', '#ffffff', '#111111')).toBe('#111111');
  });
});

describe('SVG export', () => {
  it('draws every visible topic with escaped text', () => {
    const built = draw(sample());
    expect(built.topics).toBe(4);
    expect(built.svg.startsWith('<svg')).toBe(true);
    expect(built.svg).toContain('Alpha &#38; &#60;Beta&#62;');
    expect(built.svg).not.toContain('<Beta>');
    expect(built.svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('is one standalone file with no script or external references', () => {
    const { svg } = draw(sample());
    expect(svg).not.toMatch(/<script|<foreignObject|onload=|href="https?:/i);
  });

  it('leaves out the background when transparent', () => {
    expect(draw(sample(), { transparent: true }).svg).not.toContain('width="100%"');
    expect(draw(sample()).svg).toContain('width="100%"');
  });

  it('sticks stickers to the corners of topics only when asked', () => {
    const map = addSticker(addSticker(sample(), 'a', 'rocket'), 'a', 'star');
    const withStickers = draw(map).svg;
    expect(withStickers).toContain('class="stickers"');
    expect(withStickers.match(/<g transform="translate\([\d.]+ [\d.]+\) rotate\(/g)).toHaveLength(
      2,
    );
    expect(draw(map, { stickers: false }).svg).not.toContain('class="stickers"');
  });

  it('draws a note mark and tag chips under the title', () => {
    const tagged = ensureTag(sample(), 'big');
    const map = setProps(setNote(tagged.map, 'a', 'hello'), ['a'], {
      status: 'doing',
      tags: [tagged.key],
    });
    expect(draw(map).svg).toContain('r="5" fill="#5b4bdb"');
  });

  it('exports only the chosen branch and its sub-topics', () => {
    const built = draw(sample(), { roots: ['a'] });
    expect(built.topics).toBe(2);
    expect(built.svg).toContain('Deep');
    expect(built.svg).not.toContain('Second');
  });

  it('does not draw what is folded away, and shows a count instead', () => {
    const built = draw(setFolded(sample(), 'a', true));
    expect(built.svg).not.toContain('Deep');
    expect(built.svg).toContain('>1</text>');
  });

  it('follows the map styles: connector style, level numbers and Look colours', () => {
    const base = setPrefs(sample(), { connector: 'tapered', showLevels: true });
    const built = draw(base);
    expect(built.svg).toMatch(/Z"\s+fill=/);
    expect(built.svg).toContain('font-weight="400">1.1\u2005</tspan>');
    expect(built.svg).not.toContain('>0.');
    const playful = draw(setPrefs(sample(), { look: 'playful' }), {
      theme: { ...theme, look: 'playful' },
    });
    expect(playful.svg).toContain('url(#pg-1)');
    expect(playful.svg).toContain('stop-color="#eeeeee"');
    // Lines leaving the Core take the Core's colour.
    expect(playful.svg).toContain('stroke="#000000"');
  });

  it('embeds font rules when given, and sizes the picture to the map', () => {
    const built = draw(sample(), { fontCss: "@font-face{font-family:'X';}" });
    expect(built.svg).toContain('<style>@font-face');
    expect(built.width).toBeGreaterThan(100);
    expect(built.height).toBeGreaterThan(50);
  });

  it('draws Down layouts too', () => {
    const built = draw(setPrefs(sample(), { flow: 'down' }));
    expect(built.height).toBeGreaterThan(built.width / 4);
  });

  it('fits the picture on a page, centred, shrinking it only when it is too big', () => {
    const small = draw(sample(), { page: { width: 794, height: 1123 } });
    expect(small).toMatchObject({ width: 794, height: 1123, scale: 1 });
    expect(small.svg).toContain('viewBox="0 0 794 1123"');

    let map = sample();
    for (let i = 0; i < 40; i++) {
      map = createSubTopic(map, 'b', { id: `x${i}`, title: `Another topic number ${i}` }).map;
    }
    const big = draw(map, { page: { width: 794, height: 1123 } });
    expect(big.width).toBe(794);
    expect(big.scale).toBeLessThan(1);
    expect(big.svg).not.toContain('viewBox="0 0 794 1123"');
  });
});

describe('PNG sizing', () => {
  it('keeps the requested scale when the picture is small', () => {
    expect(fitScale(1000, 800, 4)).toBe(4);
  });
  it('lowers the scale to fit the canvas limit', () => {
    const s = fitScale(10000, 3000, 4);
    expect(s * 10000).toBeLessThanOrEqual(MAX_CANVAS_SIDE);
    expect(s).toBeLessThan(4);
  });
});

describe('Markdown outline', () => {
  const map = () => setNote(sample(), 'a', 'Line one\n\nLine two');

  it('nests topics under the Core title', () => {
    const text = mapToMarkdown(sample(), { notes: false });
    expect(text).toBe('# Central topic\n\n- Alpha & <Beta>\n  - Deep\n- Second\n');
  });

  it('adds notes when asked', () => {
    const text = mapToMarkdown(map(), { notes: true });
    expect(text).toContain('  Line one');
    expect(text).toContain('  Line two');
  });

  it('exports chosen branches as their own list', () => {
    expect(mapToMarkdown(sample(), { notes: false, roots: ['a'] })).toBe(
      '- Alpha & <Beta>\n  - Deep\n',
    );
  });
});

describe('helpers', () => {
  it('escapes markup characters', () => {
    expect(escapeXml(`<a href="x">'&'</a>`)).not.toMatch(/[<>"']/);
  });
  it('makes safe file names', () => {
    expect(safeName('a/b:c', 'png')).toBe('a-b-c.png');
    expect(safeName('   ', 'md')).toBe('Untitled map.md');
  });
});

describe('Markdown with shorthand', () => {
  it('writes properties so that typing the line back restores them', () => {
    const tag = ensureTag(sample(), 'Big launch');
    const map = setProps(tag.map, ['a'], {
      status: 'doing',
      due: { end: '2026-11-01' },
      tags: [tag.key],
    });
    const text = mapToMarkdown(map, { notes: false, tokens: true });
    const line = text.split('\n').find((l) => l.includes('Alpha')) ?? '';
    expect(line).toContain('/doing');
    expect(line).toContain('#Big_launch');
    const parsed = parseTitle(map, line.replace(/^\s*-\s*/, ''));
    expect(parsed.title).toBe('Alpha & <Beta>');
    expect(parsed.status).toBe('doing');
    expect(parsed.due).toBe('2026-11-01');
    expect(parsed.tags).toEqual(['Big launch']);
  });

  it('can leave out topics that a Filter does not pick', () => {
    const text = mapToMarkdown(sample(), { notes: false, only: new Set(['a', 'a1']) });
    expect(text).toContain('Deep');
    expect(text).not.toContain('Second');
  });
});
