import type { Layout } from '../layout';
import type { DropTarget, Flow } from '../model';
import { anchorOf } from './growth';
import { useDrag } from './dragStore';

const OUTSET = 6;
const STUB = 34;

/** Inside the map's SVG: shows where dragged branches will land. */
export function DropIndicator({ layout, flow }: { layout: Layout; flow: Flow }) {
  const drop = useDrag((s) => s.drop);
  return drop ? <Indicator drop={drop} layout={layout} flow={flow} /> : null;
}

function Indicator({ drop, layout, flow }: { drop: DropTarget; layout: Layout; flow: Flow }) {
  const box = layout.boxes.get(drop.subject);
  if (!box) return null;

  if (drop.kind === 'child') {
    const from = anchorOf(box, flow, 'child');
    const to = flow === 'right' ? { x: from.x + STUB, y: from.y } : { x: from.x, y: from.y + STUB };
    return (
      <g className="drop-indicator" pointerEvents="none">
        <rect className="drop-target" x={box.x} y={box.y} width={box.w} height={box.h} rx={10} />
        <line className="drop-line" x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
        <circle className="drop-dot" cx={to.x} cy={to.y} r={4} />
      </g>
    );
  }

  const sign = drop.kind === 'before' ? -1 : 1;
  const line =
    flow === 'right'
      ? {
          x1: box.x,
          x2: box.x + box.w,
          y1: sign < 0 ? box.y - OUTSET : box.y + box.h + OUTSET,
          y2: sign < 0 ? box.y - OUTSET : box.y + box.h + OUTSET,
        }
      : {
          y1: box.y,
          y2: box.y + box.h,
          x1: sign < 0 ? box.x - OUTSET : box.x + box.w + OUTSET,
          x2: sign < 0 ? box.x - OUTSET : box.x + box.w + OUTSET,
        };
  return (
    <g className="drop-indicator" pointerEvents="none">
      <line className="drop-line" {...line} />
      <circle className="drop-dot" cx={line.x1} cy={line.y1} r={4} />
      <circle className="drop-dot" cx={line.x2} cy={line.y2} r={4} />
    </g>
  );
}

/** Follows the pointer while branches are dragged. */
export function DragChip() {
  const active = useDrag((s) => s.active);
  const label = useDrag((s) => s.label);
  const pointer = useDrag((s) => s.pointer);
  if (!active) return null;
  return (
    <div className="drag-chip" style={{ left: pointer.x, top: pointer.y }} aria-hidden="true">
      {label}
    </div>
  );
}
