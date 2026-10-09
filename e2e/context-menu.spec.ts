import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const topic = (page: import('@playwright/test').Page) =>
  page.locator('.topic[data-depth="1"]').first();

test('right-clicking a topic offers its actions and adds a sub-topic', async ({ page }) => {
  await page.goto('/?demo=14');
  await page.waitForSelector('.topic');
  const before = await page.locator('.topic').count();
  await topic(page).click({ button: 'right' });
  const menu = page.getByRole('menu', { name: 'Topic actions' });
  await expect(menu).toBeVisible();
  for (const name of ['Add sub-topic', 'Add peer below', 'Cut', 'Copy', 'Duplicate', 'Add tag…']) {
    await expect(menu.getByRole('menuitem', { name: new RegExp(`^${name}`) })).toBeVisible();
  }
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await menu.getByRole('menuitem', { name: /^Add sub-topic/ }).click();
  await expect(menu).toHaveCount(0);
  await expect(page.locator('.topic')).toHaveCount(before + 1);
});

test('the menu moves with arrow keys and closes with Escape', async ({ page }) => {
  await page.goto('/?demo=14');
  await page.waitForSelector('.topic');
  await topic(page).click({ button: 'right' });
  const menu = page.getByRole('menu', { name: 'Topic actions' });
  await expect(menu.getByRole('menuitem').first()).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(menu.getByRole('menuitem').nth(1)).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  await expect(page.getByRole('tree', { name: 'Mind map' })).toBeFocused();
});

test('copy then paste from the menu duplicates a topic under another', async ({ page }) => {
  await page.goto('/?demo=14');
  await page.waitForSelector('.topic');
  const before = await page.locator('.topic').count();
  await topic(page).click({ button: 'right' });
  await page.getByRole('menuitem', { name: /^Copy/ }).click();
  await topic(page).click({ button: 'right' });
  await page.getByRole('menuitem', { name: /^Paste as sub-topics/ }).click();
  await expect(page.locator('.topic')).not.toHaveCount(before);
});

test('right-clicking empty canvas offers map actions', async ({ page }) => {
  await page.goto('/?demo=14');
  await page.waitForSelector('.topic');
  await page.mouse.click(1240, 90, { button: 'right' });
  const menu = page.getByRole('menu', { name: 'Map actions' });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: /^Unfold everything/ })).toBeVisible();
  await menu.getByRole('menuitem', { name: /^Keyboard shortcuts/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
});
