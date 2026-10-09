import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('the shortcuts dialog can be searched by name, group or key', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tree', { name: 'Mind map' }).focus();
  await page.keyboard.press('?');
  const dialog = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  const search = dialog.getByRole('searchbox', { name: 'Search shortcuts' });
  await expect(search).toBeFocused();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await search.fill('duplicate');
  await expect(dialog.locator('.cheat-row')).toHaveCount(1);
  await expect(dialog.getByRole('heading', { name: 'Create' })).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Edit' })).toHaveCount(0);

  await search.fill('cmd d');
  await expect(dialog.getByText('Duplicate branch')).toBeVisible();

  await search.fill('planning');
  await expect(dialog.getByRole('heading', { name: 'Planning' })).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Create' })).toHaveCount(0);

  await search.fill('zzzz');
  await expect(dialog.getByText('No shortcuts match')).toBeVisible();

  // Escape clears the search first, then closes the dialog.
  await page.keyboard.press('Escape');
  await expect(search).toHaveValue('');
  await expect(dialog.locator('.cheat-row').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('F opens the Filter, like /', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tree', { name: 'Mind map' }).focus();
  await page.keyboard.press('f');
  await expect(page.getByRole('dialog', { name: 'Filter' })).toBeVisible();
});
