import type { ContextNode } from './branchLayout';

const clip = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1)}\u2026` : text;

/** The dotted node standing in for everything outside the branch. Clicking it shows the whole map. */
export function ContextNodeView({ node }: { node: ContextNode }) {
  const { box, link, count, path } = node;
  return (
    <g className="context-node" data-context-node="" aria-hidden="true">
      <line className="context-link" x1={link.x1} y1={link.y1} x2={link.x2} y2={link.y2} />
      <rect className="context-box" x={box.x} y={box.y} width={box.w} height={box.h} rx={12} />
      <text className="context-title" x={box.x + box.w / 2} y={box.y + 18} textAnchor="middle">
        {count === 1 ? '1 topic above' : `${count} topics above`}
      </text>
      <text className="context-path" x={box.x + box.w / 2} y={box.y + 34} textAnchor="middle">
        {clip(path.join(' \u203a '), 30)}
      </text>
      <title>Unfold everything</title>
    </g>
  );
}
