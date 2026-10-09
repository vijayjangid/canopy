import { LEVEL_COUNT } from '../theme/levels';

/** The gradients Playful topics are filled with. Their colours come from the stylesheet. */
export function PlayfulDefs() {
  return (
    <defs>
      {Array.from({ length: LEVEL_COUNT + 1 }, (_, level) => (
        <linearGradient
          key={level}
          id={`pg-${level}`}
          className="pg"
          data-level={level}
          x1="0"
          y1="0"
          x2="1"
          y2="1"
        >
          <stop offset="0" />
          <stop offset="1" />
        </linearGradient>
      ))}
    </defs>
  );
}
