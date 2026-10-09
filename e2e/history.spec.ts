import { expect, test } from '@playwright/test';

const tree = (page: import('@playwright/test').Page) =>
  page.getByRole('tree', { name: 'Mind map' });

test('the top bar has undo and redo buttons that follow the history', async ({ page }) => {
  await page.goto('/');
  const undo = page.getByRole('button', { name: 'Undo', exact: true });
  const redo = page.getByRole('button', { name: 'Redo', exact: true });
  await expect(undo).toBeDisabled();
  await expect(redo).toBeDisabled();

  await tree(page).focus();
  await page.keyboard.press('Tab');
  await page.keyboard.type('Idea');
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('treeitem', { name: 'Idea', exact: true })).toBeVisible();
  await expect(undo).toBeEnabled();

  await undo.click();
  await expect(page.getByRole('treeitem', { name: 'Idea', exact: true })).toHaveCount(0);
  await expect(redo).toBeEnabled();
  await redo.click();
  await expect(page.getByRole('treeitem', { name: 'Idea', exact: true })).toBeVisible();
});

test('Copy path follows the path instead of sitting at the far edge', async ({ page }) => {
  await page.goto('/?demo=14');
  await page.getByRole('treeitem', { name: 'Research', exact: true }).click();
  const last = page.locator('.trail-current');
  const copy = page.getByRole('button', { name: 'Copy path' });
  const [a, b] = await Promise.all([last.boundingBox(), copy.boundingBox()]);
  if (!a || !b) throw new Error('missing');
  expect(b.x - (a.x + a.width)).toBeLessThan(40);
});
