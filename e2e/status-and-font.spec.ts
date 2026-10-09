import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('the status bar copies the path of the Trail', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/?demo=14');
  await page.getByRole('treeitem', { name: 'Research' }).click();
  await page.getByRole('button', { name: 'Copy path' }).click();
  await expect(page.getByText('Path copied')).toBeVisible();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toBe('!!Product launch>Insights>Roadmap and follow-up plan>Research');
});

test('a copied path pasted into a new topic builds the same chain', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/?demo=14');
  await page.getByRole('treeitem', { name: 'Research' }).click();
  await page.getByRole('button', { name: 'Copy path' }).click();
  const text = await page.evaluate(() => navigator.clipboard.readText());

  await page.goto('/');
  await page.getByRole('tree', { name: 'Mind map' }).focus();
  await page.keyboard.press('Tab');
  await page.keyboard.insertText(text);
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('treeitem')).toHaveCount(5);
  await expect(page.getByRole('treeitem', { name: 'Research', exact: true })).toHaveAttribute(
    'aria-level',
    '5',
  );
});

test('Font size makes the text on the map smaller or larger', async ({ page }) => {
  await page.goto('/?demo=14');
  const width = async () =>
    (
      await page
        .getByRole('treeitem', { name: 'Roadmap and follow-up plan' })
        .locator('.topic-box')
        .boundingBox()
    )?.width ?? 0;
  await expect.poll(width).toBeGreaterThan(0);
  const medium = await width();

  await page.getByRole('button', { name: 'Settings' }).click();
  const size = page.getByRole('group', { name: 'Font size' });
  await size.getByRole('button', { name: 'Large' }).click();
  await expect.poll(width).toBeGreaterThan(medium * 1.1);
  await size.getByRole('button', { name: 'Small' }).click();
  await expect.poll(width).toBeLessThan(medium * 0.95);
  await size.getByRole('button', { name: 'Medium' }).click();
  await expect.poll(async () => Math.abs((await width()) - medium)).toBeLessThan(2);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
