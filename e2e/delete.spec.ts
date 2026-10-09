import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const tree = (page: Page) => page.getByRole('tree', { name: 'Mind map' });
const item = (page: Page, name: string) => page.getByRole('treeitem', { name, exact: true });
const level = async (page: Page, name: string) =>
  Number(await item(page, name).getAttribute('aria-level'));

/** Core ▸ Parent ▸ (Kid one, Kid two), and Other beside Parent. */
async function build(page: Page) {
  await page.goto('/');
  await tree(page).focus();
  await page.keyboard.press('Tab');
  await page.keyboard.type('Parent');
  await page.keyboard.press('Tab');
  await page.keyboard.type('Kid one');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Kid two');
  await page.keyboard.press('Shift+Tab');
  await item(page, 'Parent').click();
  await page.keyboard.press('Enter');
  await page.keyboard.type('Other');
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('treeitem')).toHaveCount(5);
  await page.waitForTimeout(300);
}

const dialog = (page: Page) => page.getByRole('dialog', { name: 'Delete “Parent”?' });

test('deleting a topic with sub-topics asks what to do, and Cancel changes nothing', async ({
  page,
}) => {
  await build(page);
  await item(page, 'Parent').click();
  await page.keyboard.press('Delete');
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page)).toContainText('“Parent” has 2 topics below it.');
  await expect(dialog(page).getByRole('button', { name: /Delete the topic only/ })).toBeFocused();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await dialog(page).getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(page.getByRole('treeitem')).toHaveCount(5);

  // Escape also backs out.
  await item(page, 'Parent').click();
  await page.keyboard.press('Backspace');
  await expect(dialog(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toHaveCount(0);
  await expect(page.getByRole('treeitem')).toHaveCount(5);
});

test('"Delete the topic only" moves its sub-topics up to the parent', async ({ page }) => {
  await build(page);
  await item(page, 'Parent').click();
  await page.keyboard.press('Delete');
  await dialog(page)
    .getByRole('button', { name: /Delete the topic only/ })
    .click();

  await expect(page.getByRole('treeitem')).toHaveCount(4);
  await expect(item(page, 'Parent')).toHaveCount(0);
  for (const name of ['Kid one', 'Kid two', 'Other']) expect(await level(page, name)).toBe(2);
  // They land where Parent was, before Other.
  const names = await page
    .getByRole('treeitem')
    .evaluateAll((els) => els.map((e) => (e.getAttribute('aria-label') ?? '').split(',')[0]));
  expect(names.indexOf('Kid one')).toBeLessThan(names.indexOf('Kid two'));
  expect(names.indexOf('Kid two')).toBeLessThan(names.indexOf('Other'));
  await expect(page.getByRole('treeitem', { selected: true })).toHaveCount(2);

  await tree(page).focus();
  await page.keyboard.press('Meta+z');
  await expect(item(page, 'Parent')).toHaveCount(1);
  expect(await level(page, 'Kid one')).toBe(3);
});

test('"Delete the whole branch" removes it all, and Undo brings it back', async ({ page }) => {
  await build(page);
  await item(page, 'Parent').click();
  await page.keyboard.press('Delete');
  await dialog(page)
    .getByRole('button', { name: /Delete the whole branch/ })
    .click();
  await expect(page.getByRole('treeitem')).toHaveCount(2);
  await expect(item(page, 'Other')).toHaveCount(1);

  await tree(page).focus();
  await page.keyboard.press('Meta+z');
  await expect(page.getByRole('treeitem')).toHaveCount(5);
});

test('a topic with nothing below it is deleted straight away', async ({ page }) => {
  await build(page);
  await item(page, 'Other').click();
  await page.keyboard.press('Delete');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('treeitem')).toHaveCount(4);
});

test('the right-click menu offers the topic only, and the whole branch with a question', async ({
  page,
}) => {
  await build(page);
  await item(page, 'Parent').click({ button: 'right' });
  const menu = page.getByRole('menu');
  await expect(menu.getByRole('menuitem', { name: 'Delete topic only' })).toBeVisible();
  await menu.getByRole('menuitem', { name: 'Delete topic only' }).click();
  await expect(item(page, 'Parent')).toHaveCount(0);
  expect(await level(page, 'Kid one')).toBe(2);

  await item(page, 'Other').click({ button: 'right' });
  await expect(page.getByRole('menuitem', { name: /^Delete/ })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Delete topic only' })).toHaveCount(0);
});
