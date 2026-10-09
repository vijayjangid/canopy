export const SCHEMA = 'canopy/1' as const;

export type TopicId = string;

/** Phase 1 supports Right and Down. Left, Both and Radial arrive in M4.3. */
export type Flow = 'right' | 'down';
export type Density = 'compact' | 'comfortable' | 'airy';
export type Look = 'minimal' | 'contrast' | 'playful';
export type Voice = 'clean' | 'editorial' | 'mono' | 'sketch';
export type ConnectorStyle = 'curved' | 'elbow' | 'straight' | 'tapered';

/** A sticker stuck to a topic. `key` names one of the built-in stickers. */
export interface StickerRef {
  id: string;
  key: string;
}

export type StatusCategory = 'todo' | 'active' | 'complete' | 'canceled';

/** Status, due date and tags on a topic. Everything is optional, so plain maps stay plain. */
export interface TopicProps {
  /** Key into the map's status set. */
  status?: string;
  /** ISO dates (`2026-11-01`). */
  due?: { start?: string; end?: string };
  /** Tag keys. */
  tags?: string[];
}

export const MAX_EDGE_LABEL = 80;
/** A line has room for fewer stickers than a topic's four corners. */
export const MAX_EDGE_STICKERS = 3;

/** What sits on the line from a topic up to its parent. */
export interface EdgeData {
  /** A short name for the relationship, such as "depends on". */
  label?: string;
  stickers?: StickerRef[];
}

/** Optional content a topic can carry beyond its title. */
export interface TopicExtras {
  /** The line to the parent: its label and stickers. */
  edge?: EdgeData;
  /** Markdown. */
  note?: string;
  stickers?: StickerRef[];
  props?: TopicProps;
}

export interface Topic extends TopicExtras {
  id: TopicId;
  /** Null only for the Core. */
  parentId: TopicId | null;
  /** Fractional key that orders this topic among its siblings (lexicographic). */
  orderKey: string;
  title: string;
  folded: boolean;
}

export interface StatusDef {
  key: string;
  label: string;
  category: StatusCategory;
  /** Draws attention, as for Blocked. */
  flagged?: boolean;
}

export interface TagDef {
  key: string;
  label: string;
  color: string;
}

export interface PlanningConfig {
  statusSet: StatusDef[];
  tags: TagDef[];
}

/** A saved way of looking at the map by its Properties. */
export interface Filter {
  id: string;
  name: string;
  mode: 'dim' | 'isolate';
  query: FilterQuery;
}

export interface FilterQuery {
  /** Match any of these status keys. */
  status?: string[];
  statusCategory?: StatusCategory[];
  /** Match topics with any of these tags. */
  tags?: string[];
  /** Fuzzy text that a topic's title or the label on its line must contain. */
  text?: string;
  /** Match topics, or the line above them, that carry any of these stickers. */
  stickers?: string[];
  /** `overdue` or `week` (due within seven days). */
  due?: 'overdue' | 'week';
  /** Due on or between these dates (`YYYY-MM-DD`). Either end may be left open. */
  dueBetween?: { from?: string; to?: string };
  /** `all` requires every given condition, `any` requires one. */
  match?: 'all' | 'any';
}

export interface MapMeta {
  title: string;
  created: string;
  modified: string;
}

export type FontSize = 'small' | 'medium' | 'large';

export interface MapPrefs {
  flow: Flow;
  density: Density;
  showLevels: boolean;
  look: Look;
  voice: Voice;
  fontSize: FontSize;
  connector: ConnectorStyle;
  /** How many chips a topic shows. */
  chips: 'off' | 'compact' | 'full';
}

/** In-memory form: a normalized topic table. The file form (nested) lives in serialize.ts. */
export interface CanopyMap {
  schema: typeof SCHEMA;
  meta: MapMeta;
  prefs: MapPrefs;
  coreId: TopicId;
  topics: Record<TopicId, Topic>;
  planning?: PlanningConfig;
  filters?: Filter[];
}

export type ModelErrorCode =
  'NOT_FOUND' | 'CORE_IMMUTABLE' | 'CYCLE' | 'DUPLICATE_ID' | 'INVALID_ARGUMENT';

export class ModelError extends Error {
  readonly code: ModelErrorCode;

  constructor(code: ModelErrorCode, message: string) {
    super(message);
    this.name = 'ModelError';
    this.code = code;
  }
}
