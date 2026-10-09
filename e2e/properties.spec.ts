import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const tree = (page: Page) => page.getByRole('tree', { name: 'Mind map' });
const panel = (page: Page) => page.getByRole('complementary', { name: 'Inspector' });

async function startWithTopic(page: Page) {
  await page.goto('/');
  await tree(page).focus();
  await page.keyboard.press('Tab');
  await page.keyboard.type('Plan');
  await page.keyboard.press('Shift+Tab');
  await tree(page).focus();
  await page.keyboard.press('i');
}

test('status is chosen with pills, and a second click clears it', async ({ page }) => {
  await startWithTopic(page);
  const status = panel(page).getByRole('group', { name: 'Status' });
  await status.getByRole('button', { name: 'In progress' }).click();
  await expect(status.getByRole('button', { name: 'In progress' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('treeitem', { name: /Plan, status In progress/ })).toBeVisible();

  await status.getByRole('button', { name: 'In progress' }).click();
  await expect(status.getByRole('button', { pressed: true })).toHaveCount(0);
  await expect(page.getByRole('treeitem', { name: /Plan, status/ })).toHaveCount(0);
});

test('a due date takes a quick choice or a picked date, and can be cleared', async ({ page }) => {
  await startWithTopic(page);
  const due = panel(page).getByRole('group', { name: 'Due date' });
  await due.getByRole('button', { name: 'Today' }).click();
  await expect(due.getByRole('button', { name: 'Today' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('treeitem', { name: /Plan, due/ })).toBeVisible();

  const input = panel(page).locator('input[type="date"]');
  await input.fill('2030-01-15');
  await expect(due.getByRole('button', { pressed: true })).toHaveCount(0);
  await expect(page.getByRole('treeitem', { name: /Plan, due/ })).toBeVisible();

  await panel(page).getByRole('button', { name: 'Clear due date' }).click();
  await expect(input).toHaveValue('');
  await expect(page.getByRole('treeitem', { name: /Plan, due/ })).toHaveCount(0);
});

test('tags are added with a comma, and existing tags are offered as suggestions', async ({
  page,
}) => {
  await startWithTopic(page);
  const add = panel(page).getByLabel('Add a tag');
  await add.fill('alpha,');
  await expect(add).toHaveValue('');
  await add.fill('beta');
  await page.keyboard.press('Enter');
  await expect(panel(page).getByRole('list', { name: 'Tags' }).getByRole('listitem')).toHaveCount(
    2,
  );

  // Another topic can reuse a tag from the suggestions.
  await tree(page).focus();
  await page.keyboard.press('Enter');
  await page.keyboard.type('Next');
  await page.keyboard.press('Shift+Tab');
  await tree(page).focus();
  await panel(page).getByRole('button', { name: 'Add tag alpha' }).click();
  await expect(page.getByRole('treeitem', { name: /Next.*tags alpha/ })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('a new sticker is stamped on with a burst of lines', async ({ page }) => {
  await startWithTopic(page);
  await panel(page).getByRole('button', { name: 'Star', exact: true }).click();
  await expect(page.locator('.stickers .sticker-stamp')).toHaveCount(1);
  await expect(page.locator('.stickers .stamp-ray')).toHaveCount(8);
});
