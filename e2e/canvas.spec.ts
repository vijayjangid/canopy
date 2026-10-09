import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

for (const scheme of ['light', 'dark'] as const) {
  test(`shows a map with no accessibility violations (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/?demo=14');
    await expect(page.getByRole('treeitem', { name: 'Product launch' })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
}

test('selects a topic by clicking it', async ({ page }) => {
  await page.goto('/?demo=14');
  await page.getByText('Customers').first().click();
  await expect(page.locator('.topic[data-selected]')).toHaveCount(1);
  await expect(page.locator('.topic[data-focused]')).toContainText('Customers');
});

test('zooms with the controls and the keyboard, and fits the map', async ({ page }) => {
  await page.goto('/?demo=14');
  const width = async () =>
    (
      await page
        .locator('.topic', { hasText: 'Product launch' })
        .locator('.topic-box')
        .boundingBox()
    )?.width ?? 0;
  await expect(page.locator('.zoom-controls output')).toHaveCount(0);
  const before = await width();
  await page.keyboard.press('Control+=');
  const zoomedIn = await width();
  expect(zoomedIn).toBeGreaterThan(before);
  await page.keyboard.press('Control+-');
  await page.keyboard.press('Control+-');
  expect(await width()).toBeLessThan(before);
  await page.getByRole('button', { name: 'Unfold everything' }).click();
  await expect.poll(async () => Math.abs((await width()) - before)).toBeLessThan(1);
});

test('Zen hides everything but the map, and Escape brings it back', async ({ page }) => {
  await page.goto('/?demo=14');
  await page.getByRole('button', { name: 'Zen' }).click();
  await expect(page.locator('.app-bar')).toBeHidden();
  await expect(page.locator('.zoom-controls')).toBeHidden();
  await expect(page.getByRole('navigation', { name: 'Map tools' })).toBeHidden();
  await expect(page.locator('.topic').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.app-bar')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Zen' })).toBeVisible();

  // The Z key and the exit button work too.
  await page.getByRole('tree', { name: 'Mind map' }).focus();
  await page.keyboard.press('z');
  await expect(page.locator('.app-bar')).toBeHidden();
  await page.getByRole('button', { name: /Exit Zen/ }).click();
  await expect(page.locator('.app-bar')).toBeVisible();
});

test('pans by holding Space and dragging', async ({ page }) => {
  await page.goto('/?demo=14');
  const topic = page.locator('.topic', { hasText: 'Product launch' });
  const start = await topic.boundingBox();
  await page.mouse.move(900, 200);
  await page.keyboard.down(' ');
  await page.mouse.down();
  await page.mouse.move(1000, 260, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.up(' ');
  const end = await topic.boundingBox();
  expect((end?.x ?? 0) - (start?.x ?? 0)).toBeCloseTo(100, -1);
  expect((end?.y ?? 0) - (start?.y ?? 0)).toBeCloseTo(60, -1);
});
