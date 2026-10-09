import { expect, test } from '@playwright/test';

for (const combo of ['Shift+Enter', 'Alt+Enter', 'ControlOrMeta+Enter']) {
  test(`${combo} breaks the line inside a topic title`, async ({ page }) => {
    await page.goto('/');
    const tree = page.getByRole('tree', { name: 'Mind map' });
    await tree.focus();
    await page.keyboard.press('Tab');
    const field = page.getByRole('textbox', { name: 'Topic title' });
    await expect(field).toBeFocused();
    await page.keyboard.type('First line');
    await page.keyboard.press(combo);
    await page.keyboard.type('Second line');
    await expect(field).toHaveValue('First line\nSecond line');
    await page.keyboard.press('Shift+Tab');
    const lines = page.locator('.topic[data-depth="1"] .topic-text tspan');
    await expect(lines).toHaveText(['First line', 'Second line']);
  });
}
