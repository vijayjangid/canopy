/**
 * Sliding selection for tabs and segmented controls.
 *
 * Each group (a `.segmented` control, or the left and right panels' tab lists) draws one shared
 * indicator, a pill behind the picked option or a bar under the picked tab. This watches the page
 * and tells every group where its picked button is, through `--slide-x`, `--slide-y`, `--slide-w`
 * and `--slide-h`, so the indicator can glide from one option to the next. The groups themselves
 * stay plain markup, and a new one only needs the class.
 *
 * `data-slide` on a group is `on` once it has a place to draw, and `ready` a moment later. The
 * indicator only animates when ready, so a group that has just appeared does not slide in from the
 * corner.
 */

const GROUPS = '.segmented, .panel-tabs[role="tablist"], .inspector-tabs[role="tablist"]';
const PICKED = '[aria-pressed="true"], [aria-selected="true"]';

const known = new Set<HTMLElement>();
let resizes: ResizeObserver | undefined;

function place(group: HTMLElement): void {
  const picked = Array.from(group.children).find((el): el is HTMLElement => el.matches(PICKED));
  if (!picked || picked.offsetWidth === 0) {
    group.removeAttribute('data-slide');
    return;
  }
  const { style } = group;
  style.setProperty('--slide-x', `${picked.offsetLeft}px`);
  style.setProperty('--slide-y', `${picked.offsetTop}px`);
  style.setProperty('--slide-w', `${picked.offsetWidth}px`);
  style.setProperty('--slide-h', `${picked.offsetHeight}px`);
  if (group.dataset['slide']) return;
  group.dataset['slide'] = 'on';
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      if (group.dataset['slide'] === 'on') group.dataset['slide'] = 'ready';
    }),
  );
}

function adopt(root: ParentNode): void {
  const found = root instanceof HTMLElement && root.matches(GROUPS) ? [root] : [];
  for (const group of [...found, ...root.querySelectorAll<HTMLElement>(GROUPS)]) {
    if (!known.has(group)) {
      known.add(group);
      resizes?.observe(group);
    }
    place(group);
  }
}

function forget(node: Node): void {
  if (!(node instanceof HTMLElement)) return;
  for (const group of [...(node.matches(GROUPS) ? [node] : []), ...node.querySelectorAll(GROUPS)]) {
    if (group instanceof HTMLElement && known.delete(group)) resizes?.unobserve(group);
  }
}

/** Starts watching the page. Call once. */
export function installSlidingSelection(): void {
  if (typeof MutationObserver === 'undefined') return;
  if (typeof ResizeObserver !== 'undefined') {
    resizes = new ResizeObserver((entries) => {
      for (const entry of entries) if (entry.target instanceof HTMLElement) place(entry.target);
    });
  }
  // Measured as soon as the page changes, before it is painted, so the indicator is never missing
  // for a frame.
  new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'attributes') {
        const group = record.target instanceof Element ? record.target.closest(GROUPS) : null;
        if (group instanceof HTMLElement) place(group);
        continue;
      }
      record.removedNodes.forEach(forget);
      record.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) adopt(node);
      });
    }
  }).observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['aria-pressed', 'aria-selected'],
  });
  adopt(document.body);
  // Text widths change when the fonts arrive.
  void document.fonts?.ready.then(() => known.forEach(place));
}
