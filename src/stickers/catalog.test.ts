import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { STICKER_ART, StickerArt } from './art';
import { searchStickers, stickerName, STICKERS } from './catalog';

describe('sticker collection', () => {
  it('registers and draws the full sticker sheet', () => {
    const keys = [
      'home',
      'idea',
      'bug',
      'love',
      'celebrate',
      'thumbs-up',
      'thumbs-down',
      'check',
      'cross',
      'warning',
      'question',
      'pause',
      'delay',
      'flag',
      'pin',
      'arrow-up',
      'arrow-down',
      'p1',
      'p2',
      'p3',
      'p4',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ];
    expect(STICKERS.map((sticker) => sticker.key)).toEqual(keys);
    expect(Object.keys(STICKER_ART).sort()).toEqual([...keys].sort());
  });

  it('uses readable labels and searchable synonyms', () => {
    expect(stickerName('p3')).toBe('Priority 3');
    expect(stickerName('thumbs-down')).toBe('Thumbs down');
    expect(stickerName('check')).toBe('Check');
    expect(stickerName('arrow-up')).toBe('Arrow up');
    expect(stickerName('arrow-down')).toBe('Arrow down');
    expect(stickerName('pause')).toBe('Pause');
    expect(stickerName('monday')).toBe('Monday');
    expect(searchStickers('wed').map((sticker) => sticker.key)).toEqual(['wednesday']);
    expect(searchStickers('increase').map((sticker) => sticker.key)).toEqual(['arrow-up']);
    expect(searchStickers('decrease').map((sticker) => sticker.key)).toEqual(['arrow-down']);
    expect(searchStickers('hold').map((sticker) => sticker.key)).toEqual(['pause']);
    expect(searchStickers('heart').map((sticker) => sticker.key)).toEqual(['love']);
    expect(searchStickers('win').map((sticker) => sticker.key)).toEqual(['celebrate']);
    expect(searchStickers('+1')).toEqual([]);
    expect(searchStickers('priority').map((sticker) => sticker.key)).toEqual([
      'p1',
      'p2',
      'p3',
      'p4',
    ]);
  });

  it('draws priorities as handwritten die-cut lettering', () => {
    for (const level of [1, 2, 3, 4]) {
      const parts = STICKER_ART[`p${level}`] ?? [];
      expect(parts).toHaveLength(1);
      expect(parts[0]).toMatchObject({
        t: 'text',
        value: `P${level}`,
        size: 20,
        fontWeight: 900,
        fontFamily: "'Kalam', 'Comic Sans MS', cursive",
      });
      expect(parts[0]).toMatchObject({ stroke: parts[0]?.fill, w: 0.8 });
    }
  });

  it('draws weekdays as handwritten abbreviation cutouts without badge backgrounds', () => {
    const weekdays = [
      ['monday', 'MON', ['#39c6ff', '#4d8dff', '#875cf6']],
      ['tuesday', 'TUE', ['#35b9f4', '#5286ee', '#945ceb']],
      ['wednesday', 'WED', ['#4cabeb', '#5d84f0', '#a15de5']],
      ['thursday', 'THU', ['#5b9fe4', '#667fe7', '#a961db']],
      ['friday', 'FRI', ['#6a95db', '#6e7fde', '#b662d1']],
      ['saturday', 'SAT', ['#7a8bd2', '#7778d5', '#c067c8']],
      ['sunday', 'SUN', ['#8b80c8', '#806fca', '#c66bbf']],
    ] as const;

    expect(STICKERS.slice(-7).map((sticker) => sticker.key)).toEqual(weekdays.map(([key]) => key));

    for (const [key, value, gradient] of weekdays) {
      const parts = STICKER_ART[key] ?? [];
      expect(parts).toHaveLength(1);
      expect(parts[0]).toMatchObject({
        t: 'text',
        value,
        size: 16,
        fontWeight: 900,
        fontFamily: "'Kalam', 'Comic Sans MS', cursive",
        scaleX: 0.8,
        scaleY: 1.25,
        w: 0.8,
      });
      expect(parts[0]?.gradient).toEqual(gradient);
      expect(parts[0]?.fill).toBeUndefined();
      expect(parts[0]?.cutout).not.toBe(false);
    }
  });

  it('renders a unique gradient for each weekday sticker instance', () => {
    const markup = renderToStaticMarkup(
      createElement(
        'svg',
        null,
        createElement(StickerArt, { name: 'monday' }),
        createElement(StickerArt, { name: 'monday' }),
      ),
    );
    const gradientIds = [...markup.matchAll(/<linearGradient id="([^"]+)"/g)].map(
      (match) => match[1],
    );

    expect(gradientIds).toHaveLength(2);
    expect(new Set(gradientIds).size).toBe(2);
    for (const id of gradientIds) {
      expect(markup).toContain(`fill="url(#${id})"`);
      expect(markup).toContain(`stroke="url(#${id})"`);
    }
    expect(markup).toContain('stroke-width="0.8"');
    expect(markup.match(/<stop\b/g)).toHaveLength(6);
  });

  it('uses standard detail strokes and heavier status-symbol strokes', () => {
    const strokeWeights = Object.values(STICKER_ART)
      .flat()
      .flatMap((part) => ('w' in part && part.w !== undefined ? [part.w] : []));

    expect(strokeWeights.length).toBeGreaterThan(0);
    expect(new Set(strokeWeights)).toEqual(new Set([0.8, 2, 2.5]));
  });

  it('draws Pause as a circular badge with two rounded bars', () => {
    expect(STICKER_ART.pause).toMatchObject([
      { t: 'circle', cx: 16, cy: 16, r: 13, fill: '#8b5cf6' },
      { t: 'rect', x: 10, y: 9, width: 4, height: 14, rx: 2, fill: '#ffffff' },
      { t: 'rect', x: 18, y: 9, width: 4, height: 14, rx: 2, fill: '#ffffff' },
    ]);
  });

  it('draws directional arrows as colored die-cut silhouettes', () => {
    for (const [key, fill] of [
      ['arrow-up', '#2ecc71'],
      ['arrow-down', '#ef476f'],
    ] as const) {
      const parts = STICKER_ART[key] ?? [];
      expect(parts).toHaveLength(1);
      expect(parts[0]).toMatchObject({ t: 'path', fill });
    }
  });

  it('gives check, cross, question, and warning distinct silhouettes', () => {
    expect(STICKER_ART.check?.[0]).toMatchObject({
      t: 'rect',
      x: 4.5,
      y: 5,
      width: 23,
      height: 22,
      rx: 4.5,
      fill: '#2ecc71',
    });
    expect(STICKER_ART.check?.[1]).toMatchObject({ stroke: '#ffffff', w: 2.5 });
    expect(STICKER_ART.cross?.[0]).toMatchObject({ t: 'circle', r: 13, fill: '#ef476f' });
    expect(STICKER_ART.cross?.[1]).toMatchObject({ stroke: '#ffffff', w: 2.5 });
    expect(STICKER_ART.question?.[0]).toMatchObject({ t: 'path', fill: '#4d8dff' });
    expect(STICKER_ART.question?.[1]).toMatchObject({
      t: 'path',
      stroke: '#ffffff',
      w: 2.5,
      cutout: false,
    });
    expect(STICKER_ART.question?.[2]).toMatchObject({
      t: 'circle',
      cx: 16.7,
      cy: 21.8,
      r: 1.05,
      fill: '#ffffff',
      cutout: false,
    });
    expect(STICKER_ART.warning?.[0]).toMatchObject({
      t: 'path',
      fill: '#ffc857',
      stroke: '#ff8c42',
      w: 2,
    });
    expect(STICKER_ART.warning?.[1]).toMatchObject({
      t: 'path',
      d: 'M16 13v5.5',
      stroke: '#4a4e69',
      w: 2.5,
      cutout: false,
    });
    expect(STICKER_ART.warning?.[2]).toMatchObject({
      t: 'circle',
      cy: 22.3,
      r: 1.25,
      fill: '#4a4e69',
      cutout: false,
    });
  });
});
