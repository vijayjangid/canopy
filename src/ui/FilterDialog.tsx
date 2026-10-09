import { useCallback } from 'react';
import { planningOf, usedStickers } from '../model';
import { STICKERS } from '../stickers/catalog';
import { canopyStore } from '../store';
import type { PaletteEntry } from './commandIndex';
import { Palette } from './Palette';
import { setFilter, setFilterMode, toggleFilterChoice, toggleFilterDue, uiStore } from './uiStore';

/** Tick or untick Filter choices, or change how matches show. */
export function FilterDialog() {
  const source = useCallback((): PaletteEntry[] => {
    const { doc } = canopyStore.getState();
    const { filterSel: sel } = uiStore.getState();
    const plan = planningOf(doc);
    const out: PaletteEntry[] = [];
    const add = (id: string, label: string, group: string, run: () => void, on = false) =>
      out.push({ id, label: on ? `${label} (on)` : label, group, keys: [], run });

    add(
      'due:overdue',
      'Overdue',
      'Due date',
      () => toggleFilterDue('overdue'),
      sel.due === 'overdue',
    );
    add('due:week', 'Due this week', 'Due date', () => toggleFilterDue('week'), sel.due === 'week');
    for (const s of plan.statusSet) {
      add(
        `status:${s.key}`,
        s.label,
        'Status',
        () => toggleFilterChoice('status', s.key),
        sel.status.includes(s.key),
      );
    }
    for (const t of plan.tags) {
      add(
        `tag:${t.key}`,
        `#${t.label}`,
        'Tag',
        () => toggleFilterChoice('tags', t.key),
        sel.tags.includes(t.key),
      );
    }
    const used = usedStickers(doc);
    for (const s of STICKERS.filter((st) => used.has(st.key))) {
      add(
        `sticker:${s.key}`,
        s.name,
        'Sticker',
        () => toggleFilterChoice('stickers', s.key),
        sel.stickers.includes(s.key),
      );
    }
    add('mode:dim', 'Show matches: highlight them, dim the rest', 'Mode', () =>
      setFilterMode('dim'),
    );
    add('mode:isolate', 'Show matches: hide the rest', 'Mode', () => setFilterMode('isolate'));
    add('filter:off', 'Turn the Filter off', 'Filter', () => setFilter(null));
    return out;
  }, []);

  return (
    <Palette
      title="Filter"
      placeholder="Choose a Filter"
      source={source}
      remember={false}
      immediate
    />
  );
}
