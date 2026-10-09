import { expect, test, type Page } from '@playwright/test';

const tree = (page: Page) => page.getByRole('tree', { name: 'Mind map' });

/** A chain of levels, each with a fairly long name, ending on the last one. */
async function chain(page: Page, names: string[]) {
  await page.goto('/');
  await tree(page).focus();
  for (const name of names) {
    await page.keyboard.press('Tab');
    await page.keyboard.type(name);
  }
  await page.keyboard.press('Shift+Tab');
  await page.waitForTimeout(400);
}

/** Whether any name in the path is cut short with an ellipsis. */
const clipped = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.status-bar .trail-path:not(.trail-ghost) li > *:first-child')]
      .filter((el) => !el.classList.contains('icon') && el.tagName !== 'svg')
      .some((el) => el.scrollWidth > el.clientWidth + 1),
  );

const gaps = (page: Page) => page.locator('.status-bar .trail-gap');

test('the Core alone is shown in full, not cut to "Cen…"', async ({ page }) => {
  await page.goto('/');
  const current = page.locator('.status-bar .trail-current');
  await expect(current).toHaveText('Central topic');
  expect(await clipped(page)).toBe(false);
});

test('a long path is shown whole while there is room for it', async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 720 });
  await chain(page, [
    'Channels and portals',
    'Landing pages',
    'Templates for the default page',
    'Layout options',
    'Narrow wide variant',
    'Dynamic sections',
    'Banner widgets',
    'Final level here',
  ]);
  await expect(gaps(page)).toHaveCount(0);
  expect(await clipped(page)).toBe(false);
  // Every level is there, including the ones the old limit of six would have hidden.
  await expect(page.locator('.status-bar .trail-path:not(.trail-ghost) li')).toHaveCount(9);
});

test('levels fold only when the bar runs out of room, and come back when it widens', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1500, height: 720 });
  await chain(page, [
    'Channels and portals',
    'Landing pages',
    'Templates for the default page',
    'Layout options',
    'Narrow wide variant',
    'Dynamic sections',
    'Banner widgets',
    'Final level here',
  ]);
  await expect(gaps(page)).toHaveCount(0);

  await page.setViewportSize({ width: 760, height: 720 });
  await expect(gaps(page)).toHaveCount(1);
  // The current topic and the first level are still there, and the gap names what it hides.
  await expect(page.locator('.status-bar .trail-current')).toHaveText('Final level here');
  await expect(gaps(page)).toHaveAttribute('title', /Landing pages/);

  await page.setViewportSize({ width: 1500, height: 720 });
  await expect(gaps(page)).toHaveCount(0);
  expect(await clipped(page)).toBe(false);
});

test('names shorten only as a last resort, and the current topic holds out longest', async ({
  page,
}) => {
  await page.setViewportSize({ width: 420, height: 720 });
  await chain(page, ['A very long first level name', 'Second', 'The current topic name']);
  const current = page.locator('.status-bar .trail-current');
  await expect(current).toBeVisible();
  const first = page.locator('.status-bar .trail-path:not(.trail-ghost) li button').first();
  const [cur, firstFits] = await Promise.all([
    current.evaluate((el) => el.scrollWidth - el.clientWidth),
    first.evaluate((el) => el.scrollWidth - el.clientWidth),
  ]);
  // Whatever has to be cut is cut from the earlier levels before the current one.
  expect(firstFits).toBeGreaterThanOrEqual(cur);
});
