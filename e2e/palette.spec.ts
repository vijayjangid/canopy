import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('opens with the shortcut, filters as you type, and runs the command', async ({ page }) => {
  await page.goto('/');
  const map = page.getByRole('tree', { name: 'Mind map' });
  await map.focus();
  await page.keyboard.press('ControlOrMeta+k');
  const dialog = page.getByRole('dialog', { name: 'Command palette' });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Type a command' })).toBeFocused();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);

  await page.keyboard.type('add sub');
  await expect(dialog.getByRole('option').first()).toContainText('Add sub-topic');
  await page.keyboard.press('Enter');
  await expect(dialog).toHaveCount(0);
  // The command ran on the map, and its editor has focus.
  await expect(page.getByRole('textbox', { name: /topic/i })).toBeFocused();
});

test('moves through results with arrows and runs a map preference', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tree', { name: 'Mind map' }).focus();
  await page.keyboard.press('ControlOrMeta+k');
  await page.keyboard.type('theme');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).not.toHaveAttribute('data-look', 'minimal');
});

test('shows the key for a command and remembers recent ones', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tree', { name: 'Mind map' }).focus();
  await page.keyboard.press('ControlOrMeta+k');
  await page.keyboard.type('fit');
  await expect(page.getByRole('option', { name: /Fit to screen/ }).locator('kbd')).toHaveCount(1);
  await page.keyboard.press('Enter');
  await page.keyboard.press('ControlOrMeta+k');
  await expect(page.getByRole('option').first()).toContainText('Fit to screen');
  // Used commands lead, under their own heading.
  await expect(page.locator('.palette-group').first()).toHaveText('Recent');

  // Searching shows each result's group as a subtitle.
  await page.keyboard.type('zoom in');
  await expect(page.getByRole('option').first().locator('.palette-sub')).toHaveText('View');
});

test('Escape closes the palette and returns to the map', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tree', { name: 'Mind map' }).focus();
  await page.keyboard.press('ControlOrMeta+k');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('tree', { name: 'Mind map' })).toBeFocused();
});
