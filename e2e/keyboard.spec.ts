import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const tree = (page: import('@playwright/test').Page) =>
  page.getByRole('tree', { name: 'Mind map' });
const item = (page: import('@playwright/test').Page, name: string) =>
  page.getByRole('treeitem', { name, exact: true });

test('builds a map with the keyboard, edits, deletes and undoes', async ({ page }) => {
  await page.goto('/');
  await tree(page).focus();

  await page.keyboard.press('Tab');
  await page.keyboard.type('Research');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Design');
  await page.keyboard.press('Tab');
  await page.keyboard.type('Wireframes');
  await page.keyboard.press('Shift+Tab');

  await expect(page.getByRole('treeitem')).toHaveCount(4);
  await expect(item(page, 'Wireframes')).toHaveAttribute('aria-selected', 'true');
  await expect(item(page, 'Wireframes')).toHaveAttribute('aria-level', '3');

  // Arrow keys walk the tree: left to the parent, up to its peer.
  await page.keyboard.press('ArrowLeft');
  await expect(item(page, 'Design')).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowUp');
  await expect(item(page, 'Research')).toHaveAttribute('aria-selected', 'true');

  // Rename with F2, then cancel a second edit with Escape.
  await page.keyboard.press('F2');
  await page.keyboard.press('End');
  await page.keyboard.type(' notes');
  await page.keyboard.press('Shift+Tab');
  await expect(item(page, 'Research notes')).toBeVisible();
  await page.keyboard.press('F2');
  await page.keyboard.press('End');
  await page.keyboard.type(' ignored');
  await page.keyboard.press('Escape');
  await expect(item(page, 'Research notes')).toBeVisible();

  // Delete a branch and bring it back.
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Delete');
  // Design has a sub-topic, so it asks whether to take the whole branch.
  await page.getByRole('button', { name: /Delete the whole branch/ }).click();
  await expect(page.getByRole('treeitem')).toHaveCount(2);
  await page.keyboard.press('Control+z');
  await expect(page.getByRole('treeitem')).toHaveCount(4);
  await expect(page.getByRole('status', { name: 'Announcements' })).toContainText(
    'Undid last change',
  );
});

test('keeps the map after a reload', async ({ page }) => {
  await page.goto('/');
  await tree(page).focus();
  await page.keyboard.press('Tab');
  await page.keyboard.type('Saved idea');
  await page.keyboard.press('Shift+Tab');
  await expect(item(page, 'Saved idea')).toBeVisible();
  await page.waitForTimeout(900);
  await page.reload();
  await expect(item(page, 'Saved idea')).toBeVisible();
});

test('stores a map only once it is changed', async ({ page }) => {
  const stored = () =>
    page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          const open = indexedDB.open('canopy');
          open.onerror = () => resolve(0);
          open.onsuccess = () => {
            const db = open.result;
            if (!db.objectStoreNames.contains('maps')) return resolve(0);
            const count = db.transaction('maps').objectStore('maps').count();
            count.onsuccess = () => resolve(count.result);
          };
        }),
    );

  await page.goto('/');
  await expect(page.getByRole('treeitem')).toHaveCount(1);
  await page.reload();
  await page.reload();
  await expect(page.getByRole('treeitem')).toHaveCount(1);
  await page.waitForTimeout(900);
  expect(await stored()).toBe(0);

  await tree(page).focus();
  await page.keyboard.press('Tab');
  await page.keyboard.type('First change');
  await page.keyboard.press('Shift+Tab');
  await page.waitForTimeout(900);
  expect(await stored()).toBe(1);
});

test('folds a branch and shows the hidden count to assistive technology', async ({ page }) => {
  await page.goto('/?demo=14');
  await tree(page).focus();
  const before = await page.getByRole('treeitem').count();
  await page.keyboard.press(']');
  await expect(page.getByRole('treeitem')).toHaveCount(1);
  await expect(page.getByRole('status', { name: 'Announcements' })).toContainText('Folded');
  await page.keyboard.press(']');
  await expect(page.getByRole('treeitem')).toHaveCount(before);
});

test('opens the editor on double click', async ({ page }) => {
  await page.goto('/?demo=14');
  await page.getByText('Documentation').first().dblclick();
  const editor = page.getByRole('textbox', { name: 'Topic title' });
  await expect(editor).toBeFocused();
  await page.keyboard.type('Docs');
  await page.keyboard.press('Shift+Tab');
  await expect(item(page, 'Docs')).toBeVisible();
});

test('selects several topics with Shift and a drag box', async ({ page }) => {
  await page.goto('/?demo=14');
  const box = await page.locator('.canvas-host').boundingBox();
  const x = box?.x ?? 0;
  const y = box?.y ?? 0;
  await page.keyboard.down('Shift');
  await page.mouse.move(x + 4, y + 4);
  await page.mouse.down();
  await page.mouse.move(x + (box?.width ?? 800) - 4, y + (box?.height ?? 600) - 4, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up('Shift');
  expect(await page.locator('.topic[data-selected]').count()).toBeGreaterThan(5);
});

test('lets keyboard users leave the map with Escape', async ({ page }) => {
  await page.goto('/');
  await tree(page).focus();
  await page.keyboard.press('Escape');
  await expect(tree(page)).not.toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Select', exact: true })).toBeFocused();
});

test('has no accessibility violations while editing', async ({ page }) => {
  await page.goto('/?demo=14');
  await tree(page).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('textbox', { name: 'Topic title' })).toBeFocused();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
