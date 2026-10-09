import {
  connectorPath,
  seedOf,
  type Box,
  type ConnectorOptions,
  type Layout,
  type TopicBox,
} from '../layout';
import type { Flow } from '../model';
import { intersectsRect } from './viewport';

export interface Link {
  id: string;
  d: string;
}

export interface CulledScene {
  topics: TopicBox[];
  links: Link[];
}

/** Only what touches `region` is drawn. */
export function cullLayout(
  layout: Layout,
  flow: Flow,
  region: Box,
  connector: ConnectorOptions = {},
): CulledScene {
  const topics: TopicBox[] = [];
  const links: Link[] = [];
  for (const box of layout.order) {
    if (intersectsRect(box, region)) topics.push(box);
    const parent = box.parentId ? layout.boxes.get(box.parentId) : undefined;
    if (!parent) continue;
    // A connector can cross the region with both ends outside it, so test its own extent.
    const horizontal = flow === 'right';
    const x1 = horizontal ? parent.x + parent.w : parent.x + parent.w / 2;
    const y1 = horizontal ? parent.y + parent.h / 2 : parent.y + parent.h;
    const x2 = horizontal ? box.x : box.x + box.w / 2;
    const y2 = horizontal ? box.y + box.h / 2 : box.y;
    const extent: Box = {
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      w: Math.abs(x2 - x1),
      h: Math.abs(y2 - y1),
    };
    if (intersectsRect(extent, region)) {
      links.push({
        id: box.id,
        d: connectorPath(parent, box, flow, { ...connector, seed: seedOf(box.id) }),
      });
    }
  }
  return { topics, links };
}
