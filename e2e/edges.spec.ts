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
  const star = page
    .getByRole('list', { name: 'Stickers', exact: true })
    .getByRole('button', { name: 'Star', exact: true });
  await expect(star).toHaveAttribute('aria-pressed', 'false');
  await star.click();
  await expect(page.locator('.edge-badge .edge-sticker')).toHaveCount(1);
  await expect(page.locator('.stickers .sticker-stamp')).toHaveCount(0);
  await expect(star).toHaveAttribute('aria-pressed', 'true');
  // There is no separate list of what is on the line: the sheet itself shows it.
  await expect(page.getByRole('heading', { name: /On this/ })).toHaveCount(0);

  // The same sticker is not added a second time. Pressing it again takes it off.
  await star.click();
  await expect(star).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.edge-badge')).toHaveCount(0);
});

test('a sticker put on from the panel can be taken off from the bar', async ({ page }) => {
  await startWithChild(page);
  await page.locator('.link .connector-hit').first().click({ force: true });
  const bar = page.getByRole('group', { name: 'Stickers for this line' });
  await page
    .getByRole('list', { name: 'Stickers', exact: true })
    .getByRole('button', { name: 'Heart', exact: true })
    .click();
  // Heart is not one of the bar's usual few, but it shows while it is on the line.
  const heart = bar.getByRole('button', { name: 'Heart', exact: true });
  await expect(heart).toHaveAttribute('aria-pressed', 'true');
  await heart.click();
  await expect(page.locator('.edge-badge')).toHaveCount(0);
  await expect(heart).toHaveCount(0);
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

  const flag = bar.getByRole('button', { name: 'Flag', exact: true });
  await expect(flag).toHaveAttribute('aria-pressed', 'false');
  await flag.click();
  await expect(page.locator('.edge-badge .edge-sticker')).toHaveCount(1);
  await expect(flag).toHaveAttribute('aria-pressed', 'true');

  await bar.getByRole('button', { name: 'More stickers, in the details panel' }).click();
  await expect(page.getByRole('searchbox', { name: 'Search stickers' })).toBeFocused();

  // The pencil puts the cursor in the label field of the details panel.
  await bar.getByRole('button', { name: /Edit the line label/ }).click();
  await expect(page.getByRole('textbox', { name: 'Label' })).toBeFocused();

  // A sticker that is on can be taken off from the bar by pressing it again.
  await bar.getByRole('button', { name: 'Flag', exact: true }).click();
  await expect(page.locator('.edge-badge')).toHaveCount(0);
  await expect(flag).toHaveAttribute('aria-pressed', 'false');

  await page.mouse.click(600, 500);
  await expect(bar).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
