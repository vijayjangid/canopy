import { pasteBranches, type Branch } from './clipboard';
import { renameTopic } from './ops';
import { applyTitleTokens } from './tokens';
import type { CanopyMap, TopicId } from './types';

/** A title that starts with this is typed as a short outline, and expands when it is finished. */
export const EXPAND_PREFIX = '!!';
/** Most topics one expansion makes, so a stray paste cannot flood the map. */
export const MAX_EXPANDED = 200;

export const isExpansion = (title: string): boolean => title.trimStart().startsWith(EXPAND_PREFIX);

export interface Expansion {
  /** The topics at the top, in order. Each can start a chain of children. */
  branches: Branch[];
  /** How many topics it makes, counting the one that was typed in. */
  count: number;
}

/**
 * Reads `!!a>b>c, d` or the same over several lines. A comma or a new line starts a sibling, and
 * `>` makes the next name a child of the one before it. Returns null when nothing follows the `!!`.
 */
export function parseExpansion(title: string): Expansion | null {
  if (!isExpansion(title)) return null;
  const body = title.trimStart().slice(EXPAND_PREFIX.length);
  const branches: Branch[] = [];
  let count = 0;

  for (const segment of body.split(/[,\n]/)) {
    const names = segment
      .split('>')
      .map((n) => n.trim())
      .filter(Boolean)
      .slice(0, MAX_EXPANDED - count);
    if (names.length === 0) continue;
    // Build the chain from the last name up, so each name holds the next as its child.
    let chain: Branch | null = null;
    for (let i = names.length - 1; i >= 0; i--) {
      chain = { title: names[i] ?? '', children: chain ? [chain] : [] };
    }
    if (chain) branches.push(chain);
    count += names.length;
    if (count >= MAX_EXPANDED) break;
  }
  return branches.length > 0 ? { branches, count } : null;
}

export interface Expanded {
  map: CanopyMap;
  /** The last topic at the top level, where the person carries on from. */
  focus: TopicId;
  count: number;
}

/**
 * Expands the title of a topic. The topic takes the first name, its children go below it, and the
 * other names follow as its peers. The Core has no peers, so it is left alone.
 */
export function expandTopicTitle(
  map: CanopyMap,
  id: TopicId,
  now: Date = new Date(),
): Expanded | null {
  const topic = map.topics[id];
  if (!topic || topic.parentId === null) return null;
  const parsed = parseExpansion(topic.title);
  const [first, ...rest] = parsed?.branches ?? [];
  if (!parsed || !first) return null;

  let next = renameTopic(map, id, first.title);
  let focus = id;
  if (first.children.length > 0) {
    next = pasteBranches(next, first.children, { kind: 'child', parentId: id }).map;
  }
  if (rest.length > 0) {
    const pasted = pasteBranches(next, rest, { kind: 'after', siblingId: id });
    next = pasted.map;
    focus = pasted.ids.at(-1) ?? id;
  }

  // Each name can carry `#tag`, `/status` and `^date`, like any title.
  const made = Object.keys(next.topics).filter((t) => t === id || !map.topics[t]);
  for (const made_id of made) {
    const applied = applyTitleTokens(next, made_id, now);
    if (applied) next = applied.map;
  }
  return { map: next, focus, count: parsed.count };
}
