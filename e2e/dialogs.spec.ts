import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('opens the shortcut cheat sheet with ? and closes it with Escape', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tree', { name: 'Mind map' }).focus();
  await page.keyboard.press('?');
  const dialog = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Add sub-topic');
  await expect(dialog).toContainText('Paste as peers');
  await expect(dialog).toContainText('1–9');

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  // Focus goes back to the map, so keys keep working.
  await expect(page.getByRole('tree', { name: 'Mind map' })).toBeFocused();
});

test('opens the cheat sheet from the top bar', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Keyboard shortcuts' }).click();
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
