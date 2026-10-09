import { produce } from 'immer';
import { newId } from './ids';
import { getTopic } from './tree';
import {
  type CanopyMap,
  type PlanningConfig,
  type StatusDef,
  type TagDef,
  type TopicId,
  type TopicProps,
} from './types';

/** The Status Set a map starts with. Maps store their own copy once it is edited. */
export const DEFAULT_STATUS_SET: readonly StatusDef[] = [
  { key: 'todo', label: 'Not started', category: 'todo' },
  { key: 'doing', label: 'In progress', category: 'active' },
  { key: 'blocked', label: 'Blocked', category: 'active', flagged: true },
  { key: 'review', label: 'In review', category: 'active' },
  { key: 'done', label: 'Done', category: 'complete' },
  { key: 'canceled', label: 'Canceled', category: 'canceled' },
];

export const DEFAULT_PLANNING: PlanningConfig = {
  statusSet: DEFAULT_STATUS_SET.map((s) => ({ ...s })),
  tags: [],
};

export const planningOf = (map: CanopyMap): PlanningConfig => map.planning ?? DEFAULT_PLANNING;

export const statusDef = (map: CanopyMap, key: string | undefined): StatusDef | undefined =>
  key === undefined ? undefined : planningOf(map).statusSet.find((s) => s.key === key);

export const tagDef = (map: CanopyMap, key: string): TagDef | undefined =>
  planningOf(map).tags.find((t) => t.key === key);

// ---------- Properties ----------

export interface PropsPatch {
  /** A key from the Status Set, or null to clear. */
  status?: string | null;
  due?: { start?: string | null; end?: string | null } | null;
  /** Replaces the topic's tag list. */
  tags?: string[] | null;
}

function applyPatch(props: TopicProps, patch: PropsPatch): TopicProps {
  const next: TopicProps = { ...props };
  if (patch.status !== undefined) {
    if (patch.status === null) delete next.status;
    else next.status = patch.status;
  }
  if (patch.due !== undefined) {
    if (patch.due === null) delete next.due;
    else {
      const due = { ...next.due };
      for (const key of ['start', 'end'] as const) {
        const value = patch.due[key];
        if (value === null) delete due[key];
        else if (value !== undefined) due[key] = value;
      }
      if (due.start || due.end) next.due = due;
      else delete next.due;
    }
  }
  if (patch.tags !== undefined) {
    if (patch.tags === null || patch.tags.length === 0) delete next.tags;
    else next.tags = [...new Set(patch.tags)];
  }
  return next;
}

/** Changes Properties on several topics at once. Empty Properties are removed. */
export function setProps(map: CanopyMap, ids: readonly TopicId[], patch: PropsPatch): CanopyMap {
  for (const id of ids) getTopic(map, id);
  return produce(map, (draft) => {
    for (const id of ids) {
      const topic = draft.topics[id];
      if (!topic) continue;
      const props = applyPatch(topic.props ?? {}, patch);
      if (Object.keys(props).length === 0) delete topic.props;
      else topic.props = props;
    }
  });
}

// ---------- Status Set and tags ----------

const TAG_COLORS = [
  '#5b4bdb',
  '#0b7285',
  '#237a35',
  '#c2410c',
  '#c2255c',
  '#1971c2',
  '#9c36b5',
  '#a61e4d',
];

/** Finds a tag by key or label, or adds it. */
export function ensureTag(map: CanopyMap, label: string): { map: CanopyMap; key: string } {
  const wanted = label.trim().toLowerCase();
  const tags = planningOf(map).tags;
  const hit = tags.find((t) => t.key === wanted || t.label.toLowerCase() === wanted);
  if (hit) return { map, key: hit.key };
  const key = wanted.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || newId('g_');
  const tag: TagDef = {
    key,
    label: label.trim(),
    color: TAG_COLORS[tags.length % TAG_COLORS.length] ?? '#5b4bdb',
  };
  return {
    key,
    map: produce(map, (draft) => {
      const base = draft.planning ?? {
        statusSet: DEFAULT_PLANNING.statusSet.map((s) => ({ ...s })),
        tags: [],
      };
      draft.planning = { ...base, tags: [...base.tags, tag] };
    }),
  };
}

/** Changes a tag's name or colour. */
export function updateTag(
  map: CanopyMap,
  key: string,
  patch: Partial<Omit<TagDef, 'key'>>,
): CanopyMap {
  return produce(map, (draft) => {
    const tag = draft.planning?.tags.find((t) => t.key === key);
    if (tag) Object.assign(tag, patch);
  });
}

/** Deletes a tag and takes it off every topic. */
export function removeTag(map: CanopyMap, key: string): CanopyMap {
  return produce(map, (draft) => {
    if (draft.planning) draft.planning.tags = draft.planning.tags.filter((t) => t.key !== key);
    for (const t of Object.values(draft.topics)) {
      if (!t.props?.tags?.includes(key)) continue;
      t.props.tags = t.props.tags.filter((k) => k !== key);
      if (t.props.tags.length === 0) delete t.props.tags;
      if (Object.keys(t.props).length === 0) delete t.props;
    }
  });
}
