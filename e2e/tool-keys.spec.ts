import { expect, test, type Page } from '@playwright/test';

const MOD = process.platform === 'darwin' ? 'Meta' : 'Control';
const tree = (page: Page) => page.getByRole('tree', { name: 'Mind map' });
const group = (page: Page) => page.getByRole('group', { name: 'Pointer tool' });
const pressed = (page: Page, name: string) =>
  expect(group(page).getByRole('button', { name, exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

/** A pointer event that carries modifiers the page never saw a key event for. */
async function pointer(
  page: Page,
  type: 'pointermove' | 'pointerdown' | 'pointerup',
  meta: boolean,
) {
  await page.evaluate(
    ({ type, meta, mac }) => {
      const svg = document.querySelector('svg.canvas-svg');
      if (!svg) throw new Error('no canvas');
      const r = svg.getBoundingClientRect();
      svg.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerId: 7,
          button: 0,
          buttons: type === 'pointerup' ? 0 : 1,
          clientX: r.x + r.width - 40,
          clientY: r.y + 120,
          metaKey: mac && meta,
          ctrlKey: !mac && meta,
        }),
      );
    },
    { type, meta, mac: process.platform === 'darwin' },
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto('/?demo=14');
  await tree(page).focus();
});

test('holding Cmd zooms and letting go returns to the chosen tool, from anywhere', async ({
  page,
}) => {
  await page.keyboard.down(MOD);
  await expect(tree(page)).toHaveAttribute('data-tool', 'zoom');
  await page.keyboard.up(MOD);
  await expect(tree(page)).toHaveAttribute('data-tool', 'select');

  // Also with a toolbar button focused, and with nothing focused at all.
  await group(page).getByRole('button', { name: 'Pan', exact: true }).focus();
  await page.keyboard.down(MOD);
  await expect(tree(page)).toHaveAttribute('data-tool', 'zoom');
  await page.keyboard.up(MOD);
  await expect(tree(page)).toHaveAttribute('data-tool', 'select');
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.down(MOD);
  await expect(tree(page)).toHaveAttribute('data-tool', 'zoom');
  await page.keyboard.up(MOD);
});

test('a modifier the page saw no key press for is taken from the pointer', async ({ page }) => {
  // Cmd was already down when the window got focus, so there was never a key-down to hear.
  await pointer(page, 'pointermove', true);
  await expect(tree(page)).toHaveAttribute('data-tool', 'zoom');
  // And one let go while the window was away is dropped by the next pointer event.
  await pointer(page, 'pointermove', false);
  await expect(tree(page)).toHaveAttribute('data-tool', 'select');

  // A press with Cmd down zooms even when no pointer move came first.
  await pointer(page, 'pointerdown', true);
  await expect(tree(page)).toHaveAttribute('data-tool', 'zoom');
  await pointer(page, 'pointerup', true);
  await pointer(page, 'pointermove', false);
  await expect(tree(page)).toHaveAttribute('data-tool', 'select');
});

test('switching windows while Cmd is held does not leave the zoom tool stuck', async ({ page }) => {
  await page.keyboard.down(MOD);
  await expect(tree(page)).toHaveAttribute('data-tool', 'zoom');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(tree(page)).toHaveAttribute('data-tool', 'select');
  await page.keyboard.up(MOD);
  await page.keyboard.down(MOD);
  await expect(tree(page)).toHaveAttribute('data-tool', 'zoom');
  await page.keyboard.up(MOD);
});

test('a field that handles keys itself does not hide Cmd from the tools', async ({ page }) => {
  await page.getByRole('treeitem', { name: 'Research', exact: true }).first().click();
  await tree(page).focus();
  await page.keyboard.press('l');
  const label = page.getByRole('textbox', { name: 'Line label' });
  await expect(label).toBeFocused();
  await page.keyboard.down(MOD);
  await expect(tree(page)).toHaveAttribute('data-tool', 'zoom');
  await page.keyboard.up(MOD);
  await expect(tree(page)).toHaveAttribute('data-tool', 'select');
  await page.keyboard.press('Escape');
});

test('a Space released while Cmd was down does not leave Pan stuck on', async ({ page }) => {
  test.skip(process.platform !== 'darwin', 'Only the Mac drops key-ups while Cmd is down');
  await page.keyboard.down(' ');
  await expect(tree(page)).toHaveAttribute('data-tool', 'pan');
  await page.keyboard.down('Meta');
  // Pan wins while Space is held. The Mac never sends Space's key-up now.
  await page.keyboard.up('Meta');
  await expect(tree(page)).toHaveAttribute('data-tool', 'select');
  await page.keyboard.down('Meta');
  await expect(tree(page)).toHaveAttribute('data-tool', 'zoom');
  await page.keyboard.up('Meta');
  await page.keyboard.up(' ');
  await expect(tree(page)).toHaveAttribute('data-tool', 'select');
});

test('keys work straight after clicking a toolbar tool', async ({ page }) => {
  await group(page).getByRole('button', { name: 'Pan', exact: true }).click();
  await pressed(page, 'Pan');
  await expect(tree(page)).toBeFocused();
  await page.keyboard.press('v');
  await pressed(page, 'Select');
  await page.keyboard.press('Shift+Z');
  await pressed(page, 'Zoom');
  await page.keyboard.press('v');
  await page.keyboard.down(' ');
  await pressed(page, 'Pan');
  await page.keyboard.up(' ');
  await pressed(page, 'Select');
});

test('pan, zoom and select tools still work after one another', async ({ page }) => {
  const before = await page
    .getByRole('treeitem', { name: 'Research', exact: true })
    .first()
    .boundingBox();
  await page.keyboard.down(MOD);
  await page.mouse.move(640, 360);
  await page.mouse.click(640, 360);
  await page.keyboard.up(MOD);
  const zoomed = await page
    .getByRole('treeitem', { name: 'Research', exact: true })
    .first()
    .boundingBox();
  expect(zoomed?.width ?? 0).toBeGreaterThan((before?.width ?? 0) * 1.3);

  await page.keyboard.down(' ');
  await page.mouse.move(600, 300);
  await page.mouse.down();
  await page.mouse.move(700, 380, { steps: 6 });
  await page.mouse.up();
  await page.keyboard.up(' ');
  await expect(tree(page)).toHaveAttribute('data-tool', 'select');
  await page.getByRole('treeitem', { name: 'Research', exact: true }).first().click();
  await expect(page.getByRole('treeitem', { selected: true })).toHaveCount(1);
});
