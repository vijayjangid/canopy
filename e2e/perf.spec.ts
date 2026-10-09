import { expect, test, type Page } from '@playwright/test';

// Run with `npm run bench`. Numbers depend on the machine, so thresholds are generous.

async function frameTimes(page: Page, action: () => Promise<void>) {
  const pending = page.evaluate(
    () =>
      new Promise<number[]>((resolve) => {
        const times: number[] = [];
        let last = performance.now();
        const stop = () => resolve(times);
        (window as unknown as { __stopFrames: () => void }).__stopFrames = stop;
        const tick = (now: number) => {
          times.push(now - last);
          last = now;
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  );
  await action();
  await page.evaluate(() => (window as unknown as { __stopFrames: () => void }).__stopFrames());
  const times = await pending;
  const sorted = [...times].sort((a, b) => a - b);
  const at = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? 0;
  return { frames: times.length, p50: at(0.5), p95: at(0.95), max: at(1) };
}

for (const count of [500, 5000]) {
  test(`pan and zoom stay smooth with ${count} topics`, async ({ page }) => {
    const start = Date.now();
    await page.goto(`/?demo=${count}`);
    await page.waitForSelector('.topic');
    const firstPaint = Date.now() - start;

    const box = await page.locator('.canvas-host').boundingBox();
    await page.mouse.move((box?.x ?? 0) + 600, (box?.y ?? 0) + 400);

    const pan = await frameTimes(page, async () => {
      for (let i = 0; i < 60; i++) {
        await page.mouse.wheel(40, 25);
        await page.waitForTimeout(8);
      }
    });
    const zoom = await frameTimes(page, async () => {
      await page.keyboard.down('Control');
      for (let i = 0; i < 40; i++) {
        await page.mouse.wheel(0, -40);
        await page.waitForTimeout(8);
      }
      await page.keyboard.up('Control');
    });

    console.log(
      `${count} topics: first paint ${firstPaint} ms; pan p50 ${pan.p50.toFixed(1)} p95 ${pan.p95.toFixed(1)} max ${pan.max.toFixed(0)}; ` +
        `zoom p50 ${zoom.p50.toFixed(1)} p95 ${zoom.p95.toFixed(1)} max ${zoom.max.toFixed(0)}`,
    );
    expect(pan.p95).toBeLessThan(50);
    expect(zoom.p95).toBeLessThan(80);
  });
}

test('editing stays responsive with 5000 topics', async ({ page }) => {
  await page.goto('/?demo=5000');
  await page.waitForSelector('.topic');
  await page.getByRole('tree', { name: 'Mind map' }).focus();

  const pending = page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const start = performance.now();
        const watch = new MutationObserver(() => {
          if (!document.querySelector('.title-editor')) return;
          watch.disconnect();
          resolve(performance.now() - start);
        });
        watch.observe(document.body, { childList: true, subtree: true });
      }),
  );
  await page.keyboard.press('Tab');
  const create = await pending;

  const typing: number[] = [];
  for (const char of 'Quarterly planning') {
    const ms = await page.evaluate(
      (c) =>
        new Promise<number>((resolve) => {
          const field = document.querySelector<HTMLTextAreaElement>('.title-editor');
          if (!field) return resolve(-1);
          const start = performance.now();
          const setter = Object.getOwnPropertyDescriptor(
            HTMLTextAreaElement.prototype,
            'value',
          )?.set;
          setter?.call(field, field.value + c);
          field.dispatchEvent(new Event('input', { bubbles: true }));
          requestAnimationFrame(() =>
            requestAnimationFrame(() => resolve(performance.now() - start)),
          );
        }),
      char,
    );
    typing.push(ms);
  }
  const sorted = [...typing].sort((a, b) => a - b);
  console.log(
    `5000 topics: create to editor ${create.toFixed(0)} ms; typing p50 ${sorted[Math.floor(sorted.length / 2)]?.toFixed(0)} ms, max ${sorted.at(-1)?.toFixed(0)} ms`,
  );
  expect(create).toBeLessThan(500);
  expect(sorted[Math.floor(sorted.length / 2)] ?? 0).toBeLessThan(150);
});

test('folding and unfolding stay responsive with 5000 topics', async ({ page }) => {
  await page.goto('/?demo=5000');
  await page.waitForSelector('.topic');
  await page.getByRole('tree', { name: 'Mind map' }).focus();

  const timeUntil = async (count: 'one' | 'many') => {
    // Install the observer first, so the key press cannot beat it.
    await page.evaluate((wanted) => {
      const start = performance.now();
      (window as unknown as { __done: Promise<number> }).__done = new Promise<number>((resolve) => {
        const watch = new MutationObserver(() => {
          const n = document.querySelectorAll('.topic[role="treeitem"]').length;
          if ((wanted === 'one' && n === 1) || (wanted === 'many' && n > 100)) {
            watch.disconnect();
            resolve(performance.now() - start);
          }
        });
        watch.observe(document.body, { childList: true, subtree: true });
      });
    }, count);
    await page.keyboard.press(']');
    return page.evaluate(() => (window as unknown as { __done: Promise<number> }).__done);
  };

  const fold = await timeUntil('one');
  const unfold = await timeUntil('many');
  console.log(`5000 topics: fold ${fold.toFixed(0)} ms, unfold ${unfold.toFixed(0)} ms`);
  expect(fold).toBeLessThan(500);
  expect(unfold).toBeLessThan(500);
});

test('5000 topics with Properties: paint, Filter and an edit stay responsive', async ({ page }) => {
  const start = Date.now();
  await page.goto('/?demo=5000&plan=1');
  await page.waitForSelector('.topic');
  const firstPaint = Date.now() - start;

  // Turn on a Filter and time how long until the map shows it.
  await page.getByRole('tree', { name: 'Mind map' }).focus();
  const filterStart = Date.now();
  await page.keyboard.press('/');
  await page.getByRole('list', { name: 'Status' }).getByRole('button', { name: 'Blocked' }).click();
  await page.waitForSelector('.topic[data-dim]');
  const filter = Date.now() - filterStart;

  // Change a Property on the focused topic and time the quick-add round trip.
  await page.getByRole('button', { name: 'Turn the Filter off' }).click();
  const editStart = Date.now();
  await page.keyboard.press('t');
  await page.keyboard.type('done');
  await page.keyboard.press('Enter');
  await page
    .getByRole('treeitem', { name: /status Done/ })
    .first()
    .waitFor({ state: 'attached' });
  const edit = Date.now() - editStart;

  const box = await page.locator('.canvas-host').boundingBox();
  await page.mouse.move((box?.x ?? 0) + 600, (box?.y ?? 0) + 400);
  const pan = await frameTimes(page, async () => {
    for (let i = 0; i < 60; i++) {
      await page.mouse.wheel(40, 25);
      await page.waitForTimeout(8);
    }
  });
  console.log(
    `5000 topics with Properties: first paint ${firstPaint} ms; Filter on ${filter} ms; quick add ${edit} ms; pan p50 ${pan.p50.toFixed(1)} p95 ${pan.p95.toFixed(1)}`,
  );
  expect(pan.p95).toBeLessThan(50);
  expect(filter).toBeLessThan(2500);
});
