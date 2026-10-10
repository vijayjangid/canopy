import { expect, test, type Locator, type Page } from '@playwright/test';

// Everything that is drawn on the map scales with it: lines, borders and icons get bolder as you
// zoom in and finer as you zoom out. Only the invisible hit areas keep one size on screen.

const screenWidth = (el: Locator) =>
  el.evaluate((node) => {
    const m = (node as SVGGraphicsElement).getScreenCTM();
    const w = Number.parseFloat(getComputedStyle(node).strokeWidth);
    return m ? w * Math.hypot(m.a, m.b) : 0;
  });

async function zoom(page: Page, wheels: number) {
  const box = await page.locator('.canvas-svg').boundingBox();
  if (!box) throw new Error('no canvas');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (let i = 0; i < Math.abs(wheels); i++) {
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, wheels > 0 ? -160 : 160);
    await page.keyboard.up('Control');
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(400);
}

async function withReference(page: Page) {
  await page.goto('/?demo=14');
  await page
    .getByRole('treeitem', { name: 'Research', exact: true })
    .first()
    .click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Reference to…' }).click();
  await page.getByRole('combobox', { name: 'Search by topic or path' }).fill('Documentation');
  await page.keyboard.press('Enter');
  await expect(page.locator('.reference-link')).toHaveCount(1);
}

test('lines, borders and reference lines get bolder as you zoom in and finer as you zoom out', async ({
  page,
}) => {
  await withReference(page);
  const sample = async () => ({
    line: await screenWidth(page.locator('.connector').first()),
    reference: await screenWidth(page.locator('.reference-connector').first()),
    border: await screenWidth(page.locator('.topic[data-depth="1"] .topic-box').first()),
  });
  const normal = await sample();
  await zoom(page, 3);
  const closer = await sample();
  for (const key of ['line', 'reference', 'border'] as const) {
    expect(closer[key], key).toBeGreaterThan(normal[key] * 1.3);
  }
  await zoom(page, -6);
  const farther = await sample();
  for (const key of ['line', 'reference', 'border'] as const) {
    expect(farther[key], key).toBeLessThan(closer[key]);
  }
});

test('the delete icon and the selection ring scale too', async ({ page }) => {
  await withReference(page);
  const line = page.locator('.reference-link').first();
  const spot = await line.locator('.reference-hit').evaluate((node) => {
    const path = node as SVGPathElement;
    const m = path.getScreenCTM();
    const p = path.getPointAtLength(path.getTotalLength() / 2);
    return m ? new DOMPoint(p.x, p.y).matrixTransform(m) : null;
  });
  if (!spot) throw new Error('no point on the line');
  await page.mouse.click(spot.x, spot.y);
  const ring = page.locator('.reference-delete circle');
  await expect(ring).toHaveCount(1);
  const before = await screenWidth(ring);
  await zoom(page, 3);
  // The picked line is still picked after the zoom.
  await expect(page.locator('.reference-delete circle')).toHaveCount(1);
  expect(await screenWidth(page.locator('.reference-delete circle'))).toBeGreaterThan(before * 1.3);
});

test('hit areas keep one size on screen, so lines stay easy to click', async ({ page }) => {
  await withReference(page);
  const effect = (el: Locator) => el.evaluate((n) => getComputedStyle(n).vectorEffect);
  // Fixed width on screen: the one thing that is not drawn, so it does not scale.
  expect(await effect(page.locator('.reference-hit').first())).toBe('non-scaling-stroke');
  expect(await effect(page.locator('.connector-hit').first())).toBe('non-scaling-stroke');
  // Everything that is drawn scales.
  for (const drawn of ['.connector', '.reference-connector', '.topic-box']) {
    expect(await effect(page.locator(drawn).first()), drawn).not.toBe('non-scaling-stroke');
  }
});
