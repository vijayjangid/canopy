import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('opens with the shortcut, filters as you type, and runs the command', async ({ page }) => {
  await page.goto('/');
  const map = page.getByRole('tree', { name: 'Mind map' });
  await map.focus();
  await page.keyboard.press('ControlOrMeta+k');
  const dialog = page.getByRole('dialog', { name: 'Search' });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('combobox', { name: /^Search topics, commands/ })).toBeFocused();

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

test('shows the key for a command and lists the common commands when empty', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tree', { name: 'Mind map' }).focus();
  await page.keyboard.press('ControlOrMeta+k');
  await page.keyboard.type('unfold');
  await expect(page.getByRole('option', { name: /Unfold everything/ }).locator('kbd')).toHaveCount(
    1,
  );
  await page.keyboard.press('Enter');
  await page.keyboard.press('ControlOrMeta+k');
  // With nothing typed, the common commands are listed: sub-topic, peer, unfold all and the other layout.
  const options = page.getByRole('option');
  await expect(options).toHaveCount(4);
  await expect(options.nth(0)).toContainText('Add sub-topic');
  await expect(options.nth(1)).toContainText('Add peer below');
  await expect(options.nth(2)).toContainText('Unfold everything');
  await expect(options.nth(3)).toContainText('Layout: Down');
  await expect(page.locator('.palette-group').first()).toHaveText('Common commands');

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

test('Unfold everything from the search also fits the whole map in view', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/?demo=40');
  const tree = page.getByRole('tree', { name: 'Mind map' });
  await tree.focus();
  await page.keyboard.press('1');
  await page.waitForTimeout(500);
  const folded = await page.locator('.topic').count();

  await page.keyboard.press('ControlOrMeta+k');
  await page.getByRole('option', { name: /Unfold everything/ }).click();
  await expect.poll(() => page.locator('.topic').count()).toBeGreaterThan(folded);
  // Every topic ends up inside the window.
  await expect
    .poll(async () =>
      page.locator('.topic').evaluateAll((nodes) => {
        const view = { w: window.innerWidth, h: window.innerHeight };
        return nodes.every((n) => {
          const r = n.getBoundingClientRect();
          return r.left >= 0 && r.top >= 0 && r.right <= view.w && r.bottom <= view.h;
        });
      }),
    )
    .toBe(true);
});
