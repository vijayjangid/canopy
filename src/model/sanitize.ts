import {
  MAX_EDGE_LABEL,
  MAX_EDGE_STICKERS,
  type ConnectorStyle,
  type EdgeData,
  type Density,
  type Flow,
  type Filter,
  type FilterQuery,
  type FontSize,
  type Look,
  type MapPrefs,
  type PlanningConfig,
  type StatusCategory,
  type StatusDef,
  type StickerRef,
  type TagDef,
  type TopicExtras,
  type TopicProps,
  type Voice,
} from './types';

export type Fail = (message: string) => void;

const FLOWS: readonly Flow[] = ['right', 'down'];
const DENSITIES: readonly Density[] = ['compact', 'comfortable', 'airy'];
const LOOKS: readonly Look[] = ['minimal', 'contrast', 'playful'];
const FONT_SIZES: readonly FontSize[] = ['small', 'medium', 'large'];
const VOICES: readonly Voice[] = ['clean', 'editorial', 'mono', 'sketch'];
const CONNECTORS: readonly ConnectorStyle[] = ['curved', 'elbow', 'straight', 'tapered'];
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
  pick('voice', VOICES);
  pick('fontSize', FONT_SIZES);
  pick('connector', CONNECTORS);
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
      if (list.length > 0) out.stickers = list;
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
        if (list.length > 0) edge.stickers = list.slice(0, MAX_EDGE_STICKERS);
      }
      if (edge.label || edge.stickers) out.edge = edge;
    }
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
