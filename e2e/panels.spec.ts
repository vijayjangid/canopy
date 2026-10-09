import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { mapPanel } from './panels';

test('clicking a topic opens its details, and the close button hides them', async ({ page }) => {
  await page.goto('/?demo=14&plan=1');
  const details = page.getByRole('complementary', { name: 'Inspector' });
  await expect(details).toHaveCount(0);
  // There is no stripe for details: nothing shows until a topic is clicked.
  await expect(page.getByRole('navigation', { name: 'Details' })).toHaveCount(0);

  await page.locator('.topic[data-depth="1"]').first().click();
  await expect(details).toBeVisible();
  await expect(details.getByRole('region', { name: 'Properties' })).toBeVisible();
  await expect(details.getByRole('region', { name: 'Stickers' })).toBeVisible();
  await expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await details.getByRole('button', { name: 'Close details' }).click();
  await expect(details).toHaveCount(0);
  await page.locator('.topic[data-depth="1"]').nth(1).click();
  await expect(details).toBeVisible();
});

test('Stickers is a plain section with a heading, not a fold', async ({ page }) => {
  await page.goto('/?demo=14');
  await page.locator('.topic[data-depth="1"]').first().click();
  const region = page.getByRole('region', { name: 'Stickers' });
  await expect(region.getByRole('heading', { name: 'Stickers' })).toBeVisible();
  await expect(region.getByRole('searchbox', { name: 'Search stickers' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Stickers/ })).toHaveCount(0);
});

test('the left panel opens from its stripe, switches tabs and collapses', async ({ page }) => {
  await page.goto('/?demo=14');
  await expect(mapPanel(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(mapPanel(page).getByRole('tab', { name: 'Settings', selected: true })).toBeVisible();
  await expect(mapPanel(page).getByRole('tab', { name: 'Filter' })).toHaveCount(0);
  await mapPanel(page).getByRole('tab', { name: 'Tags' }).click();
  await expect(mapPanel(page).getByRole('heading', { name: 'Tags' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(mapPanel(page)).toHaveCount(0);

  // The strip keeps its names, and clicking the open tab again closes the panel.
  const strip = page.getByRole('navigation', { name: 'Map tools' });
  await expect(strip.getByRole('button', { name: 'Export' })).toBeVisible();
  await strip.getByRole('button', { name: 'Export' }).click();
  await expect(mapPanel(page).getByRole('tab', { name: 'Export', selected: true })).toBeVisible();
  await mapPanel(page).getByRole('tab', { name: 'Export' }).click();
  await expect(mapPanel(page)).toHaveCount(0);
  await expect(strip).toBeVisible();

  // The close button does the same.
  await strip.getByRole('button', { name: 'Settings' }).click();
  await mapPanel(page).getByRole('button', { name: 'Close panel' }).click();
  await expect(mapPanel(page)).toHaveCount(0);
});

test('the top bar stays short', async ({ page }) => {
  await page.goto('/');
  const bar = page.locator('.app-bar');
  // The colour mode switch is one control with three options, so it counts once.
  const buttons = await bar.getByRole('button').count();
  const modes = await bar.getByRole('group', { name: 'Colour mode' }).getByRole('button').count();
  expect(buttons - modes + 1).toBeLessThanOrEqual(6);
});

test('the selected topic is marked apart from its own border colour', async ({ page }) => {
  await page.goto('/?demo=14');
  const topic = page.locator('.topic[data-depth="1"]').first();
  await topic.click();
  const selected = page.locator('.topic[data-selected]');
  const ring = await selected.locator('.topic-ring').evaluate((el) => getComputedStyle(el).stroke);
  const border = await selected.locator('.topic-box').evaluate((el) => getComputedStyle(el).stroke);
  expect(ring).not.toBe(border);
  await expect(selected.locator('.topic-wash')).toHaveCount(1);
});

test('the details panel slides in from the right edge, and only when it opens', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/?demo=14');
  // Watch for the panel to appear, and record where it starts.
  await page.evaluate(() => {
    const w = window as unknown as { __slide?: { left: number; animations: number } };
    const watch = new MutationObserver(() => {
      const panel = document.querySelector('.panel-right');
      if (!panel || w.__slide) return;
      w.__slide = {
        left: panel.getBoundingClientRect().left,
        animations: panel.getAnimations().length,
      };
    });
    watch.observe(document.body, { childList: true, subtree: true });
  });
  await page.locator('.topic[data-depth="1"]').first().click();
  const start = await page.evaluate(
    () => (window as unknown as { __slide?: { left: number; animations: number } }).__slide ?? null,
  );
  expect(start).not.toBeNull();
  expect(start?.animations).toBeGreaterThan(0);
  // It begins past the right edge of the window.
  const width = await page.evaluate(() => window.innerWidth);
  expect(start?.left).toBeGreaterThanOrEqual(width);
  // The page itself never scrolls sideways to follow it.
  expect(await page.evaluate(() => window.scrollX)).toBe(0);
  // And it settles inside the window.
  await expect
    .poll(() => page.locator('.panel-right').evaluate((el) => el.getBoundingClientRect().right))
    .toBeLessThan(width);

  // Picking another topic keeps the same panel, with no new slide.
  await page.locator('.topic[data-depth="1"]').nth(1).click();
  expect(await page.locator('.panel-right').evaluate((el) => el.getAnimations().length)).toBe(0);
});

test('the details panel just appears when reduced motion is asked for', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?demo=14');
  await page.locator('.topic[data-depth="1"]').first().click();
  await expect(page.locator('.panel-right')).toHaveCSS('animation-name', 'none');
});
