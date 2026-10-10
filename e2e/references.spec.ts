import { expect, test } from '@playwright/test';

import type { Locator, Page } from '@playwright/test';

/** A screen point on a reference line that is not covered by a topic. */
async function spotOn(line: Locator) {
  const point = await line.locator('.reference-hit').evaluate((node) => {
    const path = node as SVGPathElement;
    const matrix = path.getScreenCTM();
    if (!matrix) return null;
    const length = path.getTotalLength();
    for (let step = 3; step < 18; step++) {
      const local = path.getPointAtLength((length * step) / 20);
      const screen = new DOMPoint(local.x, local.y).matrixTransform(matrix);
      if (document.elementFromPoint(screen.x, screen.y) === path) {
        return { x: screen.x, y: screen.y };
      }
    }
    return null;
  });
  if (!point) throw new Error('Reference line has no clickable segment between topics');
  return point;
}

/** Makes Research reference the Core, and returns its reference line. */
async function referenceResearch(page: Page) {
  await page.goto('/?demo=14');
  const source = page.getByRole('treeitem', { name: 'Research', exact: true }).first();
  const sourceId = await source.getAttribute('data-topic-id');
  if (!sourceId) throw new Error('Research topic is missing its ID');

  await source.click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Reference to…' }).click();
  const search = page.getByRole('combobox', { name: 'Search by topic or path' });
  await search.fill('Product launch');
  await page.getByRole('option', { name: 'Product launch Core', exact: true }).click();

  const reference = page.locator(`.reference-link[data-reference-from="${sourceId}"]`);
  await expect(reference).toHaveCount(1);
  await expect(reference.locator('.reference-connector')).toHaveAttribute(
    'marker-end',
    'url(#reference-arrow)',
  );
  return reference;
}

test('clicking a reference line shows a delete icon that removes it', async ({ page }) => {
  const reference = await referenceResearch(page);
  await expect(page.locator('.reference-delete')).toHaveCount(0);

  const point = await spotOn(reference);
  await page.mouse.click(point.x, point.y);
  await expect(reference).toHaveAttribute('data-selected', 'true');
  const icon = page.locator('.reference-delete');
  await expect(icon).toHaveCount(1);

  await icon.click();
  await expect(reference).toHaveCount(0);
  await expect(icon).toHaveCount(0);

  await page.getByRole('tree', { name: 'Mind map' }).focus();
  await page.keyboard.press('ControlOrMeta+z');
  await expect(page.locator('.reference-link')).toHaveCount(1);
});

test('the delete icon is red, and fills red when pointed at', async ({ page }) => {
  const reference = await referenceResearch(page);
  await page.mouse.click(...(Object.values(await spotOn(reference)) as [number, number]));
  const icon = page.locator('.reference-delete');
  await expect(icon).toHaveCount(1);
  const danger = await page.evaluate(() => {
    const probe = document.createElement('i');
    probe.style.color = 'var(--color-danger)';
    document.body.append(probe);
    const colour = getComputedStyle(probe).color;
    probe.remove();
    return colour;
  });
  await expect(icon.locator('circle')).toHaveCSS('stroke', danger);
  await expect(icon.locator('path')).toHaveCSS('stroke', danger);
  await icon.hover();
  await expect(icon.locator('circle')).toHaveCSS('fill', danger);
});

test('clicking elsewhere puts the delete icon away', async ({ page }) => {
  const reference = await referenceResearch(page);
  const point = await spotOn(reference);
  await page.mouse.click(point.x, point.y);
  await expect(page.locator('.reference-delete')).toHaveCount(1);
  await page.mouse.click(2, 300);
  await expect(page.locator('.reference-delete')).toHaveCount(0);
  await expect(reference).toHaveCount(1);
});

test('right-clicking a reference line offers to go to either end, add another or remove it', async ({
  page,
}) => {
  const reference = await referenceResearch(page);
  const point = await spotOn(reference);
  await page.mouse.click(point.x, point.y, { button: 'right' });
  const menu = page.getByRole('menu');
  for (const name of [
    'Go to referenced topic',
    'Go to the topic it leaves',
    'Add another reference…',
    'Remove reference',
  ]) {
    await expect(menu.getByRole('menuitem', { name })).toBeVisible();
  }

  await menu.getByRole('menuitem', { name: 'Go to referenced topic' }).click();
  await expect(page.locator('.topic[data-topic-id="core"]')).toHaveAttribute(
    'data-focused',
    'true',
  );

  await page.mouse.click(point.x, point.y, { button: 'right' });
  await page.getByRole('menuitem', { name: 'Remove reference' }).click();
  await expect(reference).toHaveCount(0);
});

/** Makes `from` reference `to`, through the context menu and the search box. */
async function reference(page: Page, from: string, to: string) {
  await page.getByRole('treeitem', { name: from, exact: true }).first().click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Reference to…' }).click();
  const search = page.getByRole('combobox', { name: 'Search by topic or path' });
  await search.fill(to);
  await page.keyboard.press('Enter');
}

const linksFrom = (page: Page, id: string) =>
  page.locator(`.reference-link[data-reference-from="${id}"]`);

async function idOf(page: Page, name: string) {
  const id = await page
    .getByRole('treeitem', { name, exact: true })
    .first()
    .getAttribute('data-topic-id');
  if (!id) throw new Error(`${name} is missing its ID`);
  return id;
}

test('one topic can reference several, and several can reference one', async ({ page }) => {
  await page.goto('/?demo=14');
  const research = await idOf(page, 'Research');
  const customers = await idOf(page, 'Customers');

  // Multi-out: Research points at two topics.
  await reference(page, 'Research', 'Documentation');
  await expect(linksFrom(page, research)).toHaveCount(1);
  await reference(page, 'Research', 'Feedback');
  await expect(linksFrom(page, research)).toHaveCount(2);
  const targets = await linksFrom(page, research).evaluateAll((els) =>
    els.map((el) => el.getAttribute('data-reference-to')),
  );
  expect(new Set(targets).size).toBe(2);

  // Multi-in: Customers points at one of the same topics.
  await reference(page, 'Customers', 'Documentation');
  await expect(linksFrom(page, customers)).toHaveCount(1);
  await expect(page.locator('.reference-link')).toHaveCount(3);
});

test('a topic cannot be offered a target it already references', async ({ page }) => {
  await page.goto('/?demo=14');
  await reference(page, 'Research', 'Documentation');
  await page
    .getByRole('treeitem', { name: 'Research', exact: true })
    .first()
    .click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Reference to…' }).click();
  const search = page.getByRole('combobox', { name: 'Search by topic or path' });
  await search.fill('Documentation');
  await expect(page.getByRole('option', { name: /^Documentation/ })).toHaveCount(0);
  await page.keyboard.press('Escape');
});

test('removing one reference line leaves the others', async ({ page }) => {
  await page.goto('/?demo=14');
  const research = await idOf(page, 'Research');
  await reference(page, 'Research', 'Documentation');
  await reference(page, 'Research', 'Feedback');
  const lines = linksFrom(page, research);
  await expect(lines).toHaveCount(2);

  const doomed = lines.first();
  const doomedTo = await doomed.getAttribute('data-reference-to');
  const point = await spotOn(doomed);
  await page.mouse.click(point.x, point.y);
  await expect(page.locator('.reference-delete')).toHaveCount(1);
  await expect(page.locator('.reference-delete')).toHaveAttribute(
    'data-reference-to',
    doomedTo ?? '',
  );
  await page.locator('.reference-delete').click();

  await expect(lines).toHaveCount(1);
  expect(await lines.first().getAttribute('data-reference-to')).not.toBe(doomedTo);
});

test('two topics that reference each other get lines on opposite sides, not the same curve', async ({
  page,
}) => {
  await page.goto('/?demo=14');
  await reference(page, 'Research', 'Documentation');
  await reference(page, 'Documentation', 'Research');
  const lines = page.locator('.reference-link');
  await expect(lines).toHaveCount(2);

  const shape = (i: number) =>
    lines
      .nth(i)
      .locator('.reference-connector')
      .evaluate((el) => {
        const path = el as SVGPathElement;
        const length = path.getTotalLength();
        const start = path.getPointAtLength(0);
        const end = path.getPointAtLength(length);
        const mid = path.getPointAtLength(length / 2);
        return {
          start: { x: start.x, y: start.y },
          end: { x: end.x, y: end.y },
          mid: { x: mid.x, y: mid.y },
          d: path.getAttribute('d'),
        };
      });
  const there = await shape(0);
  const back = await shape(1);
  expect(there.d).not.toBe(back.d);
  // Which side of the line between the two topics each curve bows to, judged from one direction
  // (the first line's), so "left" means the same thing for both.
  const along = { x: there.end.x - there.start.x, y: there.end.y - there.start.y };
  const centre = {
    x: (there.start.x + there.end.x) / 2,
    y: (there.start.y + there.end.y) / 2,
  };
  const side = (l: typeof there) =>
    Math.sign(along.x * (l.mid.y - centre.y) - along.y * (l.mid.x - centre.x));
  expect(side(there)).not.toBe(0);
  expect(side(back)).not.toBe(0);
  expect(side(there)).toBe(-side(back));
  // And they are apart, not drawn over one another.
  const gap = Math.hypot(there.mid.x - back.mid.x, there.mid.y - back.mid.y);
  expect(gap).toBeGreaterThan(20);
});

const opacityOf = (line: Locator) =>
  line.locator('.reference-connector').evaluate((el) => Number(getComputedStyle(el).opacity));

test('reference lines are faded, and show in full for the topics they join and when picked', async ({
  page,
}) => {
  await page.goto('/?demo=14');
  await reference(page, 'Research', 'Documentation');
  const line = linksFrom(page, await idOf(page, 'Research'));
  await expect(line).toHaveCount(1);
  // Click empty canvas so nothing is picked, and move the pointer away from every topic.
  await page.mouse.click(2, 300);
  await page.mouse.move(2, 300);
  await expect.poll(() => opacityOf(line)).toBeLessThan(0.5);

  // Pointing at either end brings it up.
  await page.getByRole('treeitem', { name: 'Documentation', exact: true }).first().hover();
  await expect.poll(() => opacityOf(line)).toBe(1);
  await page.mouse.move(2, 300);
  await expect.poll(() => opacityOf(line)).toBeLessThan(0.5);
  await page.getByRole('treeitem', { name: 'Research', exact: true }).first().hover();
  await expect.poll(() => opacityOf(line)).toBe(1);

  // So does picking one of the topics, and picking the line itself.
  await page.getByRole('treeitem', { name: 'Documentation', exact: true }).first().click();
  await page.mouse.move(2, 300);
  await expect.poll(() => opacityOf(line)).toBe(1);
  await page.mouse.click(2, 300);
  await page.mouse.move(2, 300);
  await expect.poll(() => opacityOf(line)).toBeLessThan(0.5);
  const point = await spotOn(line);
  await page.mouse.click(point.x, point.y);
  await page.mouse.move(2, 300);
  await expect.poll(() => opacityOf(line)).toBe(1);
});

test('search keeps its results bounded on a large map', async ({ page }) => {
  await page.goto('/?demo=5000');
  await page.getByRole('tree', { name: 'Mind map' }).focus();
  await page.keyboard.press('Meta+f');
  const dialog = page.getByRole('dialog', { name: 'Search' });
  await expect(dialog).toBeVisible();
  await page.keyboard.type('topic');
  await expect(dialog.getByRole('option').first()).toBeVisible();
  expect(await dialog.getByRole('option').count()).toBeLessThanOrEqual(22);
});

async function alphaAndBeta(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('tree', { name: 'Mind map' }).focus();
  await page.keyboard.press('Tab');
  await page.keyboard.type('Alpha');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Beta');
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('treeitem')).toHaveCount(3);
}

const node = (page: import('@playwright/test').Page, name: string) =>
  page.locator('.topic[data-kind="topic"]', { hasText: name }).first();

test('dragging the reference handle onto another topic connects them', async ({ page }) => {
  await alphaAndBeta(page);
  await node(page, 'Alpha').click();
  await page.mouse.move(0, 0);
  await node(page, 'Alpha').hover();
  const handle = page.locator('.growth-handle[data-kind="reference"]');
  await expect(handle).toBeVisible();
  await expect(page.locator('.growth-handle[data-kind="before"]')).toHaveCount(0);

  const from = await handle.boundingBox();
  const to = await node(page, 'Beta').boundingBox();
  if (!from || !to) throw new Error('missing boxes');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
  await expect(page.locator('.reference-rubber-target')).toBeVisible();
  await page.mouse.up();

  await expect(page.locator('.reference-link')).toHaveCount(1);
  await expect(page.locator('.reference-rubber')).toHaveCount(0);
});

test('releasing a reference drag on empty canvas cancels it', async ({ page }) => {
  await alphaAndBeta(page);
  await node(page, 'Alpha').click();
  await page.mouse.move(0, 0);
  await node(page, 'Alpha').hover();
  const from = await page.locator('.growth-handle[data-kind="reference"]').boundingBox();
  if (!from) throw new Error('missing handle');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + 40, from.y - 120, { steps: 6 });
  await page.mouse.up();
  await expect(page.locator('.reference-link')).toHaveCount(0);
});

test('clicking the reference handle, or pressing X, searches for a target', async ({ page }) => {
  await alphaAndBeta(page);
  await node(page, 'Alpha').click();
  await page.mouse.move(0, 0);
  await node(page, 'Alpha').hover();
  await page.locator('.growth-handle[data-kind="reference"]').click();
  const search = page.getByRole('combobox', { name: 'Search by topic or path' });
  await expect(search).toBeFocused();
  await search.fill('Beta');
  await page.keyboard.press('Enter');
  await expect(page.locator('.reference-link')).toHaveCount(1);

  await page.getByRole('tree', { name: 'Mind map' }).focus();
  await page.keyboard.press('x');
  await expect(page.getByRole('combobox', { name: 'Search by topic or path' })).toBeFocused();
});
