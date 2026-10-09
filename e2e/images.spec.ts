import { expect, test, type Page } from '@playwright/test';

const tree = (page: Page) => page.getByRole('tree', { name: 'Mind map' });

/** Pastes a generated picture, as if copied from another app. */
async function pastePicture(page: Page, w: number, h: number, selector = '[role="tree"]') {
  await page.evaluate(
    async ({ w, h, selector }) => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('no canvas');
      const gradient = ctx.createLinearGradient(0, 0, w, h);
      gradient.addColorStop(0, '#e03131');
      gradient.addColorStop(1, '#1c7ed6');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('no blob'))), 'image/png'),
      );
      const data = new DataTransfer();
      data.items.add(new File([blob], 'copied.png', { type: 'image/png' }));
      const target = document.querySelector(selector);
      target?.dispatchEvent(
        new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
      );
    },
    { w, h, selector },
  );
}

const box = (page: Page) => page.locator('.topic[data-focused] .topic-box').first();

async function newTopic(page: Page, title: string) {
  await page.goto('/');
  await tree(page).focus();
  await page.keyboard.press('Tab');
  await page.keyboard.type(title);
  await page.keyboard.press('Shift+Tab');
  await page.waitForTimeout(200);
  await tree(page).focus();
}

test('a pasted picture goes on the topic, and the topic grows to hold it', async ({ page }) => {
  await newTopic(page, 'Logo');
  const before = await box(page).boundingBox();
  await pastePicture(page, 120, 80);

  const image = page.locator('.topic-image');
  await expect(image).toHaveCount(1);
  expect(Number(await image.getAttribute('width'))).toBe(120);
  expect(Number(await image.getAttribute('height'))).toBe(80);
  if (!before) throw new Error('missing box');
  await expect
    .poll(async () => (await box(page).boundingBox())?.height ?? 0)
    .toBeGreaterThanOrEqual(before.height + 80);
  await expect
    .poll(async () => (await box(page).boundingBox())?.width ?? 0)
    .toBeGreaterThanOrEqual(120);
});

test('a huge picture is scaled down to a fixed maximum', async ({ page }) => {
  await newTopic(page, 'Photo');
  await pastePicture(page, 3000, 1500);

  const image = page.locator('.topic-image');
  await expect(image).toHaveCount(1);
  expect(Number(await image.getAttribute('width'))).toBe(280);
  expect(Number(await image.getAttribute('height'))).toBe(140);
  await expect.poll(async () => (await box(page).boundingBox())?.height ?? 0).toBeGreaterThan(140);
  const size = await box(page).boundingBox();
  if (!size) throw new Error('missing box');
  expect(size.width).toBeLessThanOrEqual(280 + 16 + 30);
  expect(size.height).toBeLessThanOrEqual(200 + 8 + 70);
});

test('a picture can be undone, removed from the menu, and survives a reload', async ({ page }) => {
  await newTopic(page, 'Chart');
  await pastePicture(page, 100, 100);
  await expect(page.locator('.topic-image')).toHaveCount(1);

  await page.keyboard.press('Meta+z');
  await expect(page.locator('.topic-image')).toHaveCount(0);
  await page.keyboard.press('Meta+Shift+z');
  await expect(page.locator('.topic-image')).toHaveCount(1);

  await page.waitForTimeout(1200);
  await page.reload();
  await expect(page.locator('.topic-image')).toHaveCount(1);

  await page.locator('.topic[data-kind="topic"]', { hasText: 'Chart' }).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Remove picture' }).click();
  await expect(page.locator('.topic-image')).toHaveCount(0);
});

test('pasting text still pastes topics, not a picture', async ({ page }) => {
  await newTopic(page, 'Plain');
  await page.evaluate(() => {
    const data = new DataTransfer();
    data.setData('text/plain', 'One\n  Two');
    document
      .querySelector('[role="tree"]')
      ?.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true }));
  });
  await expect(page.getByRole('treeitem', { name: 'One', exact: false }).first()).toBeVisible();
  await expect(page.locator('.topic-image')).toHaveCount(0);
});

test('a picture can be pasted while the title is being edited', async ({ page }) => {
  await newTopic(page, 'Draft');
  await page.keyboard.press('Space');
  const editor = page.getByRole('textbox', { name: 'Topic title' });
  await expect(editor).toBeFocused();
  await page.keyboard.press('End');
  await page.keyboard.type(' two');

  await pastePicture(page, 200, 100, 'textarea.title-editor');
  await expect(page.locator('.topic-image')).toHaveCount(1);
  // Editing carries on, with the typed text intact and the field clear of the picture.
  await expect(editor).toBeFocused();
  await expect(editor).toHaveValue('Draft two');
  await page.keyboard.type('!');
  await expect(editor).toHaveValue('Draft two!');
  const picture = await page.locator('.topic-image').boundingBox();
  const field = await editor.boundingBox();
  if (!picture || !field) throw new Error('missing boxes');
  expect(field.y).toBeGreaterThanOrEqual(picture.y + picture.height - 1);
});

test('a new empty topic keeps a picture pasted while editing it', async ({ page }) => {
  await page.goto('/');
  await tree(page).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('textbox', { name: 'Topic title' })).toBeFocused();
  await pastePicture(page, 90, 90, 'textarea.title-editor');
  await expect(page.locator('.topic-image')).toHaveCount(1);
  await page.keyboard.press('Shift+Tab');
  await page.waitForTimeout(300);
  await expect(page.locator('.topic-image')).toHaveCount(1);
  await expect(page.getByRole('treeitem')).toHaveCount(2);
});

test('the delete icon on a picture removes it, and undo brings it back', async ({ page }) => {
  await newTopic(page, 'Chart');
  await pastePicture(page, 100, 100);
  await expect(page.locator('.topic-image')).toHaveCount(1);

  const remove = page.locator('[data-image-delete]');
  await expect(remove).toHaveCount(1);
  await page.locator('.topic[data-kind="topic"]', { hasText: 'Chart' }).hover();
  await expect(remove).toBeVisible();
  await remove.click();
  await expect(page.locator('.topic-image')).toHaveCount(0);

  await tree(page).focus();
  await page.keyboard.press('Meta+z');
  await expect(page.locator('.topic-image')).toHaveCount(1);
});

test('the Alt icon edits the picture description, which is announced and kept', async ({
  page,
}) => {
  await newTopic(page, 'Logo');
  await pastePicture(page, 100, 100);
  await expect(page.locator('.topic-image')).toHaveCount(1);
  await expect(page.locator('.topic-image title')).toHaveCount(0);

  await page.locator('.topic[data-kind="topic"]', { hasText: 'Logo' }).hover();
  await page.locator('[data-image-alt]').click();
  const field = page.getByRole('textbox', { name: 'Picture description' });
  await expect(field).toBeFocused();
  await field.fill('Company logo on white');
  await page.keyboard.press('Enter');
  await expect(field).toHaveCount(0);

  await expect(page.locator('.topic-image title')).toHaveText('Company logo on white');
  await expect(
    page.getByRole('treeitem', { name: /Logo.*picture: Company logo on white/ }),
  ).toBeVisible();
  await expect(page.locator('[data-image-alt]')).toHaveAttribute('data-has-alt', 'true');

  // Escape drops what was typed.
  await page.locator('[data-image-alt]').click();
  await page.getByRole('textbox', { name: 'Picture description' }).fill('Changed my mind');
  await page.keyboard.press('Escape');
  await expect(page.locator('.topic-image title')).toHaveText('Company logo on white');
});

test('Describe picture is in the topic menu', async ({ page }) => {
  await newTopic(page, 'Menu');
  await pastePicture(page, 80, 80);
  await page.locator('.topic[data-kind="topic"]', { hasText: 'Menu' }).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Describe picture…' }).click();
  await expect(page.getByRole('textbox', { name: 'Picture description' })).toBeFocused();
});
