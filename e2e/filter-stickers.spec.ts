import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('the Filter can pick out topics by sticker', async ({ page }) => {
  await page.goto('/?demo=40&plan=1');
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  const group = page.getByRole('list', { name: 'Stickers' });
  await expect(group).toBeVisible();

  const first = group.getByRole('button').first();
  const name = (await first.textContent())?.trim() ?? '';
  await first.click();
  await expect(first).toHaveAttribute('aria-pressed', 'true');

  const control = page.locator('.filter-control');
  await expect(control).toContainText(`Filter: ${name}`);
  const count = Number((await control.textContent())?.match(/· (\d+)/)?.[1]);
  expect(count).toBeGreaterThan(0);
  await expect(page.locator('.topic[data-dim]').first()).toBeAttached();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);

  await control.getByRole('button', { name: 'Turn the Filter off' }).click();
  await expect(page.locator('.topic[data-dim]')).toHaveCount(0);
});

test('only stickers that are on the map are offered', async ({ page }) => {
  await page.goto('/?demo=14');
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Stickers' })).toHaveCount(0);
});
