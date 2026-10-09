import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const MOD = process.platform === 'darwin' ? 'Meta' : 'Control';
const tree = (page: Page) => page.getByRole('tree', { name: 'Mind map' });
const selected = (page: Page) => page.getByRole('treeitem', { selected: true });
const widthOf = async (page: Page, name: string) =>
  (await page.getByRole('treeitem', { name, exact: true }).locator('.topic-box').boundingBox())
    ?.width ?? 0;

test('clicking empty canvas lets go of the selection, so Space no longer edits', async ({
  page,
}) => {
  await page.goto('/?demo=14');
  await page.getByRole('treeitem', { name: 'Design', exact: true }).first().click();
  await expect(selected(page)).toHaveCount(1);

  // A tap on Space edits the picked topic.
  await page.keyboard.press(' ');
  await expect(page.getByRole('textbox', { name: 'Topic title' })).toBeFocused();
  await page.keyboard.press('Escape');

  await page.mouse.click(700, 520);
  await expect(selected(page)).toHaveCount(0);
  await tree(page).focus();
  await page.keyboard.press(' ');
  await expect(page.getByRole('textbox', { name: 'Topic title' })).toHaveCount(0);

  // An arrow key picks a topic again, and the keys work once more.
  await page.keyboard.press('ArrowRight');
  await expect(selected(page)).toHaveCount(1);
});

test('dragging a box picks what it touches, and Shift adds to the selection', async ({ page }) => {
  await page.goto('/?demo=14');
  const card = (name: string) =>
    page.getByRole('treeitem', { name, exact: true }).first().locator('.topic-box').boundingBox();
  const a = await card('Design');
  const b = await card('Documentation');
  if (!a || !b) throw new Error('missing topics');

  await page.mouse.move(a.x - 8, a.y - 8);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width + 8, a.y + a.height + 8, { steps: 6 });
  await page.mouse.up();
  await expect(selected(page)).toHaveCount(1);

  await page.keyboard.down('Shift');
  await page.mouse.move(b.x - 6, b.y - 4);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width + 6, b.y + b.height + 4, { steps: 6 });
  await page.mouse.up();
  await page.keyboard.up('Shift');
  await expect(selected(page)).toHaveCount(2);

  // Shift-click toggles one topic.
  await page.keyboard.down('Shift');
  await page.getByRole('treeitem', { name: 'Documentation' }).click();
  await page.keyboard.up('Shift');
  await expect(selected(page)).toHaveCount(1);
});

test('the toolbar and keys switch between select, pan and zoom', async ({ page }) => {
  await page.goto('/?demo=14');
  const group = page.getByRole('group', { name: 'Pointer tool' });
  const pressed = (name: string) =>
    expect(group.getByRole('button', { name, exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

  await pressed('Select');
  await tree(page).focus();
  await page.keyboard.press('h');
  await pressed('Pan');
  await expect(tree(page)).toHaveAttribute('data-tool', 'pan');
  await page.keyboard.press('Shift+Z');
  await pressed('Zoom');
  await page.keyboard.press('v');
  await pressed('Select');

  // Holding Space borrows the Pan tool until it is let go.
  await page.keyboard.down(' ');
  await pressed('Pan');
  await page.keyboard.up(' ');
  await pressed('Select');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('the zoom tool zooms to a topic or an area, in and out', async ({ page }) => {
  await page.goto('/?demo=14');
  const topic = page.getByRole('treeitem', { name: 'Documentation' });
  // The map fits itself to the window first, so wait until its size stops changing.
  await expect
    .poll(async () => Math.round(await widthOf(page, 'Documentation')))
    .toBeGreaterThan(0);
  await page.waitForTimeout(500);
  const before = await widthOf(page, 'Documentation');

  // Holding Cmd (Ctrl) is the zoom tool: clicking a topic zooms to it.
  await page.keyboard.down(MOD);
  await topic.click();
  await page.keyboard.up(MOD);
  const zoomed = await widthOf(page, 'Documentation');
  expect(zoomed).toBeGreaterThan(before * 1.5);
  await expect(selected(page)).toHaveCount(1);

  // Alt as well zooms out.
  await page.keyboard.down(MOD);
  await page.keyboard.down('Alt');
  await page.mouse.click(700, 400);
  await page.keyboard.up('Alt');
  await page.keyboard.up(MOD);
  expect(await widthOf(page, 'Documentation')).toBeLessThan(zoomed);

  // Dragging an area fills the view with it.
  await page.getByRole('button', { name: 'Unfold everything' }).click();
  await page.waitForTimeout(400);
  const fitted = await widthOf(page, 'Documentation');
  const box = await page.getByRole('treeitem', { name: 'Documentation' }).boundingBox();
  if (!box) throw new Error('missing topic');
  await page.keyboard.down(MOD);
  await page.mouse.move(box.x - 20, box.y - 20);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width + 20, box.y + box.height + 20, { steps: 6 });
  await page.mouse.up();
  await page.keyboard.up(MOD);
  expect(await widthOf(page, 'Documentation')).toBeGreaterThan(fitted * 1.5);
});

test('the cursor follows the tool: arrow to select, hand to pan, magnifier to zoom', async ({
  page,
}) => {
  await page.goto('/?demo=14');
  const cursor = () => tree(page).evaluate((el) => getComputedStyle(el).cursor);
  expect(await cursor()).toBe('default');

  await tree(page).focus();
  await page.keyboard.press('h');
  expect(await cursor()).toBe('grab');
  await page.keyboard.press('Shift+Z');
  expect(await cursor()).toBe('zoom-in');
  await page.keyboard.press('v');
  expect(await cursor()).toBe('default');

  // A held Cmd (Ctrl) borrows the zoom cursor, and Alt turns it into zoom out.
  await page.keyboard.down(MOD);
  expect(await cursor()).toBe('zoom-in');
  await page.keyboard.down('Alt');
  expect(await cursor()).toBe('zoom-out');
  await page.keyboard.up('Alt');
  await page.keyboard.up(MOD);
  expect(await cursor()).toBe('default');
});
