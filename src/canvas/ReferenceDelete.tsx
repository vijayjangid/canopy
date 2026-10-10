import { referenceGeometry, type Box } from '../layout';

interface Props {
  from: string;
  to: string;
  source: Box | undefined;
  target: Box | undefined;
}

/** A small delete icon on the middle of a picked reference line. The canvas handles its press. */
export function ReferenceDelete({ from, source, target, to }: Props) {
  if (!source || !target) return null;
  const { mid } = referenceGeometry(source, target);
  return (
    <g
      className="reference-delete"
      data-reference-delete={from}
      data-reference-to={to}
      data-tip="Remove reference (Del)"
      aria-hidden="true"
      transform={`translate(${mid.x} ${mid.y})`}
    >
      <circle r={11} />
      <path d="M-3.5 -3.5L3.5 3.5M3.5 -3.5L-3.5 3.5" />
    </g>
  );
}
