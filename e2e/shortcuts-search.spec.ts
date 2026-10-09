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

test('F and / open the search, like Cmd+F', async ({ page }) => {
  await page.goto('/');
  for (const key of ['f', '/']) {
    const search = page.getByRole('combobox', { name: /^Search topics, commands/ });
    // Focus can still be settling after the last dialog closed, so ask again until the box has it.
    await expect(async () => {
      await page.getByRole('tree', { name: 'Mind map' }).focus();
      await page.keyboard.press(key);
      await expect(search).toBeFocused({ timeout: 1000 });
    }).toPass();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('tree', { name: 'Mind map' })).toBeFocused();
  }
});
