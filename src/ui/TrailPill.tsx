import { useSettings } from '../settings';
import { useCanopy } from '../store';
import { Icon } from './icons';
import { setTrailMode, useUi, type TrailMode } from './uiStore';
import { useFilterOn, trailOf } from './trail';

const MODES: Array<{ value: TrailMode; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'highlight', label: 'Highlight' },
  { value: 'isolate', label: 'Isolate' },
];

/** A pill over the map for the Trail, like the Filter's: how the way up is shown, and off. */
export function TrailPill() {
  const on = useSettings((s) => s.trail);
  const mode = useUi((s) => s.trailMode);
  const filterOn = useFilterOn();
  const doc = useCanopy((s) => s.doc);
  const focus = useCanopy((s) => s.focus);
  const picked = useCanopy((s) => s.picked);
  const trail = on && picked ? trailOf(doc, focus) : null;
  if (!trail || filterOn) return null;
  return (
    <div className="filter-control trail-control" role="group" aria-label="Trail">
      <span className="trail-label">
        <Icon name="trail" />
        Trail · {trail.levels} up
      </span>
      <div className="segmented" role="group" aria-label="How the Trail shows the way up">
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            aria-pressed={mode === m.value}
            onClick={() => setTrailMode(m.value)}
          >
            {m.label}
          </button>
        ))}
      </div>
      <span className="sr-only" role="status">
        Trail: {trail.levels} {trail.levels === 1 ? 'topic' : 'topics'} up to the Core
      </span>
    </div>
  );
}
