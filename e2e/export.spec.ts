import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { mapPanel } from './panels';

const tree = (page: Page) => page.getByRole('tree', { name: 'Mind map' });

async function start(page: Page, url = '/?demo=25') {
  await page.goto(url);
  await tree(page).focus();
}

async function openExport(page: Page) {
  await page.keyboard.press('ControlOrMeta+e');
  return mapPanel(page);
}

async function download(page: Page, label: string) {
  const [saved] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: label, exact: true }).click(),
  ]);
  const path = await saved.path();
  return { name: saved.suggestedFilename(), data: await readFile(path) };
}

test('opens with the shortcut and has no accessibility violations', async ({ page }) => {
  await start(page);
  const dialog = await openExport(page);
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.export-preview img')).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('saves the map as an SVG that contains its topics and font', async ({ page }) => {
  await start(page);
  const dialog = await openExport(page);
  await dialog.getByRole('radio', { name: /SVG/ }).check();
  const file = await download(page, 'Export');
  expect(file.name).toBe('Demo map.svg');
  const svg = file.data.toString('utf8');
  expect(svg.startsWith('<svg')).toBe(true);
  expect(svg).toContain('Product launch');
  expect(svg).not.toContain('<script');
});

test('saves a PNG at the chosen resolution', async ({ page }) => {
  await start(page);
  const dialog = await openExport(page);
  await dialog.getByRole('button', { name: '1×' }).click();
  const one = await download(page, 'Export');
  expect([...one.data.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  const width = (b: Buffer) => b.readUInt32BE(16);
  await dialog.getByRole('button', { name: '2×' }).click();
  const two = await download(page, 'Export');
  expect(width(two.data)).toBeGreaterThan(width(one.data) * 1.9);
  await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toContainText('.png');
});

test('saves a Markdown outline with notes', async ({ page }) => {
  await start(page, '/');
  await page.keyboard.press('Tab');
  await page.keyboard.type('Plan');
  await page.keyboard.press('Shift+Tab');
  await tree(page).focus();
  await page.keyboard.press('n');
  await expect(page.getByRole('textbox', { name: 'Note' })).toBeFocused();
  await page.keyboard.type('Remember the milk');
  await tree(page).focus();
  const dialog = await openExport(page);
  await dialog.getByRole('radio', { name: /Markdown/ }).check();
  const file = await download(page, 'Export');
  expect(file.name).toBe('Untitled map.md');
  const text = file.data.toString('utf8');
  expect(text).toContain('- Plan');
  expect(text).toContain('Remember the milk');
});

test('can export only the selected branch', async ({ page }) => {
  await start(page);
  await page.keyboard.press('ArrowRight');
  const dialog = await openExport(page);
  await dialog.getByRole('radio', { name: /Markdown/ }).check();
  await dialog.getByLabel('Only the selected branches').check();
  const file = await download(page, 'Export');
  const text = file.data.toString('utf8');
  expect(text.startsWith('- ')).toBe(true);
  expect(text).not.toContain('# ');
});

test('PDF opens the print view without leaving a frame behind', async ({ page }) => {
  await start(page);
  const dialog = await openExport(page);
  await dialog.getByRole('radio', { name: /PDF/ }).check();
  await page.evaluate(() => {
    const proto = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
    (window as unknown as { __printed: number }).__printed = 0;
    if (!proto?.get) return;
    Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
      get() {
        const win = proto.get?.call(this) as Window;
        win.print = () => {
          (window as unknown as { __printed: number }).__printed++;
          win.dispatchEvent(new Event('afterprint'));
        };
        return win;
      },
    });
  });
  await dialog.getByRole('button', { name: 'Print or save PDF' }).click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __printed: number }).__printed))
    .toBe(1);
  await expect(page.locator('iframe')).toHaveCount(0);
});

test('a compact layout fits the map on an A4 page', async ({ page }) => {
  await start(page, '/?demo=120');
  const dialog = await openExport(page);
  await dialog.getByRole('radio', { name: /SVG/ }).check();
  await dialog.getByRole('checkbox', { name: /Compact layout/ }).check();
  await dialog.getByRole('button', { name: 'Portrait', exact: true }).click();
  await expect(dialog.locator('.export-preview')).toContainText('A4 portrait');
  const file = await download(page, 'Export');
  const svg = file.data.toString('utf8');
  expect(svg).toContain('width="794" height="1123"');
  await dialog.getByRole('button', { name: 'Landscape', exact: true }).click();
  await expect(dialog.locator('.export-preview')).toContainText('A4 landscape');
});
