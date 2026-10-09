import AxeBuilder from '@axe-core/playwright';
import { openMapPanel } from './panels';
import { expect, test } from '@playwright/test';

const html = (page: import('@playwright/test').Page) => page.locator('html');

async function openPrefs(page: import('@playwright/test').Page) {
  return openMapPanel(page, 'Settings');
}

test('Preferences changes the Look and the map redraws', async ({ page }) => {
  await page.goto('/?demo=40');
  const dialog = await openPrefs(page);
  await dialog
    .getByRole('group', { name: 'Theme' })
    .getByRole('button', { name: 'Playful' })
    .click();
  await expect(html(page)).toHaveAttribute('data-look', 'playful');
  await dialog.getByRole('switch', { name: 'Level numbers' }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.level-prefix').first()).toBeVisible();
  await expect(page.locator('.level-prefix').first()).toHaveText(/^1\./);
  await expect(page.locator('.topic[data-level="1"]').first()).toBeVisible();
});

test('the Font choice changes the map text and sizes topics again', async ({ page }) => {
  await page.goto('/?demo=20');
  const first = page.locator('.topic[data-depth="1"] .topic-box').first();
  const before = await first.getAttribute('width');
  const dialog = await openPrefs(page);
  await dialog.getByRole('group', { name: 'Font' }).getByRole('button', { name: 'Mono' }).click();
  await expect(html(page)).toHaveAttribute('data-voice', 'mono');
  await expect.poll(() => first.getAttribute('width')).not.toBe(before);
});

test('connector styles can be switched', async ({ page }) => {
  await page.goto('/?demo=20');
  const dialog = await openPrefs(page);
  await dialog
    .getByRole('group', { name: 'Connectors' })
    .getByRole('button', { name: 'Tapered' })
    .click();
  await expect(page.locator('.connector[data-style="tapered"]').first()).toBeAttached();
});

test('the Look follows Auto mode and the map', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/?demo=10');
  await expect(html(page)).toHaveAttribute('data-scheme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(html(page)).toHaveAttribute('data-scheme', 'light');
});

for (const look of ['Minimal', 'High contrast', 'Playful']) {
  for (const scheme of ['light', 'dark'] as const) {
    test(`${look} (${scheme}) has no accessibility violations`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/?demo=30');
      const dialog = await openPrefs(page);
      await dialog
        .getByRole('group', { name: 'Theme' })
        .getByRole('button', { name: look })
        .click();
      await dialog.getByRole('switch', { name: 'Level numbers' }).click();
      const dialogResults = await new AxeBuilder({ page }).analyze();
      expect(dialogResults.violations).toEqual([]);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }
}

// Every Look, Mode and Voice together: the map must stay free of accessibility violations.
for (const look of ['Minimal', 'High contrast', 'Playful']) {
  for (const voice of ['Clean', 'Editorial', 'Mono', 'Sketch']) {
    for (const scheme of ['light', 'dark'] as const) {
      test(`${look} + ${voice} (${scheme}) renders without violations`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto('/?demo=20');
        const dialog = await openPrefs(page);
        await dialog
          .getByRole('group', { name: 'Theme' })
          .getByRole('button', { name: look })
          .click();
        await dialog
          .getByRole('group', { name: 'Font' })
          .getByRole('button', { name: voice })
          .click();
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog')).toHaveCount(0);
        const results = await new AxeBuilder({ page }).analyze();
        expect(results.violations).toEqual([]);
      });
    }
  }
}
