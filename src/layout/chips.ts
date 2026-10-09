import type { MapPrefs, Topic } from '../model';

/** Small marks shown on a row under a topic's title. Widths are fixed, so measuring needs only the topic. */
export type ChipItem =
  | { kind: 'status'; key: string; x: number; w: number }
  | { kind: 'due'; date: string; x: number; w: number }
  /** `keys` are the tags drawn; `more` is how many did not fit. */
  | { kind: 'tags'; keys: string[]; more: number; x: number; w: number }
  | { kind: 'note'; x: number; w: number };

export type ChipMode = MapPrefs['chips'];

export const CHIP_ROW_HEIGHT = 20;
const GAP = 8;
const TAG_DOT = 10;
const TAG_PILL = 58;
const TAG_GAP = 4;
const MORE_W = 46;
/** The row stops growing wider than this, so a Full row shows what fits and counts the rest. */
const MAX_ROW = 240;

let mode: ChipMode = 'compact';
let cache = new WeakMap<Topic, ChipItem[]>();

/** Chip density for measuring. Callers must measure again after changing it. */
export function setChipMode(next: ChipMode): void {
  if (next === mode) return;
  mode = next;
  cache = new WeakMap();
}

export const getChipMode = (): ChipMode => mode;

type Unplaced = ChipItem extends infer T ? (T extends unknown ? Omit<T, 'x'> : never) : never;

const NONE: ChipItem[] = [];

/** Chips for a topic in the current density, left to right. */
export function chipItems(topic: Topic): ChipItem[] {
  if (mode === 'off') return NONE;
  const hit = cache.get(topic);
  if (hit) return hit;

  const props = topic.props;
  const full = mode === 'full';
  const list: Unplaced[] = [];
  if (props?.status) list.push({ kind: 'status', key: props.status, w: full ? 84 : 16 });
  const date = props?.due?.end ?? props?.due?.start;
  if (date) list.push({ kind: 'due', date, w: 58 });
  const noteW = topic.note ? 14 + GAP : 0;
  if (props?.tags?.length) {
    const all = props.tags;
    if (!full) {
      // Dots are small, so every tag gets one.
      list.push({
        kind: 'tags',
        keys: all,
        more: 0,
        w: all.length * TAG_DOT + (all.length - 1) * TAG_GAP,
      });
    } else {
      const used = list.reduce((sum, item) => sum + item.w + GAP, 0);
      const room = MAX_ROW - used - noteW;
      const pills = (k: number) => k * TAG_PILL + (k - 1) * TAG_GAP;
      let shown = all.length;
      while (shown > 1 && pills(shown) + (shown < all.length ? TAG_GAP + MORE_W : 0) > room)
        shown--;
      const more = all.length - shown;
      list.push({
        kind: 'tags',
        keys: all.slice(0, shown),
        more,
        w: pills(shown) + (more > 0 ? TAG_GAP + MORE_W : 0),
      });
    }
  }
  if (topic.note) list.push({ kind: 'note', w: 14 });

  let x = 0;
  const placed = list.map((item) => {
    const out = { ...item, x } as ChipItem;
    x += item.w + GAP;
    return out;
  });
  const result = placed.length > 0 ? placed : NONE;
  cache.set(topic, result);
  return result;
}

export function chipRowWidth(items: readonly ChipItem[]): number {
  const last = items.at(-1);
  return last ? last.x + last.w : 0;
}

export interface TopicRows {
  chips: readonly ChipItem[];
  /** Height the chips add under the title. */
  total: number;
}

/** The row under a topic's title. */
export function topicRows(topic: Topic): TopicRows {
  const chips = chipItems(topic);
  return { chips, total: chips.length > 0 ? CHIP_ROW_HEIGHT : 0 };
}
