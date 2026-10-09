import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { mapPanel, openMapPanel } from './panels';

const tree = (page: Page) => page.getByRole('tree', { name: 'Mind map' });

test('switches colour mode and remembers it', async ({ page }) => {
  await page.goto('/');
  const root = page.locator('html');
  await openMapPanel(page, 'Settings');
  await page.getByRole('button', { name: 'Dark', exact: true }).click();
  await expect(root).toHaveAttribute('data-mode', 'dark');
  await expect(page.getByRole('button', { name: 'Dark', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.reload();
  await expect(root).toHaveAttribute('data-mode', 'dark');
  await expect(mapPanel(page)).toBeVisible();
  await page.getByRole('button', { name: 'Light', exact: true }).click();
  await expect(root).toHaveAttribute('data-mode', 'light');
  await page.getByRole('button', { name: 'Auto', exact: true }).click();
  await expect(root).not.toHaveAttribute('data-mode');
});

test('renames the map and lists it under Maps', async ({ page }) => {
  await page.goto('/');
  const title = page.getByRole('textbox', { name: 'Map title' });
  await title.fill('Launch plan');
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: 'File', exact: true }).click();
  await expect(page.getByRole('menuitemradio', { name: /Launch plan/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toHaveCount(0);
});

test('starts a new map and shows a first-run hint until the first idea', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.first-run')).toContainText('Start your map');
  await tree(page).focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('.first-run')).toHaveCount(0);
  await page.keyboard.type('Idea');
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('treeitem')).toHaveCount(2);

  await fileMenu(page, 'New map');
  await expect(page.getByRole('treeitem')).toHaveCount(1);
  await expect(page.locator('.first-run')).toBeVisible();
});

test('saves a map to a file and opens it again', async ({ page }) => {
  // Force the plain download path, which works the same in every browser.
  await page.addInitScript(() => {
    (window as unknown as { showSaveFilePicker?: unknown }).showSaveFilePicker = undefined;
  });
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Map title' }).fill('Roadmap');
  await tree(page).focus();
  await page.keyboard.press('Tab');
  await page.keyboard.type('Research');
  await page.keyboard.press('Tab');
  await page.keyboard.type('Interviews');
  await page.keyboard.press('Shift+Tab');

  const download = page.waitForEvent('download');
  await fileMenu(page, 'Save a copy…');
  const file = await download;
  expect(file.suggestedFilename()).toBe('Roadmap.canopy.json');
  const path = await file.path();
  const json = JSON.parse(readFileSync(path, 'utf8'));
  expect(json.schema).toBe('canopy/1');
  expect(json.core.children[0].title).toBe('Research');
  expect(json.core.children[0].children[0].title).toBe('Interviews');

  await fileMenu(page, 'New map');
  await expect(page.getByRole('treeitem')).toHaveCount(1);

  const chooser = page.waitForEvent('filechooser');
  await fileMenu(page, 'Open…');
  await (await chooser).setFiles(path);
  await expect(page.getByRole('treeitem', { name: 'Interviews', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Map title' })).toHaveValue('Roadmap');
});

test('explains why a file cannot be opened', async ({ page }) => {
  await page.goto('/');
  const chooser = page.waitForEvent('filechooser');
  await fileMenu(page, 'Open…');
  await (
    await chooser
  ).setFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"schema":"other/9"}'),
  });
  await expect(page.getByRole('group', { name: 'Notification' })).toContainText(
    'Could not open the file',
  );
  await expect(page.getByRole('treeitem')).toHaveCount(1);
});

async function fileMenu(page: import('@playwright/test').Page, item: string) {
  await page.getByRole('button', { name: 'File', exact: true }).click();
  await page.getByRole('menuitem', { name: item }).click();
}
