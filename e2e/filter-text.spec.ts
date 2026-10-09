import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('typing in the Filter search picks out matching topics', async ({ page }) => {
  await page.goto('/?demo=14');
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  const box = page.getByRole('searchbox', { name: 'Search topics and lines' });
  await box.fill('rsch');

  const control = page.locator('.filter-control');
  await expect(control).toContainText('rsch');
  const count = Number((await control.textContent())?.match(/\u00b7 (\d+)/)?.[1]);
  expect(count).toBeGreaterThan(0);
  await expect(page.locator('.topic[data-dim]').first()).toBeAttached();
  await expect(page.locator('.topic:not([data-dim])[data-depth]').first()).toBeAttached();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);

  await box.press('Escape');
  await expect(box).toHaveValue('');
  await expect(control).toHaveCount(0);
});

test('Cmd+F opens fuzzy topic search with advanced filters available', async ({ page }) => {
  await page.goto('/?demo=14');
  await page.getByRole('tree', { name: 'Mind map' }).focus();
  await page.keyboard.press('Meta+f');
  const dialog = page.getByRole('dialog', { name: 'Find a topic' });
  const search = dialog.getByRole('combobox', { name: 'Search topics by name or path' });
  await expect(search).toBeFocused();
  await search.fill('rsch');
  await expect(dialog.getByRole('option', { name: /Research/ })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Advanced filters…' })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await dialog.getByRole('button', { name: 'Advanced filters…' }).click();
  await expect(page.getByRole('searchbox', { name: 'Search topics and lines' })).toBeFocused();
});

test('the Inspector shows the level of the topic', async ({ page }) => {
  await page.goto('/?demo=14');
  await page.getByRole('treeitem', { name: 'Research', exact: true }).click();
  await expect(page.locator('.panel-level')).toContainText(/Level 3 \u00b7 3\.\d/);
});

test('a Filter that finds nothing says so, and the map stays usable', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?demo=14');
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search topics and lines' }).fill('zzzzq');
  await page.locator('.filter-control').getByRole('button', { name: 'Isolate' }).click();
  await expect(page.getByText('Nothing matches. Try fewer choices.')).toBeVisible();
  await expect(page.getByRole('treeitem')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('the Filter lists status with its icon and tags with their colour', async ({ page }) => {
  await page.goto('/?demo=40&plan=1');
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  await expect(
    page.getByRole('list', { name: 'Status' }).locator('.status-icon').first(),
  ).toBeVisible();
  await expect(page.getByRole('list', { name: 'Tags' }).locator('.tag-dot').first()).toBeVisible();
});

test('a Filter that matches nothing shows a message instead of failing', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?demo=14');
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search topics and lines' }).fill('zzzzqq');
  await page
    .getByRole('group', { name: 'How the Filter shows matches' })
    .first()
    .getByRole('button', { name: /Hide the rest|Isolate/ })
    .click();
  await expect(page.getByText('Nothing matches. Try fewer choices.')).toBeVisible();
  await expect(page.getByRole('treeitem')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('Filter choices carry their status icon and tag colour', async ({ page }) => {
  await page.goto('/?demo=40&plan=1');
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  await expect(
    page.getByRole('list', { name: 'Status' }).locator('.status-icon').first(),
  ).toBeVisible();
  await expect(page.getByRole('list', { name: 'Tags' }).locator('.tag-dot').first()).toBeVisible();
});

test('the match count is green when found and red when nothing matches', async ({ page }) => {
  await page.goto('/?demo=14');
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  const box = page.getByRole('searchbox', { name: 'Search topics and lines' });
  const count = page.locator('.filter-count');
  const colour = (el: import('@playwright/test').Locator) =>
    el.evaluate((node) => getComputedStyle(node).color);

  await box.fill('rsch');
  await expect(count).toHaveAttribute('data-state', 'found');
  const found = await colour(count);
  await box.fill('zzzzqq');
  await expect(count).toHaveAttribute('data-state', 'empty');
  const empty = await colour(count);
  expect(found).not.toBe(empty);
  const [fr = 0, fg = 0] = found.match(/\d+/g)?.map(Number) ?? [];
  const [er = 0, eg = 0] = empty.match(/\d+/g)?.map(Number) ?? [];
  expect(fg).toBeGreaterThan(fr);
  expect(er).toBeGreaterThan(eg);
});

test('status icons and text share one centre line in the Filter', async ({ page }) => {
  await page.goto('/?demo=40&plan=1');
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  const choice = page.getByRole('list', { name: 'Status' }).getByRole('button').first();
  const [icon, button] = await Promise.all([
    choice.locator('.status-icon').boundingBox(),
    choice.boundingBox(),
  ]);
  if (!icon || !button) throw new Error('missing');
  const iconMid = icon.y + icon.height / 2;
  const buttonMid = button.y + button.height / 2;
  expect(Math.abs(iconMid - buttonMid)).toBeLessThan(1.5);
});
