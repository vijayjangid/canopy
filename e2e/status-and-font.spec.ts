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
