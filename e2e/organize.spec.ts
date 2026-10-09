import { expect, test, type Page } from '@playwright/test';

const tree = (page: Page) => page.getByRole('tree', { name: 'Mind map' });
const item = (page: Page, name: string) => page.getByRole('treeitem', { name, exact: true });
const box = (page: Page, name: string) =>
  page.locator('.topic[data-kind="topic"]', { hasText: name }).first().locator('.topic-box');

/** Core with Alpha (A1, A2) and Beta. */
async function sampleMap(page: Page) {
  await page.goto('/');
  await tree(page).focus();
  await page.keyboard.press('Tab');
  await page.keyboard.type('Alpha');
  await page.keyboard.press('Tab');
  await page.keyboard.type('A1');
  await page.keyboard.press('Enter');
  await page.keyboard.type('A2');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Beta');
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('treeitem')).toHaveCount(5);
}

/** Cut, copy and paste as the browser would deliver them. Automated key presses do not trigger these. */
async function clipboard(page: Page, action: 'copy' | 'cut') {
  await page.evaluate((type) => {
    const data = new DataTransfer();
    document
      .querySelector('[role="tree"]')
      ?.dispatchEvent(
        new ClipboardEvent(type, { clipboardData: data, bubbles: true, cancelable: true }),
      );
    const stash: Record<string, string> = {};
    for (const t of data.types) stash[t] = data.getData(t);
    (window as unknown as { __clip: Record<string, string> }).__clip = stash;
  }, action);
}

async function pasteClipboard(page: Page, asPeer = false) {
  await page.evaluate((peer) => {
    const stash = (window as unknown as { __clip?: Record<string, string> }).__clip ?? {};
    const data = new DataTransfer();
    for (const [type, value] of Object.entries(stash)) data.setData(type, value);
    if (peer) {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'v', ctrlKey: true, shiftKey: true, bubbles: true }),
      );
    }
    document
      .querySelector('[role="tree"]')
      ?.dispatchEvent(
        new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
      );
  }, asPeer);
}

async function clipboardText(page: Page) {
  return page.evaluate(
    () => (window as unknown as { __clip?: Record<string, string> }).__clip?.['text/plain'] ?? '',
  );
}

async function dragBetween(page: Page, from: string, to: string, where = 0.5) {
  const a = await box(page, from).boundingBox();
  const b = await box(page, to).boundingBox();
  await page.mouse.move((a?.x ?? 0) + (a?.width ?? 0) / 2, (a?.y ?? 0) + (a?.height ?? 0) / 2);
  await page.mouse.down();
  await page.mouse.move((b?.x ?? 0) + (b?.width ?? 0) / 2, (b?.y ?? 0) + (b?.height ?? 0) * where, {
    steps: 10,
  });
}

test.describe('folding', () => {
  test('a folded topic shows a count, a peek, and unfolds on click', async ({ page }) => {
    await sampleMap(page);
    await item(page, 'Alpha').click();
    await page.keyboard.press(']');
    await expect(page.getByRole('treeitem')).toHaveCount(3);

    const badge = page.locator('.fold-badge');
    await expect(badge).toHaveCount(1);
    await expect(badge).toContainText('2');

    await badge.hover();
    await expect(page.locator('.fold-peek')).toContainText('A1');
    await expect(page.locator('.fold-peek')).toContainText('A2');
    await expect(page.locator('.fold-peek')).toContainText('Click to unfold');

    await badge.click();
    await expect(page.getByRole('treeitem')).toHaveCount(5);
    await expect(page.locator('.fold-badge')).toHaveCount(0);
    await expect(page.locator('.fold-peek')).toHaveCount(0);
  });

  test('folding is remembered after a reload', async ({ page }) => {
    await sampleMap(page);
    await item(page, 'Alpha').click();
    await page.keyboard.press(']');
    await page.waitForTimeout(900);
    await page.reload();
    await expect(page.getByRole('treeitem')).toHaveCount(3);
    await expect(page.locator('.fold-badge')).toContainText('2');
  });
});

test.describe('copy and paste', () => {
  test('copies a branch and pastes it inside another topic', async ({ page }) => {
    await sampleMap(page);
    await item(page, 'Alpha').click();
    await clipboard(page, 'copy');
    await item(page, 'Beta').click();
    await pasteClipboard(page);
    await expect(page.getByRole('treeitem')).toHaveCount(8);
    await expect(page.getByRole('treeitem', { name: 'Alpha', exact: true })).toHaveCount(2);
    await expect(page.getByRole('treeitem', { name: 'A1', exact: true })).toHaveCount(2);
    // The pasted copy is a child of Beta.
    await expect(page.getByRole('treeitem', { name: 'Alpha', exact: true }).last()).toHaveAttribute(
      'aria-level',
      '3',
    );
  });

  test('pastes as a peer with Shift', async ({ page }) => {
    await sampleMap(page);
    await item(page, 'Beta').click();
    await clipboard(page, 'copy');
    await pasteClipboard(page, true);
    await expect(page.getByRole('treeitem', { name: 'Beta', exact: true })).toHaveCount(2);
    await expect(page.getByRole('treeitem', { name: 'Beta', exact: true }).last()).toHaveAttribute(
      'aria-level',
      '2',
    );
  });

  test('cut removes the branch and paste puts it back', async ({ page }) => {
    await sampleMap(page);
    await item(page, 'Alpha').click();
    await clipboard(page, 'cut');
    await expect(page.getByRole('treeitem')).toHaveCount(2);
    await pasteClipboard(page);
    await expect(page.getByRole('treeitem')).toHaveCount(5);
  });

  test('turns pasted outline text into topics', async ({ page }) => {
    await page.goto('/');
    await tree(page).focus();
    await page.evaluate(() => {
      const data = new DataTransfer();
      data.setData('text/plain', '- Fruit\n  - Apple\n  - Pear\n- Vegetables');
      document
        .querySelector('[role="tree"]')
        ?.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true }));
    });
    await expect(page.getByRole('treeitem')).toHaveCount(5);
    await expect(item(page, 'Pear')).toHaveAttribute('aria-level', '3');
    await expect(item(page, 'Vegetables')).toHaveAttribute('aria-level', '2');
  });

  test('puts Markdown and Canopy data on the clipboard', async ({ page }) => {
    await sampleMap(page);
    await item(page, 'Alpha').click();
    await clipboard(page, 'copy');
    expect(await clipboardText(page)).toBe('- Alpha\n  - A1\n  - A2');
    const types = await page.evaluate(() =>
      Object.keys((window as unknown as { __clip: Record<string, string> }).__clip),
    );
    expect(types).toContain('application/x-canopy-branches+json');
  });
});

test.describe('moving topics', () => {
  test('dragging a topic onto another makes it a child', async ({ page }) => {
    await sampleMap(page);
    await dragBetween(page, 'Beta', 'Alpha');
    await expect(page.locator('.drop-target')).toHaveCount(1);
    await expect(page.locator('.drag-chip')).toHaveText('Beta');
    await page.mouse.up();
    await expect(item(page, 'Beta')).toHaveAttribute('aria-level', '3');
    await expect(page.locator('.drop-target')).toHaveCount(0);
    await expect(page.locator('.drag-chip')).toHaveCount(0);
  });

  test('dragging to the edge of a topic places it next to it', async ({ page }) => {
    await sampleMap(page);
    await dragBetween(page, 'Beta', 'Alpha', 0.05);
    await expect(page.locator('.drop-line')).toHaveCount(1);
    await page.mouse.up();
    await expect(item(page, 'Beta')).toHaveAttribute('aria-level', '2');
    await expect(item(page, 'Beta')).toHaveAttribute('aria-posinset', '1');
    await expect(item(page, 'Alpha')).toHaveAttribute('aria-posinset', '2');
  });

  test('never drops a topic into its own branch', async ({ page }) => {
    await sampleMap(page);
    await dragBetween(page, 'Alpha', 'A1');
    await expect(page.locator('.drop-target')).toHaveCount(0);
    await page.mouse.up();
    await expect(item(page, 'Alpha')).toHaveAttribute('aria-level', '2');
  });

  test('Escape cancels a drag', async ({ page }) => {
    await sampleMap(page);
    await dragBetween(page, 'Beta', 'Alpha');
    await page.keyboard.press('Escape');
    await expect(page.locator('.drag-chip')).toHaveCount(0);
    await page.mouse.up();
    await expect(item(page, 'Beta')).toHaveAttribute('aria-level', '2');
  });

  test('moves a whole selection together', async ({ page }) => {
    await sampleMap(page);
    await item(page, 'A1').click();
    await page.keyboard.press('Shift+ArrowDown');
    await expect(page.locator('.topic[data-selected]')).toHaveCount(2);
    // Dragging one selected topic carries the other along.
    await dragBetween(page, 'A1', 'Beta');
    await expect(page.locator('.drag-chip')).toHaveText('A1 and 1 more');
    await page.mouse.up();
    await expect(item(page, 'A1')).toHaveAttribute('aria-level', '3');
    await expect(item(page, 'A2')).toHaveAttribute('aria-level', '3');
    await expect(item(page, 'A1')).toHaveAttribute('aria-posinset', '1');
    await expect(item(page, 'A2')).toHaveAttribute('aria-posinset', '2');
    await expect(item(page, 'Alpha')).not.toHaveAttribute('aria-expanded');
  });
});

test.describe('deleting', () => {
  test('offers Undo in a notification', async ({ page }) => {
    await sampleMap(page);
    await item(page, 'Beta').click();
    await page.keyboard.press('Delete');
    await expect(page.getByRole('treeitem')).toHaveCount(4);
    const toast = page.getByRole('group', { name: 'Notification' });
    await expect(toast).toContainText('Deleted 1 branch');
    await toast.getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByRole('treeitem')).toHaveCount(5);
    await expect(toast).toHaveCount(0);
  });

  test('hides the notification once the map changes again', async ({ page }) => {
    await sampleMap(page);
    await item(page, 'Beta').click();
    await page.keyboard.press('Delete');
    await expect(page.getByRole('group', { name: 'Notification' })).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('group', { name: 'Notification' })).toHaveCount(0);
  });
});
