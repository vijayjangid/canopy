import {
  MAX_EDGE_LABEL,
  MAX_IMAGE_ALT,
  MAX_IMAGE_CHARS,
  MAX_IMAGE_SIDE,
  MAX_EDGE_STICKERS,
  type EdgeData,
  type Density,
  type Flow,
  type Filter,
  type FilterQuery,
  type Look,
  type MapPrefs,
  type PlanningConfig,
  type StatusCategory,
  type StatusDef,
  type StickerRef,
  type TagDef,
  type TopicExtras,
  type TopicImage,
  type TopicProps,
} from './types';

export type Fail = (message: string) => void;

const FLOWS: readonly Flow[] = ['right', 'down'];
const DENSITIES: readonly Density[] = ['compact', 'comfortable', 'airy'];
const LOOKS: readonly Look[] = ['minimal', 'contrast', 'playful'];
const CHIPS: readonly MapPrefs['chips'][] = ['off', 'compact', 'full'];
const CATEGORIES: readonly StatusCategory[] = ['todo', 'active', 'complete', 'canceled'];

const MAX_NOTE = 100_000;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const COLOR = /^#[0-9a-fA-F]{3,8}$/;

export const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isString = (v: unknown): v is string => typeof v === 'string';
const strings = (v: unknown): string[] | null =>
  Array.isArray(v) && v.every(isString) ? (v as string[]) : null;

const IMAGE_SRC = /^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/;

/** A pasted picture, only if it is an embedded raster image of a sensible size. Never a link or SVG. */
export function readImage(raw: unknown): TopicImage | undefined {
  if (!isRecord(raw)) return undefined;
  const { src, w, h, alt } = raw;
  if (!isString(src) || src.length > MAX_IMAGE_CHARS || !IMAGE_SRC.test(src)) return undefined;
  const side = (v: unknown) =>
    typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= MAX_IMAGE_SIDE * 2;
  if (!side(w) || !side(h)) return undefined;
  const text = isString(alt) ? alt.replace(/\s+/g, ' ').trim().slice(0, MAX_IMAGE_ALT) : '';
  return { src, w: w as number, h: h as number, ...(text ? { alt: text } : {}) };
}

/** A sticker is on a topic or line once, so older files with repeats keep the first of each. */
function onePerKind(list: readonly StickerRef[]): StickerRef[] {
  const seen = new Set<string>();
  return list.filter((s) => (seen.has(s.key) ? false : (seen.add(s.key), true)));
}

/** Only web and mail addresses, never `javascript:` and friends. */
export function isSafeLink(ref: string): boolean {
  return /^(https?:|mailto:)/i.test(ref);
}

function oneOf<T extends string>(value: unknown, list: readonly T[]): T | undefined {
  return list.includes(value as T) ? (value as T) : undefined;
}

export function readPrefs(raw: unknown, base: MapPrefs, fail: Fail): MapPrefs {
  const prefs = { ...base };
  if (raw === undefined) return prefs;
  if (!isRecord(raw)) {
    fail('prefs must be an object');
    return prefs;
  }
  const pick = <K extends keyof MapPrefs>(key: K, list: readonly MapPrefs[K][]) => {
    const value = raw[key];
    if (value === undefined) return;
    const ok = oneOf(value as string, list as readonly string[]);
    if (ok) prefs[key] = ok as MapPrefs[K];
    else fail(`prefs.${key} must be one of: ${list.join(', ')}`);
  };
  pick('flow', FLOWS);
  pick('density', DENSITIES);
  pick('look', LOOKS);
  pick('chips', CHIPS);
  if (raw['showLevels'] !== undefined) {
    if (typeof raw['showLevels'] === 'boolean') prefs.showLevels = raw['showLevels'];
    else fail('prefs.showLevels must be true or false');
  }
  return prefs;
}

function readProps(raw: unknown, path: string, fail: Fail): TopicProps | undefined {
  if (raw === undefined) return undefined;
  if (!isRecord(raw)) {
    fail(`${path} must be an object`);
    return undefined;
  }
  const props: TopicProps = {};
  if (isString(raw['status'])) props.status = raw['status'];
  const tags = strings(raw['tags']);
  if (tags && tags.length > 0) props.tags = tags;
  if (isRecord(raw['due'])) {
    const due: NonNullable<TopicProps['due']> = {};
    for (const key of ['start', 'end'] as const) {
      const value = raw['due'][key];
      if (isString(value) && DATE.test(value)) due[key] = value;
      else if (value !== undefined) fail(`${path}.due.${key} must look like 2026-11-01`);
    }
    if (due.start || due.end) props.due = due;
  }
  return Object.keys(props).length > 0 ? props : undefined;
}

/** The optional parts of a topic. Bad pieces are reported and left out. */
export function readExtras(node: Record<string, unknown>, path: string, fail: Fail): TopicExtras {
  const out: TopicExtras = {};
  if (node['note'] !== undefined) {
    if (isString(node['note'])) {
      if (node['note'].length > 0) out.note = node['note'].slice(0, MAX_NOTE);
    } else fail(`${path}.note must be a string`);
  }

  if (node['stickers'] !== undefined) {
    if (!Array.isArray(node['stickers'])) fail(`${path}.stickers must be a list`);
    else {
      const list: StickerRef[] = [];
      for (const s of node['stickers'] as unknown[]) {
        if (isRecord(s) && isString(s['id']) && isString(s['key'])) {
          list.push({ id: s['id'], key: s['key'] });
        }
      }
      const once = onePerKind(list);
      if (once.length > 0) out.stickers = once;
    }
  }

  if (node['edge'] !== undefined) {
    if (!isRecord(node['edge'])) fail(`${path}.edge must be an object`);
    else {
      const edge: EdgeData = {};
      const label = node['edge']['label'];
      if (isString(label) && label.trim() !== '') edge.label = label.slice(0, MAX_EDGE_LABEL);
      const stickers = node['edge']['stickers'];
      if (Array.isArray(stickers)) {
        const list: StickerRef[] = [];
        for (const s of stickers as unknown[]) {
          if (isRecord(s) && isString(s['id']) && isString(s['key'])) {
            list.push({ id: s['id'], key: s['key'] });
          }
        }
        const once = onePerKind(list).slice(0, MAX_EDGE_STICKERS);
        if (once.length > 0) edge.stickers = once;
      }
      if (edge.label || edge.stickers) out.edge = edge;
    }
  }

  // Older files hold one reference as `referenceTo`. Both forms are read as a list.
  const refs: string[] = [];
  if (node['referenceTo'] !== undefined) {
    if (isString(node['referenceTo']) && node['referenceTo'].length > 0) {
      refs.push(node['referenceTo']);
    } else fail(`${path}.referenceTo must be a non-empty topic id`);
  }
  if (node['references'] !== undefined) {
    const list = node['references'];
    if (Array.isArray(list) && list.every((r) => isString(r) && r.length > 0)) {
      refs.push(...(list as string[]));
    } else fail(`${path}.references must be a list of topic ids`);
  }
  const unique = [...new Set(refs)];
  if (unique.length > 0) out.references = unique;

  if (node['image'] !== undefined) {
    const image = readImage(node['image']);
    if (image) out.image = image;
    else fail(`${path}.image must be an embedded PNG, JPEG, WebP or GIF picture`);
  }

  const props = readProps(node['props'], `${path}.props`, fail);
  if (props) out.props = props;
  return out;
}

export function readPlanning(raw: unknown, fail: Fail): PlanningConfig | undefined {
  if (raw === undefined) return undefined;
  if (!isRecord(raw)) {
    fail('planning must be an object');
    return undefined;
  }
  const statusSet: StatusDef[] = [];
  for (const s of Array.isArray(raw['statusSet']) ? (raw['statusSet'] as unknown[]) : []) {
    const category = isRecord(s) ? oneOf(s['category'], CATEGORIES) : undefined;
    if (isRecord(s) && isString(s['key']) && isString(s['label']) && category) {
      statusSet.push({
        key: s['key'],
        label: s['label'],
        category,
        ...(s['flagged'] === true ? { flagged: true } : {}),
      });
    } else fail('planning.statusSet entries need a key, label and category');
  }
  const tags: TagDef[] = [];
  for (const t of Array.isArray(raw['tags']) ? (raw['tags'] as unknown[]) : []) {
    if (isRecord(t) && isString(t['key']) && isString(t['label'])) {
      tags.push({
        key: t['key'],
        label: t['label'],
        color: isString(t['color']) && COLOR.test(t['color']) ? t['color'] : '#5b4bdb',
      });
    }
  }
  return { statusSet, tags } satisfies PlanningConfig;
}

function readQuery(raw: unknown): FilterQuery {
  const q: FilterQuery = {};
  if (!isRecord(raw)) return q;
  const status = strings(raw['status']);
  if (status) q.status = status;
  const tags = strings(raw['tags']);
  if (tags) q.tags = tags;
  const stickers = strings(raw['stickers']);
  if (stickers) q.stickers = stickers;
  if (typeof raw['text'] === 'string' && raw['text'].trim()) q.text = raw['text'].trim();
  const cats = strings(raw['statusCategory'])?.filter((c): c is StatusCategory =>
    CATEGORIES.includes(c as StatusCategory),
  );
  if (cats) q.statusCategory = cats;
  if (raw['due'] === 'overdue' || raw['due'] === 'week') q.due = raw['due'];
  if (raw['match'] === 'any' || raw['match'] === 'all') q.match = raw['match'];
  return q;
}

export function readFilters(raw: unknown, fail: Fail): Filter[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) {
    fail('filters must be a list');
    return undefined;
  }
  const filters: Filter[] = [];
  for (const l of raw as unknown[]) {
    if (isRecord(l) && isString(l['id']) && isString(l['name'])) {
      filters.push({
        id: l['id'],
        name: l['name'],
        mode: l['mode'] === 'isolate' ? 'isolate' : 'dim',
        query: readQuery(l['query']),
      });
    }
  }
  return filters;
}
