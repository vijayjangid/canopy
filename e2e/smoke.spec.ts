import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('loads a blank map with no accessibility violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('textbox', { name: 'Map title' })).toBeVisible();
  await expect(page.getByRole('tree', { name: 'Mind map' })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
