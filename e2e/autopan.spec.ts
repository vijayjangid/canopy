import { expect, test, type Page } from '@playwright/test';

const moved = (a: { x: number; y: number } | null, b: { x: number; y: number } | null) =>
  Math.hypot((a?.x ?? 0) - (b?.x ?? 0), (a?.y ?? 0) - (b?.y ?? 0));

async function ready(page: Page) {
  await page.goto('/?demo=14');
  await page.waitForSelector('.topic');
  await page.waitForTimeout(400);
}

test('clicking a topic that is already in view does not move the map, in Zen or out of it', async ({
  page,
}) => {
  await ready(page);
  await page.getByRole('button', { name: 'Zen' }).click();
  const second = page.locator('.topic[data-depth="1"]').nth(1);
  const before = await second.locator('.topic-box').boundingBox();
  await second.click();
  await page.waitForTimeout(500);
  expect(moved(before, await second.locator('.topic-box').boundingBox())).toBeLessThan(1);

  await page.keyboard.press('Escape');
  const first = page.locator('.topic[data-depth="1"]').first();
  const start = await first.locator('.topic-box').boundingBox();
  await first.click();
  await page.waitForTimeout(500);
  expect(moved(start, await first.locator('.topic-box').boundingBox())).toBeLessThan(1);
});

test('a topic that would end up under the open details panel is moved clear of it', async ({
  page,
}) => {
  await ready(page);
  const rightmost = await page.locator('.topic').evaluateAll((els) => {
    let best = 0;
    els.forEach((el, i) => {
      if (el.getBoundingClientRect().right > (els[best]?.getBoundingClientRect().right ?? 0)) {
        best = i;
      }
    });
    return best;
  });
  const topic = page.locator('.topic').nth(rightmost);
  await topic.click();
  const panel = page.getByRole('complementary', { name: 'Inspector' });
  await expect(panel).toBeVisible();
  await expect
    .poll(async () => {
      const t = await topic.locator('.topic-box').boundingBox();
      const p = await panel.boundingBox();
      return t && p ? t.x + t.width <= p.x : false;
    })
    .toBe(true);
});
