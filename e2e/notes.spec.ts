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
}

test('a note is written with rich text and previewed on the node', async ({ page }) => {
  await startWithTopic(page);
  await page.keyboard.press('n');
  const note = panel(page).getByRole('textbox', { name: 'Note' });
  await expect(note).toBeFocused();

  await note.pressSequentially('- first item\nsecond item\n\n');
  await panel(page).getByRole('button', { name: 'Bold' }).click();
  await page.keyboard.type('bold words');
  await panel(page).getByRole('button', { name: 'Bold' }).click();

  await expect(note.locator('ul li')).toHaveCount(2);
  await expect(note.locator('strong')).toHaveText('bold words');

  const node = page.locator('[data-topic-id]', { hasText: 'Plan' }).first();
  await expect(node).toHaveAttribute('data-node-type', 'note');
  await expect(node.locator('.topic-note-text').first()).toContainText('first item');
  await expect(page.getByRole('treeitem', { name: /Plan, note: first item/ })).toBeVisible();
});

test('a link can be added from the toolbar and shows underlined on the node', async ({ page }) => {
  await startWithTopic(page);
  await page.keyboard.press('n');
  const note = panel(page).getByRole('textbox', { name: 'Note' });
  await note.pressSequentially('docs');
  await page.keyboard.press('ControlOrMeta+a');
  await panel(page).getByRole('button', { name: 'Link' }).click();
  await panel(page).getByLabel('Link address').fill('example.com');
  await page.keyboard.press('Enter');

  await expect(note.locator('a')).toHaveAttribute('href', 'https://example.com');
  await expect(page.locator('.topic-note-text tspan[text-decoration="underline"]')).toHaveText(
    'docs',
  );
});

test('a bad link address is refused', async ({ page }) => {
  await startWithTopic(page);
  await page.keyboard.press('n');
  await panel(page).getByRole('textbox', { name: 'Note' }).pressSequentially('x');
  await page.keyboard.press('ControlOrMeta+a');
  await panel(page).getByRole('button', { name: 'Link' }).click();
  await panel(page).getByLabel('Link address').fill('javascript:alert(1)');
  await page.keyboard.press('Enter');
  await expect(panel(page).getByRole('alert')).toBeVisible();
});

test('clearing the note returns the node to its standard look', async ({ page }) => {
  await startWithTopic(page);
  await page.keyboard.press('n');
  const note = panel(page).getByRole('textbox', { name: 'Note' });
  await note.pressSequentially('hello');
  const node = page.locator('[data-topic-id]', { hasText: 'Plan' }).first();
  await expect(node).toHaveAttribute('data-node-type', 'note');
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Backspace');
  await expect(node).toHaveAttribute('data-node-type', 'standard');
});

test('a link on the node opens in a new tab without selecting or editing the node', async ({
  page,
}) => {
  await startWithTopic(page);
  await page.keyboard.press('n');
  const note = panel(page).getByRole('textbox', { name: 'Note' });
  await note.pressSequentially('docs');
  await page.keyboard.press('ControlOrMeta+a');
  await panel(page).getByRole('button', { name: 'Link' }).click();
  await panel(page).getByLabel('Link address').fill('https://example.com/docs');
  await page.keyboard.press('Enter');

  const link = page.locator('a.topic-note-link');
  await expect(link).toHaveAttribute('target', '_blank');
  const [popup] = await Promise.all([page.waitForEvent('popup'), link.click()]);
  expect(popup.url()).toContain('example.com/docs');
  await popup.close();
  await expect(page.locator('textarea.title-editor')).toHaveCount(0);
});

test('the note toolbar keeps to a few everyday tools', async ({ page }) => {
  await startWithTopic(page);
  await page.keyboard.press('n');
  const tools = panel(page).getByRole('toolbar', { name: 'Format note' }).getByRole('button');
  await expect(tools).toHaveText(['B', 'I', '•', '☑', 'Link']);
});
