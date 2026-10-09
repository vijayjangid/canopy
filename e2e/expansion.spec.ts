import { expect, test, type Page } from '@playwright/test';

const tree = (page: Page) => page.getByRole('tree', { name: 'Mind map' });

async function typeNewTopic(page: Page, text: string, finish = 'Shift+Tab') {
  await page.goto('/');
  await tree(page).focus();
  await page.keyboard.press('Tab');
  await page.keyboard.type(text);
  if (finish) await page.keyboard.press(finish);
}

test('!!a>b>c makes a chain of children', async ({ page }) => {
  await typeNewTopic(page, '!!a>b>c');
  await expect(page.getByRole('treeitem')).toHaveCount(4);
  await expect(page.getByRole('treeitem', { name: 'c', exact: true })).toHaveAttribute(
    'aria-level',
    '4',
  );
});

test('!!a,b,c makes siblings, and shows a preview while typing', async ({ page }) => {
  await typeNewTopic(page, '!!a, b, c', '');
  await expect(page.locator('.title-guide')).toContainText('3 topics');
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('.topic[data-depth="1"]')).toHaveCount(3);
});

test('lines work as siblings too, and one undo puts the text back', async ({ page }) => {
  await page.goto('/');
  await tree(page).focus();
  await page.keyboard.press('Tab');
  await page.keyboard.type('!!one');
  await page.keyboard.press('Alt+Enter');
  await page.keyboard.type('two');
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('.topic[data-depth="1"]')).toHaveCount(2);
  await page.keyboard.press('ControlOrMeta+z');
  await expect(page.locator('.topic[data-depth="1"]')).toHaveCount(1);
});

test('text expansion can be switched off', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() =>
    localStorage.setItem(
      'canopy.settings',
      JSON.stringify({ discardBlank: false, textExpansion: false }),
    ),
  );
  await page.reload();
  await tree(page).focus();
  await page.keyboard.press('Tab');
  await page.keyboard.type('!!a>b');
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('treeitem')).toHaveCount(2);
});

test('typing !! shows expression mode, and removing it hides the mode', async ({ page }) => {
  await page.goto('/');
  await tree(page).focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('.title-mode')).toHaveCount(0);
  await page.keyboard.type('!!');
  await expect(page.locator('.title-mode')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Topic title' })).toHaveAttribute(
    'data-expression',
    'true',
  );
  await page.keyboard.press('Backspace');
  await expect(page.locator('.title-mode')).toHaveCount(0);
});

test('typing !! guides the next step, and its buttons type for you', async ({ page }) => {
  await page.goto('/');
  await tree(page).focus();
  await page.keyboard.press('Tab');
  await page.keyboard.type('!!');
  const guide = page.locator('.title-guide');
  await expect(guide).toContainText('Type a name');
  await expect(page.locator('.hint-strip')).toContainText('Child');
  await expect(page.locator('.hint-strip')).toContainText('Sibling');

  await page.keyboard.type('Plan');
  await expect(guide).toContainText('child of “Plan”');
  await guide.getByRole('button', { name: /Child/ }).click();
  await expect(page.getByRole('textbox', { name: 'Topic title' })).toHaveValue('!!Plan>');
  await expect(guide).toContainText('Type the child');

  await page.keyboard.type('Research');
  await guide.getByRole('button', { name: /Sibling/ }).click();
  await expect(guide).toContainText('Type the next sibling');
  await page.keyboard.type('Build');
  await expect(guide).toContainText('3 topics');
  await guide.getByRole('button', { name: /Apply/ }).click();
  await expect(page.getByRole('treeitem')).toHaveCount(4);
});
