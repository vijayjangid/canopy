import { expect, test, type Page } from '@playwright/test';

const tree = (page: Page) => page.getByRole('tree', { name: 'Mind map' });
const topic = (page: Page, name: string) =>
  page.locator('.topic[data-kind="topic"]', { hasText: name }).first();

interface DroppedFile {
  name: string;
  type: string;
  /** Text content, or an image size to draw. */
  text?: string;
  image?: { w: number; h: number };
}

/** Fires drag and drop events with real File objects at the element matching `selector`. */
async function dragFiles(
  page: Page,
  files: DroppedFile[],
  selector: string,
  steps: Array<'dragover' | 'drop'> = ['dragover', 'drop'],
) {
  await page.evaluate(
    async ({ files, selector, steps }) => {
      const data = new DataTransfer();
      for (const f of files) {
        if (f.image) {
          const canvas = document.createElement('canvas');
          canvas.width = f.image.w;
          canvas.height = f.image.h;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('no canvas');
          ctx.fillStyle = '#e8590c';
          ctx.fillRect(0, 0, f.image.w, f.image.h);
          const blob = await new Promise<Blob>((resolve, reject) =>
            canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('no blob'))), f.type),
          );
          data.items.add(new File([blob], f.name, { type: f.type }));
        } else {
          data.items.add(new File([f.text ?? ''], f.name, { type: f.type }));
        }
      }
      const target = document.querySelector(selector);
      if (!target) throw new Error(`nothing matches ${selector}`);
      const rect = target.getBoundingClientRect();
      for (const type of steps) {
        target.dispatchEvent(
          new DragEvent(type, {
            dataTransfer: data,
            bubbles: true,
            cancelable: true,
            clientX: rect.x + rect.width / 2,
            clientY: rect.y + rect.height / 2,
          }),
        );
      }
    },
    { files, selector, steps },
  );
}

const mapFile = (title: string, core: string, kids: string[]) => ({
  name: `${title}.canopy.json`,
  type: 'application/json',
  text: JSON.stringify({
    schema: 'canopy/1',
    meta: { title },
    core: {
      id: 'imported_core',
      title: core,
      children: kids.map((k, i) => ({ id: `imported_${i}`, title: k, children: [] })),
    },
  }),
});

/** A selector for a topic's box, found by its text. */
async function boxOf(page: Page, name: string) {
  const id = await topic(page, name).getAttribute('data-topic-id');
  if (!id) throw new Error(`no topic ${name}`);
  return `[data-topic-id="${id}"] .topic-box`;
}

async function twoTopics(page: Page) {
  await page.goto('/');
  await tree(page).focus();
  await page.keyboard.press('Tab');
  await page.keyboard.type('Alpha');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Beta');
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('treeitem')).toHaveCount(3);
  await page.waitForTimeout(300);
}

test('a picture dropped on empty canvas becomes a new topic under the Core', async ({ page }) => {
  await twoTopics(page);
  await dragFiles(
    page,
    [{ name: 'shot.png', type: 'image/png', image: { w: 160, h: 90 } }],
    'svg.canvas-svg',
  );
  await expect(page.getByRole('treeitem')).toHaveCount(4);
  await expect(page.locator('.topic-image')).toHaveCount(1);
  const added = page.getByRole('treeitem', { name: /has a picture/ });
  await expect(added).toHaveAttribute('aria-level', '2');
});

test('a picture dropped on a topic goes on that topic', async ({ page }) => {
  await twoTopics(page);
  await dragFiles(
    page,
    [{ name: 'logo.png', type: 'image/png', image: { w: 100, h: 60 } }],
    await boxOf(page, 'Beta'),
  );
  await expect(page.locator('.topic-image')).toHaveCount(1);
  await expect(page.getByRole('treeitem')).toHaveCount(3);
  await expect(page.getByRole('treeitem', { name: /Beta.*has a picture/ })).toBeVisible();
  await expect(page.getByRole('treeitem', { name: /Alpha/ })).not.toHaveAttribute(
    'aria-label',
    /picture/,
  );
});

test('several pictures on one topic: the first goes on it, the rest become sub-topics', async ({
  page,
}) => {
  await twoTopics(page);
  await dragFiles(
    page,
    [
      { name: 'a.png', type: 'image/png', image: { w: 50, h: 50 } },
      { name: 'b.png', type: 'image/png', image: { w: 50, h: 50 } },
      { name: 'c.jpg', type: 'image/jpeg', image: { w: 50, h: 50 } },
    ],
    await boxOf(page, 'Alpha'),
  );
  await expect(page.locator('.topic-image')).toHaveCount(3);
  await expect(page.getByRole('treeitem')).toHaveCount(5);
});

test('a dropped Canopy map becomes a whole new branch on the topic', async ({ page }) => {
  await twoTopics(page);
  await dragFiles(
    page,
    [mapFile('Explored', 'Research notes', ['Interviews', 'Survey'])],
    await boxOf(page, 'Beta'),
  );
  await expect(page.getByRole('treeitem')).toHaveCount(3 + 3);
  const root = page.getByRole('treeitem', { name: 'Research notes' });
  await expect(root).toHaveAttribute('aria-level', '3');
  await expect(page.getByRole('treeitem', { name: 'Interviews' })).toHaveAttribute(
    'aria-level',
    '4',
  );
  await expect(page.getByRole('treeitem', { name: 'Survey' })).toHaveAttribute('aria-level', '4');
});

test('a dropped map on empty canvas goes under the Core, and can be dropped again', async ({
  page,
}) => {
  await twoTopics(page);
  const file = mapFile('Plan', 'Plan root', ['Step one']);
  await dragFiles(page, [file], 'svg.canvas-svg');
  await dragFiles(page, [file], 'svg.canvas-svg');
  await expect(page.getByRole('treeitem', { name: 'Plan root' })).toHaveCount(2);
  await expect(page.getByRole('treeitem', { name: 'Step one' })).toHaveCount(2);
  for (const item of await page.getByRole('treeitem', { name: 'Plan root' }).all()) {
    await expect(item).toHaveAttribute('aria-level', '2');
  }
});

test('adding a map is one undo step', async ({ page }) => {
  await twoTopics(page);
  await dragFiles(page, [mapFile('Plan', 'Plan root', ['A', 'B', 'C'])], 'svg.canvas-svg');
  await expect(page.getByRole('treeitem')).toHaveCount(7);
  await tree(page).focus();
  await page.keyboard.press('Meta+z');
  await expect(page.getByRole('treeitem')).toHaveCount(3);
});

test('dragging files over the map outlines where they would land', async ({ page }) => {
  await twoTopics(page);
  await dragFiles(
    page,
    [{ name: 'x.png', type: 'image/png', image: { w: 20, h: 20 } }],
    await boxOf(page, 'Beta'),
    ['dragover'],
  );
  await expect(page.locator('.file-drop-target')).toHaveCount(1);
  await expect(page.locator('.file-drop-hint')).toHaveText('Add picture to “Beta”');

  await dragFiles(page, [mapFile('Plan', 'Plan root', [])], 'svg.canvas-svg', ['dragover']);
  await expect(page.locator('.file-drop-target')).toHaveCount(0);
  await expect(page.locator('.canvas-host[data-file-drop]')).toHaveCount(1);
  await expect(page.locator('.file-drop-hint')).toHaveText('Add map as a branch of the Core');

  // Leaving the window ends it.
  await page.evaluate(() =>
    window.dispatchEvent(new DragEvent('dragleave', { bubbles: true, relatedTarget: null })),
  );
});

test('a file that is neither a picture nor a Canopy map is refused with a message', async ({
  page,
}) => {
  await twoTopics(page);
  await dragFiles(page, [{ name: 'notes.txt', type: 'text/plain', text: 'hi' }], 'svg.canvas-svg');
  await expect(page.getByText('notes.txt is not a picture or a Canopy map').first()).toBeVisible();
  await dragFiles(
    page,
    [{ name: 'broken.json', type: 'application/json', text: '{nope' }],
    'svg.canvas-svg',
  );
  await expect(page.getByText(/broken\.json is not a Canopy map/).first()).toBeVisible();
  await expect(page.getByRole('treeitem')).toHaveCount(3);
});

test('a map and a picture dropped together are both added', async ({ page }) => {
  await twoTopics(page);
  await dragFiles(
    page,
    [
      mapFile('Plan', 'Plan root', ['A']),
      { name: 'p.png', type: 'image/png', image: { w: 40, h: 40 } },
    ],
    'svg.canvas-svg',
  );
  await expect(page.getByRole('treeitem', { name: 'Plan root' })).toBeVisible();
  await expect(page.locator('.topic-image')).toHaveCount(1);
  await expect(page.getByRole('treeitem')).toHaveCount(3 + 2 + 1);
});

test('the map keeps its dropped branch after a reload', async ({ page }) => {
  await twoTopics(page);
  await dragFiles(page, [mapFile('Plan', 'Plan root', ['A'])], 'svg.canvas-svg');
  await expect(page.getByRole('treeitem', { name: 'Plan root' })).toBeVisible();
  await page.waitForTimeout(1200);
  await page.reload();
  await expect(page.getByRole('treeitem', { name: 'Plan root' })).toBeVisible();
});

test('Add a map as a branch is in the palette', async ({ page }) => {
  await page.goto('/');
  await tree(page).focus();
  await page.keyboard.press('Meta+k');
  await page.getByRole('combobox').fill('map file as a branch');
  await expect(page.getByRole('option', { name: /Add a map file as a branch/ })).toBeVisible();
});
