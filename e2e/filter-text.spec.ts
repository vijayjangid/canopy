import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/** Opens the search from the map with Cmd+F. */
async function openSearch(page: Page) {
  const dialog = page.getByRole('dialog', { name: 'Search' });
  const box = dialog.getByRole('combobox', { name: /^Search topics, commands/ });
  // Focus can still be settling after a dialog closed, so ask again until the box has it.
  await expect(async () => {
    await page.getByRole('tree', { name: 'Mind map' }).focus();
    await page.keyboard.press('Meta+f');
    await expect(box).toBeFocused({ timeout: 1000 });
  }).toPass();
  return { dialog, box };
}

/** Types `text`, picks the row that filters the map by it, and waits for the dialog to go. */
async function filterByText(page: Page, text: string) {
  const { dialog, box } = await openSearch(page);
  await box.fill(text);
  await dialog.getByRole('option', { name: /Highlight topics matching/ }).click();
  await expect(dialog).toHaveCount(0);
}

test('searching can turn the text into a Filter that picks out matching topics', async ({
  page,
}) => {
  await page.goto('/?demo=14');
  await filterByText(page, 'rsch');

  const control = page.locator('.filter-control');
  await expect(control).toContainText('rsch');
  const count = Number((await control.textContent())?.match(/\u00b7 (\d+)/)?.[1]);
  expect(count).toBeGreaterThan(0);
  await expect(page.locator('.topic[data-dim]').first()).toBeAttached();
  await expect(page.locator('.topic:not([data-dim])[data-depth]').first()).toBeAttached();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await control.getByRole('button', { name: 'Turn the Filter off' }).click();
  await expect(control).toHaveCount(0);
});

test('Cmd+F searches topics, commands and filters in one box', async ({ page }) => {
  await page.goto('/?demo=14');
  const { dialog, box } = await openSearch(page);
  await box.fill('rsch');
  await expect(dialog.getByRole('option', { name: /Research/ }).first()).toBeVisible();
  await expect(dialog.getByRole('option', { name: /Highlight topics matching/ })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await box.fill('block');
  await expect(dialog.getByRole('option', { name: 'Status: Blocked' })).toBeVisible();
  await box.fill('unfold');
  await expect(dialog.getByRole('option', { name: /Unfold everything/ })).toBeVisible();
});

test('the empty search offers quick filters, recent searches and common commands', async ({
  page,
}) => {
  await page.goto('/?demo=14');
  const { dialog, box } = await openSearch(page);
  await expect(dialog.getByRole('list', { name: 'Status' })).toBeVisible();
  await expect(dialog.getByRole('list', { name: 'Due date' })).toBeVisible();
  await expect(dialog.getByRole('option', { name: /Add sub-topic/ })).toBeVisible();
  await expect(dialog.getByRole('region', { name: 'Recent searches' })).toHaveCount(0);

  await box.fill('rsch');
  await dialog
    .getByRole('option', { name: /Research/ })
    .first()
    .click();
  await expect(dialog).toHaveCount(0);

  const again = await openSearch(page);
  const recent = again.dialog.getByRole('region', { name: 'Recent searches' });
  await expect(recent.getByRole('button', { name: 'rsch' })).toBeVisible();
  await recent.getByRole('button', { name: 'rsch' }).click();
  await expect(again.box).toHaveValue('rsch');
  await again.box.fill('');
  await again.dialog.getByRole('button', { name: 'Clear recent searches' }).click();
  await expect(recent).toHaveCount(0);
});

test('a quick filter applies at once and its count can be cleared', async ({ page }) => {
  await page.goto('/?demo=40&plan=1');
  const { dialog } = await openSearch(page);
  const status = dialog.getByRole('list', { name: 'Status' });
  await status.getByRole('button').first().click();
  await expect(dialog.getByRole('status').filter({ hasText: /match/ })).toBeVisible();
  await dialog.getByRole('button', { name: 'Clear filter' }).click();
  await expect(dialog.locator('.filter-count')).toHaveCount(0);
});

test('the Inspector shows the level of the topic only while level numbers are on', async ({
  page,
}) => {
  await page.goto('/?demo=14');
  await page.getByRole('treeitem', { name: 'Research', exact: true }).click();
  // Off by default, so the heading is just the name.
  await expect(page.locator('.panel-level')).toHaveCount(0);

  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('switch', { name: 'Level numbers' }).click();
  await expect(page.locator('.panel-level')).toContainText(/Level 3 \u00b7 3\.\d/);

  await page.getByRole('switch', { name: 'Level numbers' }).click();
  await expect(page.locator('.panel-level')).toHaveCount(0);
});

test('a long topic name wraps to two lines in the Inspector heading and then stops', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('tree', { name: 'Mind map' }).focus();
  await page.keyboard.press('Tab');
  const long =
    'Case Types and Data objects configuration for the whole Constellation application experience, including every channel and portal that it serves';
  await page.keyboard.type(long);
  await page.keyboard.press('Shift+Tab');
  await page.getByRole('treeitem', { name: /^Case Types/ }).click();
  const heading = page.locator('.panel-heading h2');
  await expect(heading).toBeVisible();
  const [lines, clamped, title] = await heading.evaluate((el) => {
    const style = getComputedStyle(el);
    const line = parseFloat(style.lineHeight);
    return [
      Math.round(el.clientHeight / line),
      el.scrollHeight > el.clientHeight + 1,
      el.getAttribute('title'),
    ];
  });
  expect(lines).toBe(2);
  expect(clamped).toBe(true);
  // The whole name is still there to read on hover.
  expect(title).toBe(long);
});

test('a Filter that finds nothing says so, and the map stays usable', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?demo=14');
  await filterByText(page, 'zzzzq');
  await page.locator('.filter-control').getByRole('button', { name: 'Isolate' }).click();
  await expect(page.locator('.filter-pill-count')).toHaveText('0');
  await expect(page.getByRole('treeitem')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('quick filters list status with its icon and tags with their colour', async ({ page }) => {
  await page.goto('/?demo=40&plan=1');
  const { dialog } = await openSearch(page);
  await expect(
    dialog.getByRole('list', { name: 'Status' }).locator('.status-icon').first(),
  ).toBeVisible();
  await expect(
    dialog.getByRole('list', { name: 'Tags' }).locator('.tag-dot').first(),
  ).toBeVisible();
});

test('the match count is green when found and red when nothing matches', async ({ page }) => {
  await page.goto('/?demo=14');
  const colour = (el: import('@playwright/test').Locator) =>
    el.evaluate((node) => getComputedStyle(node).color);

  await filterByText(page, 'rsch');
  const first = await openSearch(page);
  const count = first.dialog.locator('.filter-count');
  await expect(count).toHaveAttribute('data-state', 'found');
  const found = await colour(count);
  await first.dialog.getByRole('button', { name: 'Clear filter' }).click();
  await first.box.press('Escape');
  await expect(first.dialog).toHaveCount(0);

  await filterByText(page, 'zzzzqq');
  const second = await openSearch(page);
  const none = second.dialog.locator('.filter-count');
  await expect(none).toHaveAttribute('data-state', 'empty');
  const empty = await colour(none);
  expect(found).not.toBe(empty);
  const [fr = 0, fg = 0] = found.match(/\d+/g)?.map(Number) ?? [];
  const [er = 0, eg = 0] = empty.match(/\d+/g)?.map(Number) ?? [];
  expect(fg).toBeGreaterThan(fr);
  expect(er).toBeGreaterThan(eg);
});

test('status icons and text share one centre line in the quick filters', async ({ page }) => {
  await page.goto('/?demo=40&plan=1');
  const { dialog } = await openSearch(page);
  const choice = dialog.getByRole('list', { name: 'Status' }).getByRole('button').first();
  const [icon, button] = await Promise.all([
    choice.locator('.status-icon').boundingBox(),
    choice.boundingBox(),
  ]);
  if (!icon || !button) throw new Error('missing');
  expect(Math.abs(icon.y + icon.height / 2 - (button.y + button.height / 2))).toBeLessThan(1.5);
});
