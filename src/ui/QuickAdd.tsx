import { useCallback } from 'react';
import { useStore } from 'zustand';
import { canopyStore } from '../store';
import { Palette } from './Palette';
import { buildQuickEntries } from './quickEntries';
import { quickAddStore } from './uiStore';

/** Set Properties on the selected topics, from the keyboard. */
export function QuickAdd() {
  const preset = useStore(quickAddStore, (s) => s.preset);
  const source = useCallback(
    (query: string) => buildQuickEntries(canopyStore.getState().doc, query, preset),
    [preset],
  );
  const placeholder =
    preset === 'status'
      ? 'Set status'
      : preset === 'due'
        ? 'Set a due date (try fri, +3d, nov 1)'
        : preset === 'tag'
          ? 'Add a tag'
          : 'Set status, due date or tag';
  return (
    <Palette
      title="Quick add"
      placeholder={placeholder}
      source={source}
      remember={false}
      immediate
    />
  );
}
