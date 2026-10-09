import { expect, test, type Page } from '@playwright/test';

const tree = (page: Page) => page.getByRole('tree', { name: 'Mind map' });

async function twoTopics(page: Page) {
  await page.goto('/');
  await tree(page).focus();
  await page.keyboard.press('Tab');
  await page.keyboard.type('Alpha');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Beta with a longer name');
  await page.keyboard.press('Shift+Tab');
  await page.waitForTimeout(400);
  await page.getByRole('treeitem', { name: 'Beta with a longer name', exact: true }).click();
}

/** Where the selected topic's box is, in screen pixels. */
const boxOf = (page: Page) =>
  page.evaluate(() => {
    const r = document.querySelector('.topic[data-focused] .topic-box')?.getBoundingClientRect();
    return r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null;
  });

async function hoverSelected(page: Page) {
  const b = await boxOf(page);
  if (!b) throw new Error('no selected topic');
  await page.mouse.move(0, 0);
  await page.mouse.move(b.x + b.w / 2, b.y + b.h / 2, { steps: 3 });
  await page.waitForTimeout(400);
}

/** How far each handle's centre is from where it belongs on the topic, in pixels. */
const misalignment = (page: Page) =>
  page.evaluate(() => {
    const b = document.querySelector('.topic[data-focused] .topic-box')?.getBoundingClientRect();
    if (!b) return null;
    const centre = (kind: string) => {
      const h = document
        .querySelector(`.growth-handle[data-kind="${kind}"]`)
        ?.getBoundingClientRect();
      return h ? { x: h.x + h.width / 2, y: h.y + h.height / 2, d: h.width } : null;
    };
    const top = centre('reference');
    const bottom = centre('after');
    const right = centre('child');
    if (!top || !bottom || !right) return null;
    const mx = b.x + b.width / 2;
    const my = b.y + b.height / 2;
    return {
      // Both handles are centred on the topic, and sit the same distance outside it.
      topX: Math.abs(top.x - mx),
      bottomX: Math.abs(bottom.x - mx),
      rightY: Math.abs(right.y - my),
      gapDiff: Math.abs(b.y - top.y - (bottom.y - (b.y + b.height))),
    };
  });

test('handles are centred on the topic at every zoom level', async ({ page }) => {
  await twoTopics(page);
  for (const [key, times] of [
    ['Meta+=', 3],
    ['Meta+-', 6],
    ['Meta+-', 3],
    ['Meta+=', 10],
  ] as const) {
    for (let i = 0; i < times; i++) {
      await page.keyboard.press(key);
      await page.waitForTimeout(50);
    }
    await page.waitForTimeout(450);
    // Zoomed out to icons the handles step aside, so only look where they are drawn.
    const b = await boxOf(page);
    if (!b) continue;
    await hoverSelected(page);
    // Wait for the zoom and the handles' fade-in to settle, then every handle must be centred.
    await expect
      .poll(
        async () => {
          const m = await misalignment(page);
          return m ? Math.max(m.topX, m.bottomX, m.rightY, m.gapDiff) : 0;
        },
        { timeout: 5000 },
      )
      .toBeLessThan(1);
  }
});

test('handles stay with their topic while it glides to a new place', async ({ page }) => {
  await page.goto('/');
  await tree(page).focus();
  await page.keyboard.press('Tab');
  await page.keyboard.type('Alpha');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Beta');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Gamma');
  await page.keyboard.press('Shift+Tab');
  await page.waitForTimeout(500);
  await page.getByRole('treeitem', { name: 'Gamma', exact: true }).click();
  await hoverSelected(page);
  await tree(page).focus();

  await page.evaluate(() => {
    const w = window as unknown as { __gaps: number[]; __moved: boolean };
    w.__gaps = [];
    w.__moved = false;
    let last: number | null = null;
    let frames = 0;
    const tick = () => {
      const b = document.querySelector('.topic[data-focused] .topic-box')?.getBoundingClientRect();
      const h = document
        .querySelector('.growth-handle[data-kind="after"]')
        ?.getBoundingClientRect();
      if (b && h) {
        w.__gaps.push(h.y + h.height / 2 - (b.y + b.height));
        if (last !== null && Math.abs(b.y - last) > 0.5) w.__moved = true;
        last = b.y;
      }
      if (++frames < 45) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  // Moving the topic up two places makes it glide while the handles are on screen.
  await page.keyboard.press('Alt+ArrowUp');
  await page.keyboard.press('Alt+ArrowUp');
  await page.waitForTimeout(1000);
  const { gaps, moved } = await page.evaluate(() => {
    const w = window as unknown as { __gaps: number[]; __moved: boolean };
    return { gaps: w.__gaps, moved: w.__moved };
  });
  expect(moved).toBe(true);
  expect(gaps.length).toBeGreaterThan(10);
  // The handle keeps its distance from the topic on every frame of the move.
  const first = gaps[0] ?? 0;
  for (const gap of gaps) expect(Math.abs(gap - first)).toBeLessThan(1);
});

test('the Exit Zen button sits in the bottom left, where the toolbar was', async ({ page }) => {
  await page.goto('/?demo=14');
  const before = await page.locator('.zoom-controls').boundingBox();
  const mainBefore = await page.locator('.app-main').boundingBox();
  await tree(page).focus();
  await page.keyboard.press('z');
  const exit = page.getByRole('button', { name: /Exit Zen/ });
  await expect(exit).toBeVisible();
  const box = await exit.boundingBox();
  const main = await page.locator('.app-main').boundingBox();
  if (!box || !main || !before) throw new Error('missing boxes');
  expect(box.x).toBeLessThan(main.x + 40);
  expect(box.y + box.height).toBeGreaterThan(main.y + main.height - 40);
  // It takes the toolbar's corner: the same left edge, and the same distance from the bottom.
  expect(Math.abs(box.x - before.x)).toBeLessThan(2);
  if (!mainBefore) throw new Error('missing main');
  const gapBefore = mainBefore.y + mainBefore.height - (before.y + before.height);
  const gapNow = main.y + main.height - (box.y + box.height);
  expect(Math.abs(gapNow - gapBefore)).toBeLessThan(2);
  await exit.click();
  await expect(page.locator('.app-bar')).toBeVisible();
});

test('the handles step aside once the map is zoomed out to icons', async ({ page }) => {
  await twoTopics(page);
  await hoverSelected(page);
  await expect(page.locator('.growth-handle').first()).toBeVisible();
  for (let i = 0; i < 9; i++) {
    await page.keyboard.press('Meta+-');
    await page.waitForTimeout(40);
  }
  await page.waitForTimeout(400);
  await hoverSelected(page);
  await expect(page.locator('.topic-glyph').first()).toBeAttached();
  await expect(page.locator('.growth-handle')).toHaveCount(0);
});
