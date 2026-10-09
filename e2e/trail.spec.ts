import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('the Trail marks the way up, and can isolate the branch', async ({ page }) => {
  await page.goto('/?demo=14');
  const all = await page.getByRole('treeitem').count();

  await page.getByRole('treeitem', { name: 'Research' }).click();
  const pill = page.getByRole('group', { name: 'Trail', exact: true });
  await expect(pill).toBeVisible();
  await expect(page.locator('.topic[data-trail]')).not.toHaveCount(0);
  await expect(page.locator('.link[data-trail]')).not.toHaveCount(0);
  await expect(page.locator('.topic[data-dim]')).toHaveCount(0);

  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await pill.getByRole('button', { name: 'Isolate' }).click();
  await expect.poll(() => page.getByRole('treeitem').count()).toBeLessThan(all);

  await pill.getByRole('button', { name: 'Highlight' }).click();
  await expect.poll(() => page.getByRole('treeitem').count()).toBe(all);
  await expect(page.locator('.topic[data-dim]')).toHaveCount(0);

  // None stops the marks but keeps the bar, so the choice can be undone from it.
  await pill.getByRole('button', { name: 'None' }).click();
  await expect(pill).toBeVisible();
  await expect(page.locator('[data-trail]')).toHaveCount(0);
  await expect(pill.getByRole('button', { name: 'None' })).toHaveAttribute('aria-pressed', 'true');

  // The r key flips the highlight, and the Core has no way up to show.
  const tree = page.getByRole('tree', { name: 'Mind map' });
  await tree.focus();
  await page.keyboard.press('r');
  await expect(pill.getByRole('button', { name: 'Highlight' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('.topic[data-trail]')).not.toHaveCount(0);
  // Walking up to the Core leaves nothing above it to show.
  await tree.focus();
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowLeft');
  await expect(pill).toHaveCount(0);
});

test('the Trail switch in Settings sits on one line and turns the Trail off', async ({ page }) => {
  await page.goto('/?demo=14');
  await page.getByRole('treeitem', { name: 'Research' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  const toggle = page.getByRole('switch', { name: 'Trail' });
  await toggle.scrollIntoViewIfNeeded();
  const label = page.locator('.pref-toggle', { has: toggle }).locator('.pref-label');
  const [a, b] = [await label.boundingBox(), await toggle.boundingBox()];
  expect(
    Math.abs((a?.y ?? 0) + (a?.height ?? 0) / 2 - ((b?.y ?? 0) + (b?.height ?? 0) / 2)),
  ).toBeLessThan(30);
  expect((b?.x ?? 0) > (a?.x ?? 0)).toBe(true);

  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await toggle.click();
  await expect(page.getByRole('group', { name: 'Trail', exact: true })).toHaveCount(0);
  await expect(page.locator('[data-trail]')).toHaveCount(0);
  await toggle.click();
  await expect(page.getByRole('group', { name: 'Trail', exact: true })).toBeVisible();
});

test('Trail lines march, and stay solid with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/?demo=14');
  await page.getByRole('treeitem', { name: 'Research' }).click();
  const line = page.locator('.link[data-trail] .connector').first();
  await expect(line).toHaveCSS('animation-name', 'trail-march');
  await expect(line).toHaveCSS('stroke-dasharray', /9/);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(line).toHaveCSS('animation-name', 'none');
  await expect(line).toHaveCSS('stroke-dasharray', 'none');
});

test('a line fades to the interactive colour when pointed at', async ({ page }) => {
  await page.goto('/?demo=14');
  const link = page.locator('.link:not([data-trail])').first();
  const before = await link.locator('.connector').evaluate((el) => getComputedStyle(el).stroke);
  // Elbows share a trunk and bend, so point at the straight run that enters the child instead.
  const spot = await link.locator('.connector').evaluate((el: SVGPathElement) => {
    const point = el.getPointAtLength(el.getTotalLength() - 6);
    const m = el.getScreenCTM();
    return m
      ? { x: m.a * point.x + m.c * point.y + m.e, y: m.b * point.x + m.d * point.y + m.f }
      : null;
  });
  expect(spot).not.toBeNull();
  await page.mouse.move(spot?.x ?? 0, spot?.y ?? 0);
  await expect(link.locator('.connector')).not.toHaveCSS('stroke', before);
  await expect(link.locator('.connector')).toHaveCSS('stroke', /0\.6/);
});

test('a status bar at the bottom shows the path of the Trail', async ({ page }) => {
  await page.goto('/?demo=14');
  const bar = page.getByRole('navigation', { name: 'Path to the Core' });
  await page.getByRole('treeitem', { name: 'Research' }).click();
  await expect(bar).toBeVisible();
  await expect(bar.getByRole('listitem')).toHaveText([
    'Product launch',
    'Insights',
    'Roadmap and follow-up plan',
    'Research',
  ]);
  await expect(bar.locator('[aria-current="location"]')).toHaveText('Research');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  // A step on the path selects that topic.
  await bar.getByRole('button', { name: 'Insights' }).click();
  await expect(page.getByRole('treeitem', { name: 'Insights', selected: true })).toBeVisible();
  await expect(bar.locator('[aria-current="location"]')).toHaveText('Insights');

  // None stops the highlight but the path stays; only turning the Trail off in Settings removes it.
  await page
    .getByRole('group', { name: 'Trail', exact: true })
    .getByRole('button', { name: 'None' })
    .click();
  await expect(page.locator('[data-trail]')).toHaveCount(0);
  await expect(bar).toBeVisible();

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('switch', { name: 'Trail' }).click();
  await expect(bar).toHaveCount(0);
});

test('topics on the Trail keep their border and set their text in the interactive colour', async ({
  page,
}) => {
  await page.goto('/?demo=14');
  await page.getByRole('treeitem', { name: 'Research' }).click();
  const onTrail = page.locator('.topic[data-trail]:not([data-depth="0"])');
  expect(await onTrail.count()).toBeGreaterThan(1);
  const read = (topic: ReturnType<typeof page.locator>) =>
    topic.evaluate((el) => {
      const box = getComputedStyle(el.querySelector('.topic-box') as Element);
      const text = getComputedStyle(el.querySelector('.topic-text') as Element);
      return {
        text: text.fill,
        fill: box.fill,
        stroke: box.stroke,
        width: box.strokeWidth,
        dash: box.strokeDasharray,
      };
    });
  const accent = await page.evaluate(() => {
    const probe = document.createElement('i');
    probe.style.color = 'var(--color-accent)';
    document.body.append(probe);
    const colour = getComputedStyle(probe).color;
    probe.remove();
    return colour;
  });
  let plainText = '';
  for (const topic of await onTrail.all()) {
    const depth = await topic.getAttribute('data-depth');
    // Compare with an untouched topic of the same level, since levels have their own borders.
    const off = page.locator(`.topic[data-depth="${depth}"]:not([data-trail])`).first();
    const plain = await read(off);
    plainText = plain.text;
    const mark = await read(topic);
    expect(mark.text).toBe(accent);
    expect(mark.fill).toBe(plain.fill);
    expect(mark.stroke).toBe(plain.stroke);
    expect(mark.width).toBe(plain.width);
    expect(mark.dash).toBe('none');
  }
  expect(plainText).not.toBe(accent);
});
