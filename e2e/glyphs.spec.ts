import { expect, test, type Page } from '@playwright/test';

const tree = (page: Page) => page.getByRole('tree', { name: 'Mind map' });

async function pastePicture(page: Page) {
  await page.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = 160;
    c.height = 100;
    const x = c.getContext('2d');
    if (!x) throw new Error('no canvas');
    x.fillStyle = '#e8590c';
    x.fillRect(0, 0, 160, 100);
    const blob = await new Promise<Blob>((r, j) =>
      c.toBlob((b) => (b ? r(b) : j(new Error('no blob'))), 'image/png'),
    );
    const data = new DataTransfer();
    data.items.add(new File([blob], 'a.png', { type: 'image/png' }));
    document
      .querySelector('[role="tree"]')
      ?.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true }));
  });
}

/** Core with a plain topic, one with a status and tags, a note, and a picture. */
async function build(page: Page) {
  await page.goto('/');
  await tree(page).focus();
  const add = async (title: string, how: 'Tab' | 'Enter') => {
    await page.keyboard.press(how);
    await page.keyboard.type(title);
  };
  await add('Plain text', 'Tab');
  await add('Doing it /doing #launch', 'Enter');
  await add('Late task /todo ^2020-01-01', 'Enter');
  await add('Has a note', 'Enter');
  await add('Has a picture', 'Enter');
  await page.keyboard.press('Shift+Tab');
  await page.waitForTimeout(300);
  await page.getByRole('treeitem', { name: 'Has a note', exact: true }).click();
  await page.keyboard.press('n');
  await page.getByRole('textbox', { name: 'Note' }).fill('hello');
  await page.getByRole('treeitem', { name: /^Has a picture/ }).click();
  await tree(page).focus();
  await pastePicture(page);
  await expect(page.locator('.topic-image')).toHaveCount(1);
  await page.waitForTimeout(400);
}

async function zoomOut(page: Page, steps: number) {
  await tree(page).focus();
  for (let i = 0; i < steps; i++) {
    await page.keyboard.press('Meta+-');
    await page.waitForTimeout(50);
  }
  await page.waitForTimeout(500);
}

/** The main glyph of the topic with this label. */
async function mainGlyph(page: Page, label: RegExp) {
  return page
    .getByRole('treeitem', { name: label })
    .locator('[data-glyph]:not([data-glyph="picture"])')
    .getAttribute('data-glyph');
}

test('at normal zoom topics show their text, and no icons', async ({ page }) => {
  await build(page);
  await expect(page.locator('.topic-glyph')).toHaveCount(0);
  await expect(page.locator('.topic-text').first()).toBeVisible();
});

test('zoomed out, topics show icons for what they hold instead of text', async ({ page }) => {
  await build(page);
  await zoomOut(page, 7);
  await expect(page.locator('.topic-text')).toHaveCount(0);

  // The Core is a house, text-only topics a T, a status its own mark, and a note its mark.
  expect(await mainGlyph(page, /Central topic/)).toBe('home');
  expect(await mainGlyph(page, /^Plain text/)).toBe('text');
  expect(await mainGlyph(page, /^Doing it/)).toBe('status');
  expect(await mainGlyph(page, /^Late task/)).toBe('status');
  expect(await mainGlyph(page, /^Has a note/)).toBe('note');

  // A picture gets a picture mark, and its title is a T under it.
  const pictured = page.getByRole('treeitem', { name: /^Has a picture/ });
  await expect(pictured.locator('[data-glyph="picture"]')).toHaveCount(1);
  expect(await mainGlyph(page, /^Has a picture/)).toBe('text');

  // Tags and due dates are small marks. A late date is drawn in the warning colour.
  await expect(
    page.getByRole('treeitem', { name: /^Doing it/ }).locator('[data-mark="tag"]'),
  ).toHaveCount(1);
  const late = page.getByRole('treeitem', { name: /^Late task/ }).locator('[data-mark="due"] rect');
  await expect(late).toHaveCount(1);
  await expect(
    page.getByRole('treeitem', { name: /^Plain text/ }).locator('[data-mark]'),
  ).toHaveCount(0);
});

test('zooming back in restores the text', async ({ page }) => {
  await build(page);
  await zoomOut(page, 7);
  await expect(page.locator('.topic-glyph').first()).toBeAttached();
  await page.getByRole('button', { name: 'Unfold everything' }).click();
  await expect(page.locator('.topic-glyph')).toHaveCount(0);
  await expect(page.locator('.topic-text').first()).toBeVisible();
});

test('zoomed-out icons are not read out, and the tree keeps its names', async ({ page }) => {
  await build(page);
  await zoomOut(page, 7);
  await expect(page.locator('.topic-glyph[aria-hidden="true"]').first()).toBeAttached();
  await expect(page.getByRole('treeitem', { name: /^Plain text/ })).toBeVisible();
});

test('fold buttons stay on a small map when it is zoomed out', async ({ page }) => {
  await build(page);
  await zoomOut(page, 7);
  await expect(page.locator('[data-parent-toggle]').first()).toBeAttached();
});
