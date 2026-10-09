import { expect, test } from '@playwright/test';

import type { Locator, Page } from '@playwright/test';

/** A screen point on a reference line that is not covered by a topic. */
async function spotOn(line: Locator) {
  const point = await line.locator('.reference-hit').evaluate((node) => {
    const path = node as SVGPathElement;
    const matrix = path.getScreenCTM();
    if (!matrix) return null;
    const length = path.getTotalLength();
    for (let step = 3; step < 18; step++) {
      const local = path.getPointAtLength((length * step) / 20);
      const screen = new DOMPoint(local.x, local.y).matrixTransform(matrix);
      if (document.elementFromPoint(screen.x, screen.y) === path) {
        return { x: screen.x, y: screen.y };
      }
    }
    return null;
  });
  if (!point) throw new Error('Reference line has no clickable segment between topics');
  return point;
}

/** Makes Research reference the Core, and returns its reference line. */
async function referenceResearch(page: Page) {
  await page.goto('/?demo=14');
  const source = page.getByRole('treeitem', { name: 'Research', exact: true }).first();
  const sourceId = await source.getAttribute('data-topic-id');
  if (!sourceId) throw new Error('Research topic is missing its ID');

  await source.click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Reference to…' }).click();
  const search = page.getByRole('combobox', { name: 'Search by topic or path' });
  await search.fill('Product launch');
  await page.getByRole('option', { name: 'Product launch Core', exact: true }).click();

  const reference = page.locator(`.reference-link[data-reference-from="${sourceId}"]`);
  await expect(reference).toHaveCount(1);
  await expect(reference.locator('.reference-connector')).toHaveAttribute(
    'marker-end',
    'url(#reference-arrow)',
  );
  return reference;
}

test('clicking a reference line shows a delete icon that removes it', async ({ page }) => {
  const reference = await referenceResearch(page);
  await expect(page.locator('.reference-delete')).toHaveCount(0);

  const point = await spotOn(reference);
  await page.mouse.click(point.x, point.y);
  await expect(reference).toHaveAttribute('data-selected', 'true');
  const icon = page.locator('.reference-delete');
  await expect(icon).toHaveCount(1);

  await icon.click();
  await expect(reference).toHaveCount(0);
  await expect(icon).toHaveCount(0);

  await page.getByRole('tree', { name: 'Mind map' }).focus();
  await page.keyboard.press('ControlOrMeta+z');
  await expect(page.locator('.reference-link')).toHaveCount(1);
});

test('clicking elsewhere puts the delete icon away', async ({ page }) => {
  const reference = await referenceResearch(page);
  const point = await spotOn(reference);
  await page.mouse.click(point.x, point.y);
  await expect(page.locator('.reference-delete')).toHaveCount(1);
  await page.mouse.click(2, 300);
  await expect(page.locator('.reference-delete')).toHaveCount(0);
  await expect(reference).toHaveCount(1);
});

test('right-clicking a reference line offers to go to, change or remove it', async ({ page }) => {
  const reference = await referenceResearch(page);
  const point = await spotOn(reference);
  await page.mouse.click(point.x, point.y, { button: 'right' });
  const menu = page.getByRole('menu');
  for (const name of ['Go to referenced topic', 'Change reference…', 'Remove reference']) {
    await expect(menu.getByRole('menuitem', { name })).toBeVisible();
  }

  await menu.getByRole('menuitem', { name: 'Go to referenced topic' }).click();
  await expect(page.locator('.topic[data-topic-id="core"]')).toHaveAttribute(
    'data-focused',
    'true',
  );

  await page.mouse.click(point.x, point.y, { button: 'right' });
  await page.getByRole('menuitem', { name: 'Remove reference' }).click();
  await expect(reference).toHaveCount(0);
});

test('search keeps its results bounded on a large map', async ({ page }) => {
  await page.goto('/?demo=5000');
  await page.getByRole('tree', { name: 'Mind map' }).focus();
  await page.keyboard.press('Meta+f');
  const dialog = page.getByRole('dialog', { name: 'Search' });
  await expect(dialog).toBeVisible();
  await page.keyboard.type('topic');
  await expect(dialog.getByRole('option').first()).toBeVisible();
  expect(await dialog.getByRole('option').count()).toBeLessThanOrEqual(22);
});

async function alphaAndBeta(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('tree', { name: 'Mind map' }).focus();
  await page.keyboard.press('Tab');
  await page.keyboard.type('Alpha');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Beta');
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('treeitem')).toHaveCount(3);
}

const node = (page: import('@playwright/test').Page, name: string) =>
  page.locator('.topic[data-kind="topic"]', { hasText: name }).first();

test('dragging the reference handle onto another topic connects them', async ({ page }) => {
  await alphaAndBeta(page);
  await node(page, 'Alpha').click();
  await page.mouse.move(0, 0);
  await node(page, 'Alpha').hover();
  const handle = page.locator('.growth-handle[data-kind="reference"]');
  await expect(handle).toBeVisible();
  await expect(page.locator('.growth-handle[data-kind="before"]')).toHaveCount(0);

  const from = await handle.boundingBox();
  const to = await node(page, 'Beta').boundingBox();
  if (!from || !to) throw new Error('missing boxes');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
  await expect(page.locator('.reference-rubber-target')).toBeVisible();
  await page.mouse.up();

  await expect(page.locator('.reference-link')).toHaveCount(1);
  await expect(page.locator('.reference-rubber')).toHaveCount(0);
});

test('releasing a reference drag on empty canvas cancels it', async ({ page }) => {
  await alphaAndBeta(page);
  await node(page, 'Alpha').click();
  await page.mouse.move(0, 0);
  await node(page, 'Alpha').hover();
  const from = await page.locator('.growth-handle[data-kind="reference"]').boundingBox();
  if (!from) throw new Error('missing handle');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + 40, from.y - 120, { steps: 6 });
  await page.mouse.up();
  await expect(page.locator('.reference-link')).toHaveCount(0);
});

test('clicking the reference handle, or pressing X, searches for a target', async ({ page }) => {
  await alphaAndBeta(page);
  await node(page, 'Alpha').click();
  await page.mouse.move(0, 0);
  await node(page, 'Alpha').hover();
  await page.locator('.growth-handle[data-kind="reference"]').click();
  const search = page.getByRole('combobox', { name: 'Search by topic or path' });
  await expect(search).toBeFocused();
  await search.fill('Beta');
  await page.keyboard.press('Enter');
  await expect(page.locator('.reference-link')).toHaveCount(1);

  await page.getByRole('tree', { name: 'Mind map' }).focus();
  await page.keyboard.press('x');
  await expect(page.getByRole('combobox', { name: 'Search by topic or path' })).toBeFocused();
});
