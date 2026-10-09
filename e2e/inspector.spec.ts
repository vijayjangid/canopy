import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const tree = (page: Page) => page.getByRole('tree', { name: 'Mind map' });
const details = (page: Page) => page.getByRole('complementary', { name: 'Inspector' });

async function startWithTopic(page: Page) {
  await page.goto('/');
  await tree(page).focus();
  await page.keyboard.press('Tab');
  await page.keyboard.type('Plan');
  await page.keyboard.press('Shift+Tab');
}

test('writes a note from the keyboard and shows a note mark on the topic', async ({ page }) => {
  await startWithTopic(page);
  await tree(page).focus();
  await page.keyboard.press('n');
  const note = page.getByRole('textbox', { name: 'Note' });
  await expect(note).toBeFocused();
  await page.keyboard.type('Ship **early**');
  await expect(page.locator('.topic-chips')).toHaveCount(1);
  await expect(page.getByRole('treeitem', { name: /Plan, has a note/ })).toBeVisible();

  await page.getByRole('button', { name: 'Preview' }).click();
  await expect(page.locator('.markdown strong')).toHaveText('early');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('the details panel closes with its button, Escape, and the i key', async ({ page }) => {
  await startWithTopic(page);
  await tree(page).focus();
  await page.keyboard.press('i');
  await expect(details(page)).toBeVisible();
  await page.keyboard.press('i');
  await expect(details(page)).toHaveCount(0);

  await page.keyboard.press('i');
  await page.getByRole('button', { name: 'Close details' }).click();
  await expect(details(page)).toHaveCount(0);
  await expect(tree(page)).toBeFocused();

  await page.keyboard.press('i');
  await page.getByRole('button', { name: /^Properties/ }).focus();
  await page.keyboard.press('Escape');
  await expect(details(page)).toHaveCount(0);
});

test('a sticker sticks to the corner of a topic, and can be taken off', async ({ page }) => {
  await startWithTopic(page);
  await tree(page).focus();
  await page.keyboard.press('s');
  await expect(page.getByRole('searchbox', { name: 'Search stickers' })).toBeFocused();
  await page.getByRole('button', { name: 'Launch', exact: true }).click();
  await page.getByRole('button', { name: 'Star', exact: true }).click();
  await expect(page.locator('.topic[data-selected] .stickers > g')).toHaveCount(2);
  await expect(page.getByRole('treeitem', { name: /2 stickers/ })).toBeVisible();

  await page.getByRole('button', { name: 'Remove Launch sticker' }).click();
  await expect(page.locator('.topic[data-selected] .stickers > g')).toHaveCount(1);
});

test('the first sticker takes the top right corner', async ({ page }) => {
  await startWithTopic(page);
  await tree(page).focus();
  await page.keyboard.press('s');
  await page.getByRole('button', { name: 'Heart', exact: true }).click();
  const box = await page.locator('.topic[data-selected] .topic-box').boundingBox();
  const sticker = await page.locator('.topic[data-selected] .stickers > g').boundingBox();
  expect(box && sticker).toBeTruthy();
  if (!box || !sticker) return;
  expect(sticker.x + sticker.width / 2).toBeGreaterThan(box.x + box.width / 2);
  expect(sticker.y + sticker.height / 2).toBeLessThan(box.y + box.height / 2);
});

test('only four stickers fit, one per corner', async ({ page }) => {
  await startWithTopic(page);
  await tree(page).focus();
  await page.keyboard.press('s');
  for (const name of ['Star', 'Heart', 'Bolt', 'Hot']) {
    await page.getByRole('button', { name, exact: true }).click();
  }
  await expect(
    page.getByRole('list', { name: 'Stickers', exact: true }).getByRole('button').first(),
  ).toBeDisabled();
});

test('searches stickers by name', async ({ page }) => {
  await startWithTopic(page);
  await tree(page).focus();
  await page.keyboard.press('s');
  await expect(page.getByRole('searchbox', { name: 'Search stickers' })).toBeFocused();
  await page.keyboard.type('launch');
  await expect(
    page.getByRole('list', { name: 'Stickers', exact: true }).getByRole('button'),
  ).toHaveCount(1);
});

test('stays accessible with a note and stickers', async ({ page }) => {
  await startWithTopic(page);
  await tree(page).focus();
  await page.keyboard.press('s');
  await page.getByRole('button', { name: 'Star', exact: true }).click();
  await page.getByRole('tab', { name: /^Note/ }).click();
  await page.getByRole('textbox', { name: 'Note' }).fill('Hello');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('the details header names the parent and steps between siblings', async ({ page }) => {
  await page.goto('/');
  await tree(page).focus();
  await page.keyboard.press('Tab');
  await page.keyboard.type('First');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Second');
  await page.keyboard.press('Shift+Tab');
  await tree(page).focus();
  await page.keyboard.press('i');

  const panel = details(page);
  await expect(panel.getByRole('heading', { name: 'Second' })).toBeVisible();
  await expect(panel.getByRole('navigation', { name: 'Parent topic' })).toBeVisible();
  await expect(panel.getByRole('button', { name: /^Next sibling/ })).toBeDisabled();

  await panel.getByRole('button', { name: /^Previous sibling/ }).click();
  await expect(panel.getByRole('heading', { name: 'First' })).toBeVisible();
  await expect(panel.getByRole('button', { name: /^Previous sibling/ })).toBeDisabled();

  await panel.getByRole('navigation', { name: 'Parent topic' }).getByRole('button').click();
  await expect(panel.getByText('Core topic')).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('the note has its own tab, which fills the panel', async ({ page }) => {
  await startWithTopic(page);
  await tree(page).focus();
  await page.keyboard.press('i');
  const panel = details(page);
  await expect(panel.getByRole('tab', { name: 'Details' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(panel.getByRole('region', { name: 'Properties' })).toBeVisible();
  await expect(panel.getByRole('textbox', { name: 'Note' })).toHaveCount(0);

  await panel.getByRole('tab', { name: 'Note' }).click();
  await expect(panel.getByRole('textbox', { name: 'Note' })).toBeVisible();
  await expect(panel.getByRole('region', { name: 'Properties' })).toHaveCount(0);
  await panel.getByRole('textbox', { name: 'Note' }).fill('Hello');
  await expect(panel.getByRole('tab', { name: /^Note/ })).toContainText('Note');
  await expect(panel.locator('.tab-mark')).toHaveCount(1);

  await panel.getByRole('tab', { name: 'Details' }).click();
  await expect(panel.getByRole('region', { name: 'Stickers' })).toBeVisible();
});
