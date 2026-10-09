import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const tree = (page: import('@playwright/test').Page) =>
  page.getByRole('tree', { name: 'Mind map' });

test('[ collapses everything above into one dotted node, and toggles back', async ({ page }) => {
  await page.goto('/?demo=14');
  await tree(page).focus();
  const all = await page.getByRole('treeitem').count();

  await page.getByRole('treeitem', { name: 'Research', exact: true }).click();
  await page.keyboard.press('[');
  await expect(page.locator('.context-node')).toHaveCount(1);
  await expect(page.locator('.context-title')).toContainText('topics above');
  expect(await page.getByRole('treeitem').count()).toBeLessThan(all);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);

  await page.keyboard.press('[');
  await expect(page.locator('.context-node')).toHaveCount(0);
  await expect(page.getByRole('treeitem')).toHaveCount(all);
});

test('clicking the dotted node shows everything again', async ({ page }) => {
  await page.goto('/?demo=14');
  const all = await page.getByRole('treeitem').count();
  await page.getByRole('treeitem', { name: 'Research', exact: true }).click();
  await page.keyboard.press('[');
  await page.locator('.context-box').click();
  await expect(page.locator('.context-node')).toHaveCount(0);
  await expect(page.getByRole('treeitem')).toHaveCount(all);
});

test('the - button on the parent side collapses everything above', async ({ page }) => {
  await page.goto('/?demo=14');
  const all = await page.getByRole('treeitem').count();
  const research = page.getByRole('treeitem', { name: 'Research', exact: true });
  await research.hover();
  await research.locator('[data-parent-toggle]').click();
  await expect(page.locator('.context-node')).toHaveCount(1);
  expect(await page.getByRole('treeitem').count()).toBeLessThan(all);
  await page.locator('.context-box').click();
  await expect(page.getByRole('treeitem')).toHaveCount(all);
});

test('the Core has nothing above it to collapse', async ({ page }) => {
  await page.goto('/?demo=14');
  await tree(page).focus();
  await page.keyboard.press('[');
  await expect(page.locator('.context-node')).toHaveCount(0);
  await expect(page.getByRole('status', { name: 'Announcements' })).toContainText('nothing above');
});

test('] folds and unfolds the focused branch', async ({ page }) => {
  await page.goto('/?demo=14');
  await tree(page).focus();
  const all = await page.getByRole('treeitem').count();
  await page.keyboard.press(']');
  await expect(page.getByRole('treeitem')).toHaveCount(1);
  await page.keyboard.press(']');
  await expect(page.getByRole('treeitem')).toHaveCount(all);
});

test('the Unfold everything button opens every folded branch', async ({ page }) => {
  await page.goto('/?demo=14');
  const all = await page.getByRole('treeitem').count();
  await tree(page).focus();
  await page.keyboard.press(']');
  await expect(page.getByRole('treeitem')).toHaveCount(1);
  await page.getByRole('button', { name: 'Unfold everything' }).click();
  await expect(page.getByRole('treeitem')).toHaveCount(all);
});

test('a click on a topic under the Inspector does not leave a drag behind', async ({ page }) => {
  await page.goto('/?demo=14');
  const research = page.getByRole('treeitem', { name: 'Research', exact: true });
  await research.click();
  await research.click({ button: 'right' });
  await expect(page.getByRole('menu', { name: 'Topic actions' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toHaveCount(0);
});

test('fold buttons stay a usable size when the map is zoomed out', async ({ page }) => {
  await page.goto('/?demo=14');
  await tree(page).focus();
  for (let i = 0; i < 6; i++) await page.keyboard.press('Meta+-');
  const core = page.getByRole('treeitem', { name: 'Product launch', exact: true });
  await core.hover();
  const circle = core.locator('[data-fold-toggle] circle:not(.fold-toggle-hit)');
  const box = await circle.boundingBox();
  if (!box) throw new Error('no fold button');
  expect(box.width).toBeGreaterThanOrEqual(17);
});

test('Unfold everything also brings back the parents', async ({ page }) => {
  await page.goto('/?demo=14');
  const all = await page.getByRole('treeitem').count();
  await page.getByRole('treeitem', { name: 'Research', exact: true }).click();
  await page.keyboard.press('[');
  await expect(page.locator('.context-node')).toHaveCount(1);
  await page.getByRole('button', { name: 'Unfold everything' }).first().click();
  await expect(page.locator('.context-node')).toHaveCount(0);
  await expect(page.getByRole('treeitem')).toHaveCount(all);
});

test('tooltips are dark in Light Mode', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/?demo=14');
  await page.getByRole('button', { name: 'Unfold everything' }).hover();
  const tip = page.locator('.tooltip[data-visible]');
  await expect(tip).toBeVisible();
  const bg = await tip.evaluate((el) => getComputedStyle(el).backgroundColor);
  const [r = 255, g = 255, b = 255] = bg.match(/\d+(\.\d+)?/g)?.map(Number) ?? [];
  expect((r + g + b) / 3).toBeLessThan(80);
});
