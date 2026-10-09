import { expect, test, type Locator, type Page } from '@playwright/test';

// Tabs and segmented controls draw one shared indicator, which glides to the picked option.

const slow = (page: Page) =>
  page.addStyleTag({ content: ':root{--motion-quick:1200ms !important}' });

/** Where the indicator is drawn, in px across the group. `after` is the tab bar, `before` the pill. */
const indicatorX = (group: Locator, which: 'before' | 'after') =>
  group.evaluate((el, w) => {
    const t = getComputedStyle(el, `::${w}`).transform;
    return t === 'none' ? 0 : Number(t.replace(/matrix\(|\)/g, '').split(',')[4]);
  }, which);

const pickedLeft = (group: Locator) =>
  group.evaluate((el) => {
    const picked = Array.from(el.children).find(
      (c) =>
        c.getAttribute('aria-pressed') === 'true' || c.getAttribute('aria-selected') === 'true',
    ) as HTMLElement | undefined;
    return picked ? picked.offsetLeft : -1;
  });

async function glides(page: Page, group: Locator, which: 'before' | 'after', click: Locator) {
  await expect(group).toHaveAttribute('data-slide', 'ready');
  const from = await indicatorX(group, which);
  await click.click();
  await page.waitForTimeout(300);
  const mid = await indicatorX(group, which);
  const to = await pickedLeft(group);
  // Part of the way there: moved off the start, and not yet at the end.
  expect(Math.abs(mid - from)).toBeGreaterThan(1);
  expect(Math.abs(to - mid)).toBeGreaterThan(1);
  // And it ends on the picked option.
  await expect.poll(() => indicatorX(group, which), { timeout: 4000 }).toBeCloseTo(to, 0);
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
});

test('the colour mode pill glides between options', async ({ page }) => {
  await page.goto('/?demo=10');
  await slow(page);
  const group = page.getByRole('group', { name: 'Colour mode' });
  await glides(page, group, 'before', group.getByRole('button', { name: 'Dark', exact: true }));
  await expect(group.getByRole('button', { name: 'Dark', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('a segmented choice in Settings glides, wherever it is', async ({ page }) => {
  await page.goto('/?demo=10');
  await slow(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const group = page.getByRole('group', { name: 'Theme' }).locator('.segmented');
  await glides(page, group, 'before', group.getByRole('button', { name: 'Playful' }));
});

test('the left panel tab bar glides from tab to tab', async ({ page }) => {
  await page.goto('/?demo=10');
  await slow(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const tabs = page.getByRole('tablist', { name: 'Map panel sections' });
  await glides(page, tabs, 'after', tabs.getByRole('tab', { name: 'Export' }));
});

test('the details panel tab bar glides between Details and Note', async ({ page }) => {
  await page.goto('/?demo=10');
  await slow(page);
  await page.locator('.topic[data-depth="1"]').first().click();
  const tabs = page.getByRole('tablist', { name: 'Topic details' });
  await glides(page, tabs, 'after', tabs.getByRole('tab', { name: 'Note' }));
});

test('a group that has just appeared does not slide in from the corner', async ({ page }) => {
  await page.goto('/?demo=10');
  await slow(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const tabs = page.getByRole('tablist', { name: 'Map panel sections' });
  // The bar is already under the open tab on the first frame it is drawn.
  await expect.poll(() => indicatorX(tabs, 'after')).toBeCloseTo(await pickedLeft(tabs), 0);
});

test('nothing glides when reduced motion is asked for', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?demo=10');
  const group = page.getByRole('group', { name: 'Colour mode' });
  await expect(group).toHaveAttribute('data-slide', 'ready');
  const duration = await group.evaluate(
    (el) => getComputedStyle(el, '::before').transitionDuration,
  );
  expect(duration.split(',').every((d) => parseFloat(d) === 0)).toBe(true);
});
