import { keyBetween, spreadKeys } from './order';
import { DEFAULT_PREFS } from './ops';
import { isRecord, readExtras, readFilters, readPlanning, readPrefs } from './sanitize';
import { childrenOf } from './tree';
import {
  SCHEMA,
  type CanopyMap,
  type Filter,
  type MapMeta,
  type MapPrefs,
  type PlanningConfig,
  type Topic,
  type TopicExtras,
  type TopicId,
} from './types';

/** File form (spec section 8): the same data as the in-memory map, nested for readability. */
export interface FileTopic extends TopicExtras {
  id: TopicId;
  title: string;
  folded?: boolean;
  children: FileTopic[];
}

export interface CanopyFile {
  schema: typeof SCHEMA;
  meta: MapMeta;
  prefs: MapPrefs;
  planning?: PlanningConfig;
  filters?: Filter[];
  core: FileTopic;
}

export type ParseResult = { ok: true; map: CanopyMap } | { ok: false; errors: string[] };

const MAX_ERRORS = 20;

function extrasOf(topic: Topic): TopicExtras {
  const out: TopicExtras = {};
  if (topic.note) out.note = topic.note;
  if (topic.stickers?.length) out.stickers = topic.stickers;
  if (topic.props && Object.keys(topic.props).length > 0) out.props = topic.props;
  if (topic.edge && (topic.edge.label || topic.edge.stickers?.length)) out.edge = topic.edge;
  return out;
}

export function toFile(map: CanopyMap): CanopyFile {
  const nodes = new Map<TopicId, FileTopic>();
  const stack: TopicId[] = [map.coreId];
  let core: FileTopic | undefined;
  while (stack.length > 0) {
    const id = stack.pop();
    const topic = id === undefined ? undefined : map.topics[id];
    if (!topic) continue;
    const node: FileTopic = { id: topic.id, title: topic.title, ...extrasOf(topic), children: [] };
    if (topic.folded) node.folded = true;
    nodes.set(topic.id, node);
    if (topic.parentId === null) core = node;
    else nodes.get(topic.parentId)?.children.push(node);
    const kids = childrenOf(map, topic.id);
    for (let i = kids.length - 1; i >= 0; i--) {
      const kid = kids[i];
      if (kid) stack.push(kid.id);
    }
  }
  if (!core) throw new Error('Map has no Core');
  const file: CanopyFile = { schema: SCHEMA, meta: { ...map.meta }, prefs: { ...map.prefs }, core };
  if (map.planning) file.planning = map.planning;
  if (map.filters?.length) file.filters = map.filters;
  return file;
}

export function stringifyFile(map: CanopyMap): string {
  return JSON.stringify(toFile(map), null, 2);
}

export function parseJson(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    const detail = error instanceof Error ? `: ${error.message}` : '';
    return { ok: false, errors: [`This is not valid JSON${detail}`] };
  }
  return parseFile(raw);
}

/** Upgrades older file versions. Only `canopy/1` exists so far. */
function migrate(raw: Record<string, unknown>): Record<string, unknown> | string {
  if (raw['schema'] !== SCHEMA) {
    return `Unsupported file format "${String(raw['schema'])}". Expected "${SCHEMA}".`;
  }
  return raw;
}

export function parseFile(raw: unknown): ParseResult {
  if (!isRecord(raw)) return { ok: false, errors: ['The file must contain a JSON object'] };
  const migrated = migrate(raw);
  if (typeof migrated === 'string') return { ok: false, errors: [migrated] };

  const errors: string[] = [];
  const fail = (message: string) => {
    if (errors.length < MAX_ERRORS) errors.push(message);
  };
  const now = new Date().toISOString();

  const metaRaw = migrated['meta'];
  const meta: MapMeta = { title: 'Untitled map', created: now, modified: now };
  if (metaRaw !== undefined) {
    if (!isRecord(metaRaw)) fail('meta must be an object');
    else {
      for (const key of ['title', 'created', 'modified'] as const) {
        const value = metaRaw[key];
        if (value === undefined) continue;
        if (typeof value === 'string') meta[key] = value;
        else fail(`meta.${key} must be a string`);
      }
    }
  }

  const prefs = readPrefs(migrated['prefs'], DEFAULT_PREFS, fail);
  const planning = readPlanning(migrated['planning'], fail);
  const filters = readFilters(migrated['filters'], fail);

  const topics: Record<TopicId, Topic> = {};
  let coreId: TopicId | null = null;
  if (!isRecord(migrated['core'])) {
    fail('core must be an object');
  } else {
    interface Pending {
      raw: Record<string, unknown>;
      path: string;
      parentId: TopicId | null;
      orderKey: string;
    }
    const stack: Pending[] = [
      { raw: migrated['core'], path: 'core', parentId: null, orderKey: keyBetween(null, null) },
    ];
    while (stack.length > 0) {
      const entry = stack.pop();
      if (!entry) break;
      const { raw: node, path, parentId, orderKey } = entry;

      const id = node['id'];
      if (typeof id !== 'string' || id.length === 0) {
        fail(`${path}.id must be a non-empty string`);
        continue;
      }
      if (topics[id]) {
        fail(`${path}.id "${id}" is used more than once`);
        continue;
      }
      if (typeof node['title'] !== 'string') fail(`${path}.title must be a string`);
      const folded = node['folded'];
      if (folded !== undefined && typeof folded !== 'boolean') {
        fail(`${path}.folded must be true or false`);
      }
      const children = node['children'] ?? [];
      if (!Array.isArray(children)) {
        fail(`${path}.children must be a list`);
        continue;
      }

      topics[id] = {
        id,
        parentId,
        orderKey,
        title: typeof node['title'] === 'string' ? node['title'] : '',
        folded: folded === true && children.length > 0,
        ...readExtras(node, path, fail),
      };
      if (parentId === null) coreId = id;

      const keys = spreadKeys(children.length);
      children.forEach((child: unknown, i) => {
        const childPath = `${path}.children[${i}]`;
        if (!isRecord(child)) {
          fail(`${childPath} must be an object`);
          return;
        }
        stack.push({ raw: child, path: childPath, parentId: id, orderKey: keys[i] ?? 'V' });
      });
    }
  }

  if (errors.length > 0 || coreId === null) {
    return { ok: false, errors: errors.length > 0 ? errors : ['The file has no Core topic'] };
  }

  const map: CanopyMap = { schema: SCHEMA, meta, prefs, coreId, topics };
  if (planning) map.planning = planning;
  if (filters) map.filters = filters;
  return { ok: true, map };
}
