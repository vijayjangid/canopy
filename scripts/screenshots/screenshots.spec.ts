import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { PLATFORM_ROADMAP, PRODUCT_LAUNCH, type DemoTopic } from './maps';

/**
 * Makes the screenshots in `docs/screenshots/`, which the README shows.
 *
 *   npm run screenshots                 make all of them
 *   npm run screenshots -- -g hero      make only the ones whose name matches
 *
 * It opens the app in the dev server, builds a demo map (see `maps.ts`), and shoots each picture.
 * Run it again after the look of the app changes, check the pictures, and commit them. Nothing
 * here is part of the test suite.
 */

const OUT = path.resolve('docs/screenshots');
mkdirSync(OUT, { recursive: true });
const out = (file: string) => path.join(OUT, `${file}.png`);

/** Modules the dev server serves, loaded in the page by path. */
const MODEL = '/src/model/index.ts';
const STORE = '/src/store/index.ts';
const LAYOUT = '/src/layout/index.ts';
const METRICS = '/src/canvas/metrics.ts';

/** Loads `tree` as the open map, in place of whatever the page started with. */
async function loadMap(page: Page, tree: DemoTopic, title: string): Promise<void> {
  await page.goto('/?demo=3');
  await page.evaluate(
    async ({ tree, title, modelUrl, storeUrl }) => {
      const model = await import(/* @vite-ignore */ modelUrl);
      const { canopyStore } = await import(/* @vite-ignore */ storeUrl);
      let map = model.createMap({ coreId: 'core', title, coreTitle: tree.title });
      let count = 0;
      const idOf = new Map<string, string>();
      const pending: Array<[string, string]> = [];

      const add = (parent: string, kids: DemoTopic[] = []) => {
        for (const kid of kids) {
          const id = `t${count++}`;
          idOf.set(kid.title, id);
          map = model.createSubTopic(map, parent, { id, title: kid.title }).map;
          const tags: string[] = [];
          for (const tag of kid.tags ?? []) {
            const made = model.ensureTag(map, tag);
            map = made.map;
            tags.push(made.key);
          }
          if (kid.status || kid.due || tags.length > 0) {
            map = model.setProps(map, [id], {
              ...(kid.status ? { status: kid.status } : {}),
              ...(kid.due ? { due: { end: kid.due } } : {}),
              ...(tags.length > 0 ? { tags } : {}),
            });
          }
          for (const sticker of kid.stickers ?? []) map = model.addSticker(map, id, sticker);
          if (kid.note) map = model.setNote(map, id, kid.note);
          if (kid.edge) map = model.setEdgeLabel(map, id, kid.edge);
          for (const to of kid.references ?? []) pending.push([id, to]);
          add(id, kid.children);
        }
      };
      add('core', tree.children);
      // References point at topics anywhere in the map, so they go in once every topic exists.
      for (const [from, to] of pending) {
        const target = idOf.get(to);
        if (target) map = model.addTopicReference(map, from, target);
      }
      canopyStore.getState().load('screenshots', map);
    },
    { tree, title, modelUrl: MODEL, storeUrl: STORE },
  );
  await expect(page.getByRole('tree', { name: 'Mind map' })).toBeVisible();
}

/** Picks a topic by its title, the way a click would, without the pointer getting in the way. */
async function pick(page: Page, title: string): Promise<void> {
  await page.evaluate(
    async ({ title, storeUrl }) => {
      const { canopyStore } = await import(/* @vite-ignore */ storeUrl);
      const { doc, select } = canopyStore.getState();
      const topics = Object.values(doc.topics) as Array<{ id: string; title: string }>;
      const topic = topics.find((t) => t.title === title);
      if (topic) select([topic.id], topic.id);
    },
    { title, storeUrl: STORE },
  );
}

async function chooseTheme(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('group', { name: 'Theme' }).getByRole('button', { name }).click();
  await page.getByRole('button', { name: 'Close panel' }).click();
}

/** Lets the map settle after something moved, so the picture is not taken mid-animation. */
const settle = (page: Page) => page.waitForTimeout(900);

// The big pictures are taken at twice the size, so they stay sharp on high-density screens.
test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

test('hero: the map with both panels open', async ({ page }) => {
  await loadMap(page, PRODUCT_LAUNCH, 'Product launch');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await pick(page, 'Strategy');
  await page.mouse.move(700, 880);
  await settle(page);
  await page.screenshot({ path: out('hero') });
});

test('inspector: a picked topic, its trail and the details panel', async ({ page }) => {
  await loadMap(page, PRODUCT_LAUNCH, 'Product launch');
  await pick(page, 'Landing page');
  await page.mouse.move(700, 880);
  await settle(page);
  await page.screenshot({ path: out('inspector') });
});

test('palette: the search dialog', async ({ page }) => {
  await loadMap(page, PRODUCT_LAUNCH, 'Product launch');
  await pick(page, 'Strategy');
  await page.keyboard.press('ControlOrMeta+k');
  await page.waitForTimeout(700);
  await page.screenshot({ path: out('palette') });
});

test.describe('themes', () => {
  test.use({ viewport: { width: 1000, height: 760 } });

  const themes = [
    { file: 'look-playful', theme: 'Playful', scheme: 'light' },
    { file: 'look-playful-dark', theme: 'Playful', scheme: 'dark' },
    { file: 'look-contrast', theme: 'High contrast', scheme: 'light' },
  ] as const;

  for (const { file, theme, scheme } of themes) {
    test(`${file}: ${theme}, ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await loadMap(page, PRODUCT_LAUNCH, 'Product launch');
      await chooseTheme(page, theme);
      // Just the map: hide the panels, fit it to the window and let go of the selection.
      await page.getByRole('tree', { name: 'Mind map' }).focus();
      await page.keyboard.press('z');
      await page.addStyleTag({ content: '.zen-exit { display: none !important; }' });
      await page.getByRole('tree', { name: 'Mind map' }).focus();
      await page.keyboard.press('0');
      await page.evaluate(async (storeUrl) => {
        const { canopyStore } = await import(/* @vite-ignore */ storeUrl);
        canopyStore.getState().deselect();
      }, STORE);
      await page.mouse.move(980, 740);
      await settle(page);
      await page.screenshot({ path: out(file) });
    });
  }
});

test('compact layout: the export panel, and the same map on A4 before and after', async ({
  page,
}) => {
  await loadMap(page, PLATFORM_ROADMAP, 'Platform roadmap');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const panel = page.locator('.panel-left');
  await panel.getByRole('radio', { name: 'PDF' }).check();
  const preview = panel.locator('.export-preview');
  const compact = panel.getByRole('checkbox', { name: /Compact layout/ });

  /** The preview picture as a data URL, which outlives the page it was drawn on. */
  const previewPicture = () =>
    preview.locator('img').evaluate((el) => {
      const img = el as HTMLImageElement;
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d')?.drawImage(img, 0, 0);
      return { url: canvas.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight };
    });

  // Before: the standard layout on a portrait page, which becomes a thin sliver.
  if (await compact.isChecked()) await compact.uncheck();
  await expect(preview.locator('img')).toBeVisible();
  await page.waitForTimeout(700);
  const before = await previewPicture();
  // The same fit the app makes: A4 less a 28px margin all round.
  const beforeScale = await page.evaluate(
    async ({ layoutUrl, metricsUrl, storeUrl }) => {
      const layout = await import(/* @vite-ignore */ layoutUrl);
      const metrics = await import(/* @vite-ignore */ metricsUrl);
      const { canopyStore } = await import(/* @vite-ignore */ storeUrl);
      const { doc } = canopyStore.getState();
      const l = layout.computeLayout(doc, {
        flow: doc.prefs.flow,
        density: 'comfortable',
        measure: metrics.measureTopic,
      });
      return Math.min((794 - 56) / l.bounds.w, (1123 - 56) / l.bounds.h);
    },
    { layoutUrl: LAYOUT, metricsUrl: METRICS, storeUrl: STORE },
  );

  // After: the compact layout, on whichever page fits best.
  await compact.check();
  await panel.getByRole('button', { name: 'Best fit' }).click();
  await page.waitForTimeout(900);
  const after = await previewPicture();
  const afterNote = (await preview.locator('p').innerText()).trim();
  const afterScale = /(\d+)% size/.exec(afterNote)?.[1];
  expect(afterScale, `the preview should say how big the layout is: ${afterNote}`).toBeDefined();

  // The export panel itself, as the second picture in the README shows it.
  const box = await panel.boundingBox();
  if (!box) throw new Error('The export panel is not showing');
  await page.screenshot({
    path: out('export-compact'),
    clip: { x: box.x - 8, y: box.y - 8, width: box.width + 16, height: box.height + 16 },
  });

  // Put the two pages side by side, with captions, on a plain page.
  const shownWidth = Math.round(before.w * beforeScale * (850 / 1123));
  const shownHeight = Math.round(before.h * beforeScale * (850 / 1123));
  const shadow = 'box-shadow: 0 18px 50px rgba(40, 48, 90, 0.22)';
  await page.setViewportSize({ width: 2000, height: 1049 });
  await page.setContent(`
    <body style="margin: 0; background: #e9ecf6; font-family: system-ui, -apple-system, 'Segoe UI', sans-serif">
      <div style="display: flex; gap: 70px; padding: 60px 65px 0">
        <div style="width: 600px; text-align: center">
          <div style="display: grid; place-items: center; width: 600px; height: 850px; background: #fff; ${shadow}">
            <img src="${before.url}" style="width: ${shownWidth}px; height: ${shownHeight}px" />
          </div>
          <div style="margin-top: 22px; font-size: 27px; font-weight: 700; color: #23253a">Standard layout</div>
          <div style="margin-top: 6px; font-size: 21px; color: #6b6f85">A4 portrait · ${Math.round(beforeScale * 100)}% size</div>
        </div>
        <div style="width: 1200px; text-align: center">
          <img src="${after.url}" style="display: block; width: 1200px; height: 850px; ${shadow}" />
          <div style="margin-top: 22px; font-size: 27px; font-weight: 700; color: #23253a">Compact layout</div>
          <div style="margin-top: 6px; font-size: 21px; color: #6b6f85">A4 landscape · ${afterScale}% size</div>
        </div>
      </div>
    </body>`);
  await page.waitForTimeout(500);
  await page.screenshot({ path: out('compact-before-after') });

  // The README quotes these numbers, so print them for whoever updates it.
  const topics = /(\d+) topics/.exec(afterNote)?.[1];
  console.log(
    `\nFor the README's compact layout text: ${topics} topics, ${Math.round(beforeScale * 100)}% ` +
      `with the standard layout, ${afterScale}% with the compact layout.`,
  );
});
