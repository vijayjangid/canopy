import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const tree = (page: Page) => page.getByRole('tree', { name: 'Mind map' });
const level = (page: Page, name: string) =>
  page.getByRole('treeitem', { name, exact: true }).getAttribute('aria-level');

async function twoTopics(page: Page) {
  await page.goto('/');
  await tree(page).focus();
  await page.keyboard.press('Tab');
  await page.keyboard.type('Alpha');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Beta');
  await page.keyboard.press('Shift+Tab');
  await tree(page).focus();
}

test('w puts a new topic between a topic and its parent', async ({ page }) => {
  await twoTopics(page);
  await page.keyboard.press('w');
  const field = page.getByRole('textbox', { name: 'Topic title' });
  await expect(field).toBeFocused();
  await page.keyboard.type('Middle');
  await page.keyboard.press('Shift+Tab');

  await expect.poll(() => level(page, 'Beta')).toBe('3');
  expect(await level(page, 'Middle')).toBe('2');
  expect(await level(page, 'Alpha')).toBe('2');
});

test('Shift+W adds a topic below that takes all the sub-topics', async ({ page }) => {
  await twoTopics(page);
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Shift+W');
  await page.keyboard.type('Group');
  await page.keyboard.press('Shift+Tab');

  await expect.poll(() => level(page, 'Alpha')).toBe('3');
  expect(await level(page, 'Beta')).toBe('3');
  expect(await level(page, 'Group')).toBe('2');
});

test('the handle on a line inserts a topic, and Shift takes all its peers down', async ({
  page,
}) => {
  await twoTopics(page);
  const beta = page.getByRole('treeitem', { name: 'Beta', exact: true });
  await beta.hover();
  const handle = page.locator('.growth-handle[data-kind="between"]');
  await expect(handle).toBeVisible();
  await handle.click();
  await page.keyboard.type('Mid');
  await page.keyboard.press('Shift+Tab');
  await expect.poll(() => level(page, 'Beta')).toBe('3');
  expect(await level(page, 'Alpha')).toBe('2');

  await page.getByRole('treeitem', { name: 'Alpha', exact: true }).click();
  await page.getByRole('treeitem', { name: 'Alpha', exact: true }).hover();
  await page.keyboard.down('Shift');
  await page.locator('.growth-handle[data-kind="between"]').click();
  await page.keyboard.up('Shift');
  await page.keyboard.type('All');
  await page.keyboard.press('Shift+Tab');
  await expect.poll(() => level(page, 'Mid')).toBe('3');
  expect(await level(page, 'Alpha')).toBe('3');
  expect(await level(page, 'All')).toBe('2');
});

test('dragging a new-topic handle onto a line inserts it there', async ({ page }) => {
  await twoTopics(page);
  const beta = page.getByRole('treeitem', { name: 'Beta', exact: true });
  await beta.hover();
  const source = page.locator('.growth-handle[data-kind="child"]');
  await expect(source).toBeVisible();
  const from = await source.boundingBox();
  // Alpha is the other child of the Core, so its line is the one to drop on.
  const alphaId = await page
    .getByRole('treeitem', { name: 'Alpha', exact: true })
    .getAttribute('data-topic-id');
  const line = await page.locator(`.link[data-edge-id="${alphaId}"] .connector-hit`).boundingBox();
  if (!from || !line) throw new Error('missing boxes');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(line.x + line.width / 2, line.y + line.height / 2, { steps: 12 });
  await expect(page.locator('.topic[data-kind="ghost"]')).toHaveCount(1);
  await page.mouse.up();
  await page.keyboard.type('Dropped');
  await page.keyboard.press('Shift+Tab');

  await expect.poll(() => level(page, 'Alpha')).toBe('3');
  expect(await level(page, 'Dropped')).toBe('2');
  expect(await level(page, 'Beta')).toBe('2');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
