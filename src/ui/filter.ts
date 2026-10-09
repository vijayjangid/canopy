import { useMemo } from 'react';
import {
  evaluateFilter,
  selectionName,
  selectionQuery,
  today,
  type CanopyMap,
  type Filter,
  type FilterResult,
  type FilterSelection,
} from '../model';
import { useCanopy } from '../store';
import { useUi } from './uiStore';

export interface ActiveFilter {
  filter: Filter;
  result: FilterResult;
  /** Matches and the topics on the way to them, to keep in view or leave undimmed. */
  paths: ReadonlySet<string>;
  mode: 'dim' | 'isolate';
}

/** Runs the ticked choices. Null when nothing is picked. */
export function runFilter(
  doc: CanopyMap,
  selection: FilterSelection,
  mode: 'dim' | 'isolate',
  day: string = today(),
): ActiveFilter | null {
  const query = selectionQuery(selection);
  if (!query) return null;
  const filter: Filter = { id: 'selection', name: selectionName(doc, selection), mode, query };
  const result = evaluateFilter(doc, query, { today: day });
  return { filter, result, paths: result.paths, mode };
}

/** The Filter that is on, as it applies to the current map. */
export function useActiveFilter(): ActiveFilter | null {
  const doc = useCanopy((s) => s.doc);
  const selection = useUi((s) => s.filterSel);
  const mode = useUi((s) => s.filterMode);
  return useMemo(() => runFilter(doc, selection, mode), [doc, selection, mode]);
}
