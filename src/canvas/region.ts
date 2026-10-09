import { createStore } from 'zustand/vanilla';
import type { Box } from '../layout';
import type { Detail } from './TopicNode';
import { containsRect, inflateRect, visibleRect } from './viewport';
import type { ViewportState } from './viewportStore';
import type { StoreApi } from 'zustand/vanilla';

/** Extra area drawn around the screen so small pans do not re-render anything. */
const RENDER_MARGIN = 0.6;
/** Below this zoom, topics are drawn as plain boxes without text. */
export const LOW_DETAIL_BELOW = 0.35;

export interface Region {
  rect: Box;
  detail: Detail;
}

/**
 * The part of the map that is drawn. It follows the viewport but only changes when the
 * screen leaves it or zoom changes a lot, so panning does not re-render topics.
 */
export function createRegionStore(viewport: StoreApi<ViewportState>) {
  // Nothing is drawn until the viewport has a size.
  const store = createStore<{ region: Region }>(() => ({
    region: { rect: { x: 0, y: 0, w: 0, h: 0 }, detail: 'full' },
  }));

  const update = ({ vp, size }: ViewportState) => {
    if (size.w === 0) return;
    const view = visibleRect(vp, size);
    const detail: Detail = vp.k < LOW_DETAIL_BELOW ? 'low' : 'full';
    const { region } = store.getState();
    const stillFine =
      region.detail === detail && containsRect(region.rect, view) && region.rect.w <= view.w * 4.5;
    if (!stillFine) store.setState({ region: { rect: inflateRect(view, RENDER_MARGIN), detail } });
  };

  viewport.subscribe(update);
  update(viewport.getState());
  return store;
}
