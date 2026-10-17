export const SCHEMA = 'canopy/1' as const;

export type TopicId = string;

/** Phase 1 supports Right and Down. Left, Both and Radial arrive in M4.3. */
export type Flow = 'right' | 'down';
export type Density = 'compact' | 'comfortable' | 'airy';
export type Look = 'minimal' | 'contrast' | 'playful';
export type ConnectorStyle = 'curved' | 'elbow' | 'straight' | 'tapered';

/** A sticker stuck to a topic. `key` names one of the built-in stickers. */
export interface StickerRef {
  id: string;
  key: string;
}

/** Due date and tags on a topic. Everything is optional, so plain maps stay plain. */
export interface TopicProps {
  /** ISO dates (`2026-11-01`). */
  due?: { start?: string; end?: string };
  /** Tag keys. */
  tags?: string[];
}

/** Longest Markdown note kept on a topic. */
export const MAX_TOPIC_NOTE = 5000;
export type TopicColor =
  'coral' | 'orange' | 'yellow' | 'green' | 'teal' | 'blue' | 'purple' | 'pink' | 'red' | 'indigo';

export interface TopicStyle {
  color?: TopicColor;
}

export const TOPIC_COLOR_PRESETS: Record<TopicColor, { label: string; value: string }> = {
  coral: { label: 'Coral', value: '#fca5a5' },
  orange: { label: 'Orange', value: '#fdba74' },
  yellow: { label: 'Yellow', value: '#fde68a' },
  green: { label: 'Green', value: '#86efac' },
  teal: { label: 'Teal', value: '#0f766e' },
  blue: { label: 'Blue', value: '#93c5fd' },
  purple: { label: 'Purple', value: '#c4b5fd' },
  pink: { label: 'Pink', value: '#f9a8d4' },
  red: { label: 'Red', value: '#b91c1c' },
  indigo: { label: 'Indigo', value: '#4338ca' },
};

export const MAX_EDGE_LABEL = 80;
/** A line has room for fewer stickers than a topic's four corners. */
export const MAX_EDGE_STICKERS = 3;

/** What sits on the line from a topic up to its parent. */
export interface EdgeData {
  /** A short name for the relationship, such as "depends on". */
  label?: string;
  stickers?: StickerRef[];
}

/** Longest side, in pixels, of an image kept on a topic. Larger pictures are scaled down on paste. */
export const MAX_IMAGE_SIDE = 1280;
/** Longest alt text kept for a picture. */
export const MAX_IMAGE_ALT = 200;
/** Longest embedded image text accepted from a file, about 4.5 MB of picture. */
export const MAX_IMAGE_CHARS = 6_000_000;

/** A picture pasted onto a topic, kept inside the map as a data URL so the file stays whole. */
export interface TopicImage {
  /** `data:image/...;base64,...` for a PNG, JPEG, WebP or GIF. */
  src: string;
  /** Size of the stored picture in pixels. */
  w: number;
  h: number;
  /** What the picture shows, for people who cannot see it. */
  alt?: string;
}

/** Optional content a topic can carry beyond its title. */
export interface TopicExtras {
  /** Optional color override. */
  style?: TopicStyle;
  /** Markdown shown as a preview under the title. */
  note?: string;
  /** The line to the parent: its label and stickers. */
  edge?: EdgeData;
  /** Non-hierarchical links to other topics in this map, in the order they were made. */
  references?: TopicId[];
  /** A picture shown above the title. */
  image?: TopicImage;
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

export interface TagDef {
  key: string;
  label: string;
  color: string;
}

export interface PlanningConfig {
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

export interface MapPrefs {
  flow: Flow;
  density: Density;
  showLevels: boolean;
  look: Look;
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
