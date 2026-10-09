import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { mapPanel, openMapPanel } from './panels';

const tree = (page: Page) => page.getByRole('tree', { name: 'Mind map' });

async function newTopic(page: Page, text: string) {
  await page.goto('/');
  await tree(page).focus();
  await page.keyboard.press('Tab');
  await page.keyboard.type(text);
}

test('typing shorthand makes a status, due date and tag', async ({ page }) => {
  await newTopic(page, 'Draft launch plan /prog #launch ^fri');
  await expect(page.getByRole('status').filter({ hasText: 'Status In progress' })).toContainText(
    'Tag launch',
  );
  await page.keyboard.press('Shift+Tab');
  const item = page.getByRole('treeitem', { name: /^Draft launch plan,/ });
  await expect(item).toBeVisible();
  await expect(item).toHaveAttribute('aria-label', /status In progress/);
  await expect(item).toHaveAttribute('aria-label', /due /);
  await expect(item).toHaveAttribute('aria-label', /tags launch/);
  await expect(item.locator('.topic-chips')).toHaveCount(1);
  await expect(page.locator('.topic[data-selected] .topic-text')).toHaveText('Draft launch plan');
});

test('undo brings the shorthand back', async ({ page }) => {
  await newTopic(page, 'Ship #big');
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('treeitem', { name: /^Ship,/ })).toBeVisible();
  await tree(page).focus();
  await page.keyboard.press('ControlOrMeta+z');
  await expect(page.getByRole('treeitem', { name: /^Ship #big/ })).toBeVisible();
});

test('words that only look like shorthand stay in the title', async ({ page }) => {
  await newTopic(page, 'Email a@b.com about C# and /usr/bin');
  await page.keyboard.press('Shift+Tab');
  await expect(
    page.getByRole('treeitem', { name: 'Email a@b.com about C# and /usr/bin' }),
  ).toBeVisible();
  await expect(page.locator('.topic-chips')).toHaveCount(0);
});

test('there is a single selection mark while a new topic is edited', async ({ page }) => {
  await page.goto('/');
  await tree(page).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('textbox', { name: 'Topic title' })).toBeFocused();
  const editor = page.getByRole('textbox', { name: 'Topic title' });
  const style = await editor.evaluate((el) => {
    const css = getComputedStyle(el);
    return { outline: css.outlineStyle, shadow: css.boxShadow, background: css.backgroundColor };
  });
  expect(style.outline).toBe('none');
  expect(style.shadow).toBe('none');
  expect(style.background).toBe('rgba(0, 0, 0, 0)');
  await expect(page.locator('.topic-ring')).toHaveCount(1);
});

test('chips pass accessibility checks in every Look', async ({ page }) => {
  await page.goto('/?demo=18&plan=1');
  for (const look of ['Minimal', 'High contrast', 'Playful']) {
    const panel = await openMapPanel(page, 'Settings');
    await panel.getByRole('group', { name: 'Theme' }).getByRole('button', { name: look }).click();
    await page.keyboard.press('Escape');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, look).toEqual([]);
  }
});

test('quick add sets status from the keyboard', async ({ page }) => {
  await newTopic(page, 'Write spec');
  await page.keyboard.press('Shift+Tab');
  await tree(page).focus();
  await page.keyboard.press('t');
  const dialog = page.getByRole('dialog', { name: 'Quick add' });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Set status' })).toBeFocused();
  await page.keyboard.type('prog');
  await expect(dialog.getByRole('option').first()).toContainText('In progress');
  await page.keyboard.press('Enter');
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole('treeitem', { name: /Write spec, status In progress/ }),
  ).toBeVisible();
  await expect(tree(page)).toBeFocused();
});

test('quick add understands dates and adds tags', async ({ page }) => {
  await newTopic(page, 'Ship');
  await page.keyboard.press('Shift+Tab');
  await tree(page).focus();
  await page.keyboard.press('d');
  await page.keyboard.type('tomorrow');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('treeitem', { name: /Ship, due/ })).toBeVisible();
  await tree(page).focus();
  await page.keyboard.press('g');
  await page.keyboard.type('urgent');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('treeitem', { name: /tags urgent/ })).toBeVisible();
});

test('the Properties section edits several topics at once and shows mixed values', async ({
  page,
}) => {
  await newTopic(page, 'One');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Two');
  await page.keyboard.press('Shift+Tab');
  await tree(page).focus();
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('t');
  await page.keyboard.type('done');
  await page.keyboard.press('Enter');
  await tree(page).focus();
  await page.keyboard.press('Shift+ArrowDown');
  await page.keyboard.press('Shift+P');
  const status = page.getByRole('group', { name: 'Status' });
  await expect(status.getByRole('button').first()).toBeFocused();
  await expect(status.getByRole('button', { pressed: true })).toHaveCount(0);
  await expect(page.getByText('Mixed. Pick one to set them all.')).toBeVisible();
  await expect(page.getByText('2 topics selected')).toBeVisible();
  await status.getByRole('button', { name: 'In review' }).click();
  await expect(page.getByRole('treeitem', { name: /One, status In review/ })).toBeVisible();
  await expect(page.getByRole('treeitem', { name: /Two, status In review/ })).toBeVisible();
  await page.getByLabel('Add a tag').fill('Q4');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(
    page.getByRole('treeitem', { name: /Two, status In review, tags Q4/ }),
  ).toBeVisible();
});

test('a folded branch shows a roll-up', async ({ page }) => {
  await newTopic(page, 'Branch');
  await page.keyboard.press('Tab');
  await page.keyboard.type('B /done');
  await page.keyboard.press('Enter');
  await page.keyboard.type('C /todo');
  await page.keyboard.press('Shift+Tab');
  await tree(page).focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press(']');
  await expect(page.locator('.fold-badge text')).toHaveText('2 · 1/2');
});

test('a Filter dims or isolates, counts matches and jumps between them', async ({ page }) => {
  await page.goto('/?demo=40&plan=1');
  await tree(page).focus();
  await page.keyboard.press('/');
  await page.getByRole('list', { name: 'Status' }).getByRole('button', { name: 'Blocked' }).click();
  const control = page.locator('.filter-control');
  await expect(control).toContainText('Filter: Blocked');
  const count = Number((await control.textContent())?.match(/· (\d+)/)?.[1]);
  expect(count).toBeGreaterThan(0);
  await expect(page.locator('.topic[data-dim]').first()).toBeAttached();
  const before = await page.locator('.topic').count();

  await control.getByRole('button', { name: 'Isolate' }).click();
  await expect.poll(() => page.locator('.topic').count()).toBeLessThan(before);

  await tree(page).focus();
  await page.keyboard.press('.');
  await expect(page.getByRole('treeitem', { selected: true })).toHaveAttribute(
    'aria-label',
    /Blocked/,
  );

  await control.getByRole('button', { name: 'Turn the Filter off' }).click();
  await expect(page.locator('.topic[data-dim]')).toHaveCount(0);
});

test('a tag becomes a Filter', async ({ page }) => {
  await page.goto('/?demo=40&plan=1');
  await tree(page).focus();
  await page.keyboard.press('/');
  await page.getByRole('list', { name: 'Tags' }).getByRole('button', { name: 'Launch' }).click();
  await expect(page.locator('.filter-control')).toContainText('Filter: #Launch');
});

test('exports a table with properties and respects a Filter', async ({ page }) => {
  await page.goto('/?demo=40&plan=1');
  await tree(page).focus();
  await page.keyboard.press('/');
  await page.getByRole('list', { name: 'Status' }).getByRole('button', { name: 'Blocked' }).click();
  await tree(page).focus();
  await page.keyboard.press('ControlOrMeta+e');
  const panel = mapPanel(page);
  await panel.getByRole('radio', { name: /Table/ }).check();
  const [saved] = await Promise.all([
    page.waitForEvent('download'),
    panel.getByRole('button', { name: 'Export', exact: true }).click(),
  ]);
  const text = (
    await (await import('node:fs/promises')).readFile((await saved.path()) ?? '')
  ).toString('utf8');
  expect(saved.suggestedFilename()).toBe('Demo map.csv');
  const lines = text.trim().split('\r\n');
  expect(lines[0]).toContain('Path,Topic,Status');
  expect(lines.length).toBeGreaterThan(1);
  for (const row of lines.slice(1)) expect(row).toContain('Blocked');
});

test('tags can be recoloured, renamed and deleted in the panel', async ({ page }) => {
  await page.goto('/?demo=20&plan=1');
  const panel = await openMapPanel(page, 'Tags');
  const tags = panel.getByRole('list', { name: 'Tags' });
  await expect(tags.getByRole('listitem')).toHaveCount(3);
  await tags.getByRole('button', { name: 'Colour of tag Design' }).click();
  await panel.getByRole('button', { name: '#e03131' }).click();
  await expect(tags.getByRole('button', { name: 'Colour of tag Design' })).toHaveCSS(
    'background-color',
    'rgb(224, 49, 49)',
  );
  await expect(panel.getByRole('button', { name: '#e03131' })).toHaveCount(0);
  await tags.getByRole('button', { name: 'Colour of tag Design' }).click();
  await expect(panel.getByText('Custom colour')).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(mapPanel(page)).toBeVisible();
  await panel.getByRole('button', { name: 'Delete tag Design' }).click();
  await expect(tags.getByRole('listitem')).toHaveCount(2);
});

test('Quick add, the details panel and an active Filter have no accessibility violations', async ({
  page,
}) => {
  await page.goto('/?demo=30&plan=1');
  await tree(page).focus();
  await page.keyboard.press('p');
  await expect(page.getByRole('dialog', { name: 'Quick add' })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press('Escape');

  await tree(page).focus();
  await page.keyboard.press('Shift+P');
  await expect(
    page.getByRole('group', { name: 'Status' }).getByRole('button').first(),
  ).toBeFocused();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await tree(page).focus();
  await page.keyboard.press('/');
  await page
    .getByRole('list', { name: 'Due date' })
    .getByRole('button', { name: 'Overdue' })
    .click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('every Look keeps chips, stickers and the Filter pill accessible in dark mode', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/?demo=24&plan=1');
  await tree(page).focus();
  await page.keyboard.press('/');
  await page
    .getByRole('list', { name: 'Due date' })
    .getByRole('button', { name: 'Due this week' })
    .click();
  for (const look of ['Minimal', 'High contrast', 'Playful']) {
    const panel = await openMapPanel(page, 'Settings');
    await panel.getByRole('group', { name: 'Theme' }).getByRole('button', { name: look }).click();
    await page.keyboard.press('Escape');
    expect((await new AxeBuilder({ page }).analyze()).violations, look).toEqual([]);
  }
});
