import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const tree = (page: Page) => page.getByRole('tree', { name: 'Mind map' });

async function selectTopic(page: Page) {
  await page.goto('/?demo=14');
  await page.getByRole('treeitem', { name: 'Research', exact: true }).click();
}

test('every setting is one line, with its explanation behind an "i"', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 960 });
  await page.goto('/?demo=14');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const rows = page.locator('.prefs .pref');
  await expect(rows.first()).toBeVisible();

  // A row that fits on one line is about as tall as its control, not two lines of them.
  const heights = await rows.evaluateAll((els) =>
    els.map((el) => el.getBoundingClientRect().height),
  );
  expect(heights.length).toBeGreaterThan(10);
  for (const h of heights) expect(h).toBeLessThan(50);

  // The explanations are not on the page as text. They are behind the "i".
  await expect(page.getByText('Keeps the topic you are working on in view.')).toHaveCount(0);
  await expect(page.locator('.pref-sub, .pref-nudge')).toHaveCount(0);
  const info = page.getByRole('button', { name: /^About Auto-pan:/ });
  await expect(info).toHaveAttribute(
    'aria-label',
    'About Auto-pan: Keeps the topic you are working on in view.',
  );

  // Pointing at it, or tabbing to it, shows the words.
  await info.hover();
  await expect(page.locator('.tooltip[data-visible]')).toHaveText(
    'Keeps the topic you are working on in view.',
  );
  // Tabbing to it works too (the tooltip follows keyboard focus, not a click).
  await page.mouse.move(5, 400);
  await page.keyboard.press('Shift');
  await info.focus();
  await expect(page.locator('.tooltip[data-visible]')).toContainText('Keeps the topic');

  // Scan once the tooltip has gone, since a half-faded one is not a fair colour measurement.
  await page.keyboard.press('Escape');
  await expect(page.locator('.tooltip[data-visible]')).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('the device note sits behind its own "i" instead of a line of text', async ({ page }) => {
  await page.goto('/?demo=14');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByText('Kept in this browser, not saved with the map.')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^About Behaviour settings:/ })).toBeVisible();
  // The section is still named by its heading alone.
  await expect(page.getByRole('region', { name: 'Behaviour', exact: true })).toBeVisible();
});

test('status pills and filter choices have room between them', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 960 });
  await selectTopic(page);
  const pills = page.getByRole('group', { name: 'Status' }).getByRole('button');
  const [a, b] = await Promise.all([pills.nth(0).boundingBox(), pills.nth(1).boundingBox()]);
  if (!a || !b) throw new Error('missing');
  expect(b.x - (a.x + a.width)).toBeGreaterThanOrEqual(7.5);
  expect(a.height).toBeGreaterThanOrEqual(27);

  // A row to the one below it, too.
  const boxes = await pills.evaluateAll((els) => els.map((el) => el.getBoundingClientRect()));
  const second = boxes.find((r) => r.y > (boxes[0]?.y ?? 0) + 5);
  if (second && boxes[0])
    expect(second.y - (boxes[0].y + boxes[0].height)).toBeGreaterThanOrEqual(7.5);
});

test('the details panel reads without a hint paragraph under the stickers', async ({ page }) => {
  // Tall enough that nothing has to scroll, since scrolling hides a tooltip.
  await page.setViewportSize({ width: 1280, height: 1200 });
  await selectTopic(page);
  await expect(page.locator('.stickers-tab .inspector-hint')).toHaveCount(0);
  await expect(page.locator('.sticker-meta')).toContainText('0 of 4 used');
  await page.getByRole('button', { name: /^About stickers:/ }).hover();
  await expect(page.locator('.tooltip[data-visible]')).toContainText(
    'Click a sticker to put it on',
  );

  await page
    .getByRole('list', { name: 'Stickers', exact: true })
    .getByRole('button', { name: 'Star' })
    .click();
  await expect(page.locator('.sticker-meta')).toContainText('1 of 4 used');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('the details panel starts straight with status, due date and tags, with no Properties header', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 860 });
  await selectTopic(page);
  const panel = page.locator('.panel-right');
  const box = await panel.boundingBox();
  if (!box) throw new Error('missing');
  expect(box.width).toBeGreaterThanOrEqual(360);
  expect(box.y + box.height).toBeLessThanOrEqual(860);

  // The fields are there, directly under the tabs, and there is nothing to open or close.
  await expect(panel.getByRole('button', { name: /^Properties/ })).toHaveCount(0);
  await expect(panel.getByRole('heading', { name: 'Properties' })).toHaveCount(0);
  for (const name of ['Status', 'Due date', 'Tags']) {
    await expect(panel.locator('.prop-label', { hasText: new RegExp(`^${name}$`) })).toBeVisible();
  }
  // Still a named region for screen readers, and the first field sits right under the tabs.
  const region = panel.getByRole('region', { name: 'Properties' });
  await expect(region).toBeVisible();
  const [tabs, status] = await Promise.all([
    panel.locator('.inspector-tabs').boundingBox(),
    panel.locator('.prop-label', { hasText: /^Status$/ }).boundingBox(),
  ]);
  if (!tabs || !status) throw new Error('missing');
  expect(status.y - (tabs.y + tabs.height)).toBeLessThan(40);

  // Stickers is a section with a heading, and always open.
  await expect(panel.getByRole('region', { name: 'Stickers' })).toBeVisible();
  await expect(panel.getByRole('button', { name: /^Stickers/ })).toHaveCount(0);
  await expect(panel.getByRole('group', { name: 'Status' })).toBeVisible();
  await tree(page).focus();
});

test('several topics selected show the same fields directly, and no sticker section', async ({
  page,
}) => {
  await page.goto('/?demo=14');
  await page.getByRole('treeitem', { name: 'Research', exact: true }).first().click();
  await page
    .getByRole('treeitem', { name: 'Design', exact: true })
    .first()
    .click({ modifiers: ['Shift'] });
  await expect(page.getByRole('treeitem', { selected: true })).toHaveCount(2);
  const panel = page.locator('.panel-right');
  await expect(panel.getByRole('group', { name: 'Status' })).toBeVisible();
  await expect(panel.getByRole('button', { name: /^Properties/ })).toHaveCount(0);
  await expect(panel.getByRole('region', { name: 'Stickers' })).toHaveCount(0);
});

test('Settings groups keep switches apart from segmented choices, and fit without scrolling', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1080 });
  await page.goto('/?demo=14');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const groups = page.locator('.prefs section');
  await expect(groups).toHaveCount(3);
  for (const group of await groups.all()) {
    const switches = await group.locator('.pref-toggle').count();
    const rows = await group.locator('.pref').count();
    expect(switches === 0 || switches === rows).toBe(true);
  }
  // The theme sits at the top with no title, and a line follows each of the other titles.
  await expect(page.locator('.prefs-rule')).toHaveCount(2);
  const fits = await page.locator('.prefs').evaluate((el) => {
    let node: HTMLElement | null = el.parentElement;
    while (node && node.scrollHeight <= node.clientHeight) node = node.parentElement;
    return node === null || node.classList.contains('app') || node === document.body;
  });
  expect(fits).toBe(true);
});
