import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const tree = (page: Page) => page.getByRole('tree', { name: 'Mind map' });

async function startWithChild(page: Page) {
  await page.goto('/');
  await tree(page).focus();
  await page.keyboard.press('Tab');
  await page.keyboard.type('Plan');
  await page.keyboard.press('Shift+Tab');
}

test('double-clicking a line labels it, and the label can be edited and cleared', async ({
  page,
}) => {
  await startWithChild(page);
  const line = page.locator('.link .connector-hit').first();
  await line.hover({ force: true });
  await expect(page.locator('.link:hover .connector')).toHaveCount(1);

  await line.dblclick({ force: true });
  const field = page.getByRole('textbox', { name: 'Line label' });
  await expect(field).toBeFocused();
  await page.keyboard.type('depends on');
  await page.keyboard.press('Enter');
  await expect(field).toHaveCount(0);
  await expect(page.locator('.edge-text')).toHaveText('depends on');
  await expect(tree(page)).toBeFocused();

  // The l key opens the same editor for the focused topic.
  await page.keyboard.press('l');
  await expect(field).toHaveValue('depends on');
  await page.keyboard.press('Escape');
  await expect(page.locator('.edge-text')).toHaveText('depends on');

  await page.keyboard.press('l');
  await field.fill('');
  await page.keyboard.press('Enter');
  await expect(page.locator('.edge-badge')).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('a sticker goes on the line from the Stickers tab', async ({ page }) => {
  await startWithChild(page);
  await tree(page).focus();
  await page.keyboard.press('s');
  await page.getByRole('button', { name: 'Line to parent' }).click();
  await page.getByRole('button', { name: 'Star', exact: true }).click();
  await expect(page.locator('.edge-badge .edge-sticker')).toHaveCount(1);
  await expect(page.locator('.stickers .sticker-stamp')).toHaveCount(0);

  await page.getByRole('button', { name: /^Remove .* sticker$/ }).click();
  await expect(page.locator('.edge-badge')).toHaveCount(0);
});

test('clicking a line opens sticker controls beside it and in the details panel', async ({
  page,
}) => {
  await startWithChild(page);
  await page.locator('.link .connector-hit').first().click({ force: true });
  const bar = page.getByRole('group', { name: 'Stickers for this line' });
  await expect(bar).toBeVisible();
  await expect(bar.getByRole('textbox')).toHaveCount(0);
  await expect(page.locator('.edge-target[data-flash]')).toBeVisible();

  await bar.getByRole('button', { name: 'Add Flag sticker to the line' }).click();
  await expect(page.locator('.edge-badge .edge-sticker')).toHaveCount(1);

  await bar.getByRole('button', { name: 'More stickers, in the details panel' }).click();
  await expect(page.getByRole('searchbox', { name: 'Search stickers' })).toBeFocused();

  await bar.getByRole('button', { name: 'Remove Flag sticker from the line' }).click();
  await expect(page.locator('.edge-badge')).toHaveCount(0);

  await page.mouse.click(600, 500);
  await expect(bar).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
