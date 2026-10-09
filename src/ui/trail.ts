import { useMemo } from 'react';
import { ancestorsOf, childrenOf, selectionQuery, type CanopyMap } from '../model';
import { useSettings } from '../settings';
import { useCanopy } from '../store';
import { useUi, type TrailMode } from './uiStore';

/** The way up from the focused topic to the Core. */
export interface Trail {
  mode: Exclude<TrailMode, 'none'>;
  /** The topics above the focus, up to the Core. */
  nodes: ReadonlySet<string>;
  /** The lines on the way, named by the topic each one leads down to. */
  links: ReadonlySet<string>;
  /** The way up plus the focus and what is open under it, to keep when isolating. */
  keep: ReadonlySet<string>;
  /** How many topics sit above the focus. */
  levels: number;
}

/** The trail for `focus`, or null for the Core, which has nothing above it. */
export function trailOf(doc: CanopyMap, focus: string): Omit<Trail, 'mode'> | null {
  if (!doc.topics[focus] || focus === doc.coreId) return null;
  const above = ancestorsOf(doc, focus).map((t) => t.id);
  const nodes = new Set(above);
  const links = new Set([focus, ...above.filter((id) => id !== doc.coreId)]);
  const keep = new Set([...above, focus]);
  const stack = doc.topics[focus]?.folded ? [] : [focus];
  while (stack.length > 0) {
    const id = stack.pop();
    if (id === undefined) break;
    for (const child of childrenOf(doc, id)) {
      keep.add(child.id);
      if (!child.folded) stack.push(child.id);
    }
  }
  return { nodes, links, keep, levels: above.length };
}

/** True while a Filter is ticked, which has the map's dimming to itself. */
export function useFilterOn(): boolean {
  return useUi((s) => selectionQuery(s.filterSel) !== null);
}

/** The Trail for the focused topic, when the Trail is turned on. */
export function useTrail(): Trail | null {
  const on = useSettings((s) => s.trail);
  const mode = useUi((s) => s.trailMode);
  const filterOn = useFilterOn();
  const doc = useCanopy((s) => s.doc);
  const focus = useCanopy((s) => s.focus);
  const picked = useCanopy((s) => s.picked);
  return useMemo(() => {
    if (!on || mode === 'none' || !picked) return null;
    const trail = trailOf(doc, focus);
    // A Filter does its own dimming, so the Trail only marks the way beside it.
    return trail ? { ...trail, mode: filterOn ? 'highlight' : mode } : null;
    // The topic table changes on every edit; the rest of the map does not affect the way up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, mode, filterOn, doc.topics, focus, picked]);
}
