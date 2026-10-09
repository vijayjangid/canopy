import { expect, test } from '@playwright/test';

test('undo and redo sit in the middle of the app bar', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 600 });
  await page.goto('/');
  const [bar, history] = await Promise.all([
    page.locator('.app-bar').boundingBox(),
    page.getByRole('group', { name: 'History' }).boundingBox(),
  ]);
  if (!bar || !history) throw new Error('missing');
  expect(Math.abs(history.x + history.width / 2 - (bar.x + bar.width / 2))).toBeLessThan(2);
});

test('the map name is a menu button with a chevron, and double-clicking renames it', async ({
  page,
}) => {
  await page.goto('/');
  const button = page.getByRole('button', { name: /^File menu/ });
  await expect(button.locator('.icon')).toHaveCount(1);
  await button.click();
  await expect(page.getByRole('menuitem', { name: 'New map' })).toBeVisible();
  await page.keyboard.press('Escape');

  await button.dblclick();
  const field = page.getByRole('textbox', { name: 'Map title' });
  await expect(field).toBeFocused();
  await field.fill('Plan B');
  await field.press('Enter');
  await expect(page.getByRole('button', { name: 'File menu: Plan B' })).toBeVisible();
});

test('the File menu is wide and tall enough, and lists saved maps in small type', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.getByRole('tree', { name: 'Mind map' }).focus();
  await page.keyboard.press('Tab');
  await page.keyboard.type('Something');
  await page.keyboard.press('Shift+Tab');
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: /^File menu/ }).click();
  const menu = page.getByRole('menu', { name: 'File' });
  const box = await menu.boundingBox();
  if (!box) throw new Error('missing');
  expect(box.width).toBeGreaterThanOrEqual(340);
  const maps = menu.getByRole('menuitemradio').first();
  await expect(maps).toBeVisible();
  const size = await maps.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(size).toBeLessThanOrEqual(13);
  // Nothing needs scrolling with a handful of entries.
  expect(await menu.evaluate((el) => el.scrollHeight <= el.clientHeight)).toBe(true);
});
