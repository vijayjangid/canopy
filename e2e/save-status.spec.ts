import { expect, test } from '@playwright/test';

test('the app bar says when the map was last saved', async ({ page }) => {
  await page.goto('/');
  const badge = page.locator('.save-status');
  await expect(badge).toContainText('Autosave on');
  await page.getByRole('tree', { name: 'Mind map' }).focus();
  await page.keyboard.press('Tab');
  await page.keyboard.type('Hello');
  await page.keyboard.press('Shift+Tab');
  await expect(badge).toContainText(/Saved (just now|\d+s ago)/);
  await expect(badge.getByRole('status')).toHaveText('Saved');
});
