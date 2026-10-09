import AxeBuilder from '@axe-core/playwright';
import { openMapPanel } from './panels';
import { expect, test } from '@playwright/test';

const html = (page: import('@playwright/test').Page) => page.locator('html');

async function openPrefs(page: import('@playwright/test').Page) {
  return openMapPanel(page, 'Settings');
}

test('Preferences changes the Look and the map redraws', async ({ page }) => {
  await page.goto('/?demo=40');
  const dialog = await openPrefs(page);
  await dialog
    .getByRole('group', { name: 'Theme' })
    .getByRole('button', { name: 'Playful' })
    .click();
  await expect(html(page)).toHaveAttribute('data-look', 'playful');
  await dialog.getByRole('switch', { name: 'Level numbers' }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.level-prefix').first()).toBeVisible();
  await expect(page.locator('.level-prefix').first()).toHaveText(/^1\./);
  await expect(page.locator('.topic[data-level="1"]').first()).toBeVisible();
});

test('each theme brings its own font', async ({ page }) => {
  await page.goto('/?demo=20');
  const first = page.locator('.topic[data-depth="1"] .topic-box').first();
  const widths: Record<string, string | null> = {};
  for (const [theme, voice] of [
    ['Minimal', 'clean'],
    ['High contrast', 'editorial'],
    ['Playful', 'sketch'],
  ] as const) {
    const dialog = await openPrefs(page);
    await dialog.getByRole('group', { name: 'Theme' }).getByRole('button', { name: theme }).click();
    await expect(html(page)).toHaveAttribute('data-voice', voice);
    await page.keyboard.press('Escape');
    await expect.poll(() => first.getAttribute('width')).not.toBeNull();
    widths[theme] = await first.getAttribute('width');
  }
  // Topics are sized to their font, so the three themes do not all draw the same box.
  expect(new Set(Object.values(widths)).size).toBeGreaterThan(1);
});

test('Settings offers a theme only, not its font, size, lines or motion', async ({ page }) => {
  await page.goto('/?demo=10');
  const dialog = await openPrefs(page);
  await expect(dialog.getByRole('group', { name: 'Theme' })).toBeVisible();
  for (const name of ['Font', 'Font size', 'Connectors', 'Motion', 'Colour mode']) {
    await expect(dialog.getByRole('group', { name })).toHaveCount(0);
  }
  await expect(dialog.getByRole('switch', { name: 'Level colours' })).toHaveCount(0);
});

test('the Look follows Auto mode and the map', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/?demo=10');
  await expect(html(page)).toHaveAttribute('data-scheme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(html(page)).toHaveAttribute('data-scheme', 'light');
});

for (const look of ['Minimal', 'High contrast', 'Playful']) {
  for (const scheme of ['light', 'dark'] as const) {
    test(`${look} (${scheme}) has no accessibility violations`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/?demo=30');
      const dialog = await openPrefs(page);
      await dialog
        .getByRole('group', { name: 'Theme' })
        .getByRole('button', { name: look })
        .click();
      await dialog.getByRole('switch', { name: 'Level numbers' }).click();
      const dialogResults = await new AxeBuilder({ page }).analyze();
      expect(dialogResults.violations).toEqual([]);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }
}

test('in Playful the selected topic uses the interactive colour, not its level colour', async ({
  page,
}) => {
  await page.goto('/?demo=14');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('group', { name: 'Theme' }).getByRole('button', { name: 'Playful' }).click();
  await page.getByRole('button', { name: 'Close panel' }).click();
  const accent = await page.evaluate(() => {
    const probe = document.createElement('i');
    probe.style.color = 'var(--color-accent)';
    document.body.append(probe);
    const colour = getComputedStyle(probe).color;
    probe.remove();
    return colour;
  });
  const picked = page.locator('.topic[data-depth="2"]').first();
  const other = page.locator('.topic[data-depth="2"]').nth(1);
  const read = (topic: typeof picked) =>
    topic.evaluate((el) => ({
      ring: el.querySelector('.topic-ring')
        ? getComputedStyle(el.querySelector('.topic-ring') as Element).stroke
        : null,
      text: getComputedStyle(el.querySelector('.topic-text') as Element).fill,
      face: getComputedStyle(el.querySelector('.sticker-face') as Element).fill,
    }));
  const before = await read(picked);
  await picked.click();
  const after = await read(picked);
  expect(after.ring).toBe(accent);
  expect(after.text).toBe(accent);
  expect(after.face).not.toBe(before.face);
  expect(before.text).not.toBe(accent);
  // A topic that is not picked keeps its level colour.
  expect((await read(other)).text).not.toBe(accent);
});

test('in Playful the title editor text matches the selected sticker, Core included', async ({
  page,
}) => {
  await page.goto('/?demo=14');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('group', { name: 'Theme' }).getByRole('button', { name: 'Playful' }).click();
  await page.getByRole('button', { name: 'Close panel' }).click();
  const accent = await page.evaluate(() => {
    const probe = document.createElement('i');
    probe.style.color = 'var(--color-accent)';
    document.body.append(probe);
    const colour = getComputedStyle(probe).color;
    probe.remove();
    return colour;
  });
  for (const depth of [0, 1]) {
    await page.locator(`.topic[data-depth="${depth}"]`).first().click();
    await page.keyboard.press('Space');
    const editor = page.locator('.title-editor');
    await expect(editor).toBeFocused();
    await expect(editor).toHaveCSS('color', accent);
    await expect(editor).toHaveCSS('caret-color', accent);
    await page.keyboard.press('Escape');
  }
});

test('tags on the Core stay readable against its solid colour', async ({ page }) => {
  await page.goto('/?demo=10');
  await page.locator('.topic[data-depth="0"]').first().click();
  // The first tag gets the same purple as the Core, which is the worst case.
  const field = page.getByPlaceholder('Add a tag, or press comma');
  await field.fill('CPO');
  await field.press('Enter');
  const dot = page.locator('.topic[data-depth="0"] .topic-chips circle').first();
  await expect(dot).toHaveAttribute('stroke', /.+/);
  await expect(dot).toHaveAttribute('fill', '#5b4bdb');
});

test('titles and chips start at the same left edge, in every theme', async ({ page }) => {
  await page.goto('/?demo=14&plan=1');
  for (const name of ['Minimal', 'High contrast', 'Playful']) {
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('group', { name: 'Theme' }).getByRole('button', { name }).click();
    await page.getByRole('button', { name: 'Close panel' }).click();
    // A topic with a row of chips under its title.
    const topic = page.locator('.topic[data-depth="1"]:has(.topic-chips)').first();
    await expect(topic).toBeVisible();
    // Both are laid out from the same left padding, so compare the layout, not glyph edges.
    const [titleX, chipsX] = await Promise.all([
      topic.locator('.topic-text tspan').first().getAttribute('x'),
      topic
        .locator('.topic-chips')
        .getAttribute('transform')
        .then((t) => /translate\(([\d.]+)/.exec(t ?? '')?.[1]),
    ]);
    expect(titleX).toBe('14');
    expect(chipsX).toBe('14');
    await expect(topic.locator('.topic-text')).toHaveAttribute('text-anchor', 'start');
  }
});
