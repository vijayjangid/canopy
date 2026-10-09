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
