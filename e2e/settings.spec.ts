import { expect, test, type Page } from '@playwright/test';
import { openMapPanel } from './panels';

const tree = (page: Page) => page.getByRole('tree', { name: 'Mind map' });

/** Sets a switch in the Settings tab to on or off. */
async function setSwitch(page: Page, name: string, on: boolean) {
  const panel = await openMapPanel(page, 'Settings');
  const toggle = panel.getByRole('switch', { name });
  if ((await toggle.getAttribute('aria-checked')) !== String(on)) await toggle.click();
  await page.keyboard.press('Escape');
}

test('an untouched new topic is removed when that setting is on, and kept when it is off', async ({
  page,
}) => {
  await page.goto('/');
  await setSwitch(page, 'Remove empty new topics', true);
  await tree(page).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('treeitem')).toHaveCount(2);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('treeitem')).toHaveCount(1);

  // A topic with a title stays.
  await page.keyboard.press('Tab');
  await page.keyboard.type('Keep me');
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('treeitem')).toHaveCount(2);

  // Switched off, the empty topic stays.
  await setSwitch(page, 'Remove empty new topics', false);
  await tree(page).focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('treeitem')).toHaveCount(3);
});

test('clicking away from a new empty topic removes it and keeps the click', async ({ page }) => {
  await page.goto('/');
  await setSwitch(page, 'Remove empty new topics', true);
  await tree(page).focus();
  await page.keyboard.press('Tab');
  await page.keyboard.type('First');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('treeitem')).toHaveCount(3);
  await page.getByRole('treeitem', { name: 'First', exact: true }).click();
  await expect(page.getByRole('treeitem')).toHaveCount(2);
  await expect(page.getByRole('treeitem', { name: 'First', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});

test('a run of untouched topics made with Enter and Tab is removed together', async ({ page }) => {
  await page.goto('/');
  await setSwitch(page, 'Remove empty new topics', true);
  await tree(page).focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('treeitem')).toHaveCount(5);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('treeitem')).toHaveCount(1);
});

test('a blank topic passed over on the way to a real one stays only if something is inside', async ({
  page,
}) => {
  await page.goto('/');
  await setSwitch(page, 'Remove empty new topics', true);
  await tree(page).focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.type('Inner');
  await page.keyboard.press('Shift+Tab');
  // The blank parent holds a real child, so both remain.
  await expect(page.getByRole('treeitem')).toHaveCount(3);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('treeitem')).toHaveCount(3);
});

test('clearing the title of an existing topic does not remove it', async ({ page }) => {
  await page.goto('/');
  await setSwitch(page, 'Remove empty new topics', true);
  await tree(page).focus();
  await page.keyboard.press('Tab');
  await page.keyboard.type('Keep');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('F2');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('treeitem')).toHaveCount(2);
});

async function chain(page: Page, depth: number) {
  await tree(page).focus();
  for (let i = 0; i < depth; i++) {
    await page.keyboard.press('Tab');
    await page.keyboard.type(`Level ${i + 1}`);
  }
  await page.keyboard.press('Shift+Tab');
  return page.getByRole('treeitem', { name: `Level ${depth}`, exact: true });
}

test('auto-pan keeps the newest topic in view, and can be switched off', async ({ page }) => {
  await page.goto('/');
  const last = await chain(page, 12);
  const width = page.viewportSize()?.width ?? 1280;
  await expect
    .poll(async () => {
      const box = await last.locator('.topic-box').boundingBox();
      return box ? box.x + box.width <= width : false;
    })
    .toBe(true);

  await page.goto('/');
  await setSwitch(page, 'Auto-pan', false);
  const far = await chain(page, 12);
  const box = await far.locator('.topic-box').boundingBox();
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeGreaterThan(width);
});
