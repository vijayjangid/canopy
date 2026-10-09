import { announce } from '../a11y';
import {
  ensureTag,
  formatDate,
  parseDateWord,
  planningOf,
  setProps,
  type CanopyMap,
  type PropsPatch,
} from '../model';
import { canopyStore } from '../store';
import type { PaletteEntry } from './commandIndex';

export type QuickPreset = 'all' | 'status' | 'due' | 'tag';

/** Applies a change to every selected topic, and says what happened. */
export function applyToSelection(patch: PropsPatch, say: string): void {
  const { doc, selection, commit } = canopyStore.getState();
  commit(setProps(doc, selection, patch));
  announce(say);
}

function toggleTag(label: string): void {
  const { doc, selection, commit } = canopyStore.getState();
  const tag = ensureTag(doc, label);
  let map = tag.map;
  for (const id of selection) {
    const current = map.topics[id]?.props?.tags ?? [];
    map = setProps(map, [id], { tags: [...new Set([...current, tag.key])] });
  }
  commit(map);
  announce(`Tag ${label}`);
}

/** Everything Quick-Add can set, as palette entries. Typed text also offers a new tag or a date. */
export function buildQuickEntries(
  doc: CanopyMap,
  query: string,
  preset: QuickPreset,
  now: Date = new Date(),
): PaletteEntry[] {
  const out: PaletteEntry[] = [];
  const add = (group: string, id: string, label: string, run: () => void) =>
    out.push({ id, label, group, keys: [], run });

  for (const s of planningOf(doc).statusSet) {
    add('Status', `status:${s.key}`, `Status: ${s.label}`, () =>
      applyToSelection({ status: s.key }, `Status ${s.label}`),
    );
  }
  add('Status', 'status:clear', 'Status: clear', () =>
    applyToSelection({ status: null }, 'Status cleared'),
  );

  const due = (label: string, iso: string) =>
    add('Due date', `due:${iso}`, `Due: ${label} (${formatDate(iso, now)})`, () =>
      applyToSelection({ due: { end: iso } }, `Due ${formatDate(iso, now)}`),
    );
  const names: Record<string, string> = {
    today: 'Today',
    tomorrow: 'Tomorrow',
    eow: 'End of week',
    nextweek: 'Next Monday',
    eom: 'End of month',
  };
  for (const [word, name] of Object.entries(names)) {
    const iso = parseDateWord(word, now);
    if (iso) due(name, iso);
  }
  const typedDate = parseDateWord(query, now);
  if (typedDate) due(query.trim(), typedDate);
  add('Due date', 'due:clear', 'Due: clear', () =>
    applyToSelection({ due: null }, 'Due date cleared'),
  );

  for (const t of planningOf(doc).tags)
    add('Tag', `tag:${t.key}`, `Tag: ${t.label}`, () => toggleTag(t.label));
  const typedTag = query.trim().replace(/^#/, '');
  if (
    typedTag &&
    !planningOf(doc).tags.some((t) => t.label.toLowerCase() === typedTag.toLowerCase())
  ) {
    add('Tag', 'tag:new', `Tag: add “${typedTag}”`, () => toggleTag(typedTag));
  }

  const only: Record<QuickPreset, string | null> = {
    all: null,
    status: 'Status',
    due: 'Due date',
    tag: 'Tag',
  };
  const wanted = only[preset];
  return wanted ? out.filter((e) => e.group === wanted) : out;
}
