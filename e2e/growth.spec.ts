import { expect, test, type Page } from '@playwright/test';

const topic = (page: Page, name: string) =>
  page.locator('.topic[data-kind="topic"]', { hasText: name }).first();
const handle = (page: Page, kind: 'child' | 'reference' | 'after') =>
  page.locator(`.growth-handle[data-kind="${kind}"]`);

/** Core with Alpha and Beta. */
async function twoChildren(page: Page) {
  await page.goto('/');
  await page.getByRole('tree', { name: 'Mind map' }).focus();
  await page.keyboard.press('Tab');
  await page.keyboard.type('Alpha');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Beta');
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('treeitem')).toHaveCount(3);
}

test('shows handles around a hovered topic and a ghost for the one under the pointer', async ({
  page,
}) => {
  await twoChildren(page);
  await page.mouse.move(0, 0);
  await expect(page.locator('.growth-handle')).toHaveCount(0);

  // Browsing is quiet: hovering a topic that is not selected shows nothing.
  await topic(page, 'Alpha').hover();
  await expect(handle(page, 'child')).toHaveCount(0);

  await topic(page, 'Alpha').click();
  await page.mouse.move(0, 0);
  await topic(page, 'Alpha').hover();
  await expect(handle(page, 'child')).toBeVisible();
  await expect(handle(page, 'reference')).toBeVisible();
  await expect(page.locator('.growth-handle[data-kind="before"]')).toHaveCount(0);
  await expect(handle(page, 'after')).toBeVisible();

  await handle(page, 'after').hover();
  await expect(page.locator('.topic[data-kind="ghost"]')).toHaveCount(1);
  // The preview adds no real topic.
  await expect(page.getByRole('treeitem')).toHaveCount(3);

  await page.mouse.move(5, 5);
  await expect(page.locator('.topic[data-kind="ghost"]')).toHaveCount(0);
});

test('the Core only offers sub-topics', async ({ page }) => {
  await page.goto('/');
  await topic(page, 'Central topic').hover();
  await expect(handle(page, 'child')).toBeVisible();
  await expect(handle(page, 'reference')).toHaveCount(0);
  await expect(handle(page, 'after')).toHaveCount(0);
});

test('clicking a handle turns the ghost into the real topic and opens the editor', async ({
  page,
}) => {
  await twoChildren(page);
  await topic(page, 'Alpha').click();
  await handle(page, 'child').click();

  await expect(page.getByRole('textbox', { name: 'Topic title' })).toBeFocused();
  await expect(page.getByRole('treeitem')).toHaveCount(4);
  await expect(page.locator('.topic[data-kind="ghost"]')).toHaveCount(0);
  await page.keyboard.type('Gamma');
  await page.keyboard.press('Shift+Tab');
  const added = page.getByRole('treeitem', { name: 'Gamma', exact: true });
  await expect(added).toHaveAttribute('aria-level', '3');
});

test('keeps the subject in place when the preview becomes real', async ({ page }) => {
  await twoChildren(page);
  const before = await topic(page, 'Beta').locator('.topic-box').boundingBox();
  await topic(page, 'Beta').click();
  await handle(page, 'after').click();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('treeitem')).toHaveCount(4);
  await page.waitForTimeout(400);
  const after = await topic(page, 'Beta').locator('.topic-box').boundingBox();
  expect(Math.abs((after?.x ?? 0) - (before?.x ?? 0))).toBeLessThan(2);
  expect(Math.abs((after?.y ?? 0) - (before?.y ?? 0))).toBeLessThan(2);
});

test('dragging a handle onto another topic adds a child there', async ({ page }) => {
  await twoChildren(page);
  const beta = await topic(page, 'Beta').boundingBox();
  await topic(page, 'Central topic').click();
  await handle(page, 'child').hover();
  await page.mouse.down();
  await page.mouse.move(
    (beta?.x ?? 0) + (beta?.width ?? 0) + 20,
    (beta?.y ?? 0) + (beta?.height ?? 0) / 2,
    {
      steps: 10,
    },
  );
  await expect(page.locator('.topic[data-kind="ghost"]')).toHaveCount(1);
  await page.mouse.up();

  await expect(page.getByRole('textbox', { name: 'Topic title' })).toBeFocused();
  await page.keyboard.type('Under Beta');
  await page.keyboard.press('Shift+Tab');
  const added = page.getByRole('treeitem', { name: 'Under Beta', exact: true });
  await expect(added).toHaveAttribute('aria-level', '3');
  // Beta is now expanded because it has a child.
  await expect(page.getByRole('treeitem', { name: 'Beta', exact: true })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
});

test('a drag released away from any slot adds nothing', async ({ page }) => {
  await twoChildren(page);
  await topic(page, 'Alpha').click();
  await handle(page, 'child').hover();
  await page.mouse.down();
  await page.mouse.move(40, 400, { steps: 10 });
  await page.mouse.up();
  await expect(page.getByRole('treeitem')).toHaveCount(3);
  await expect(page.getByRole('textbox', { name: 'Topic title' })).toHaveCount(0);
});

test('shows shortcut hints for what is selected', async ({ page }) => {
  await page.goto('/');
  const hints = page.locator('.hint-strip');
  await expect(hints).not.toHaveAttribute('data-visible');
  await page.getByRole('tree', { name: 'Mind map' }).focus();
  await expect(hints).toHaveAttribute('data-visible', 'true');
  await expect(hints).toContainText('Add sub-topic');
  await expect(hints).not.toContainText('Add peer');
  await page.keyboard.press('Tab');
  await expect(hints).toContainText('Next topic');
  await page.keyboard.press('Shift+Tab');
  await expect(hints).toContainText('Add peer below');
});

test('new topics grow out of their parent, and jump into place with reduced motion', async ({
  browser,
}) => {
  const animated = await browser.newPage();
  await animated.goto('/');
  await animated.getByRole('tree', { name: 'Mind map' }).focus();
  await animated.keyboard.press('Tab');
  // A frame later the new topic is still fading in.
  await expect(animated.locator('.topic[opacity]').first()).toBeAttached();
  await expect(animated.locator('.topic[opacity]')).toHaveCount(0);
  await animated.close();

  const still = await browser.newPage({ reducedMotion: 'reduce' });
  const seen: number[] = [];
  await still.goto('/');
  await still.exposeFunction('report', (n: number) => seen.push(n));
  await still.evaluate(() => {
    new MutationObserver(() =>
      (window as unknown as { report: (n: number) => void }).report(
        document.querySelectorAll('.topic[opacity]').length,
      ),
    ).observe(document.body, { subtree: true, childList: true, attributes: true });
  });
  await still.getByRole('tree', { name: 'Mind map' }).focus();
  await still.keyboard.press('Tab');
  await expect(still.getByRole('treeitem')).toHaveCount(2);
  expect(Math.max(0, ...seen)).toBe(0);
  await still.close();
});
