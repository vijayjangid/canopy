import { announce } from '../a11y';
import { applyTitleTokens, expandTopicTitle, isExpansion, type TopicId } from '../model';
import { settingsStore } from '../settings';
import type { CanopyStore } from '../store';

/**
 * Finishes a title: `!!a>b, c` expands into topics, and shorthand such as `#launch /doing ^fri`
 * becomes Properties. Returns true when it changed the map.
 */
export function convertTitleTokens(
  store: CanopyStore,
  id: TopicId,
  now: Date = new Date(),
): boolean {
  const { doc, commit } = store.getState();
  const topic = doc.topics[id];
  if (!topic) return false;

  if (settingsStore.getState().textExpansion && isExpansion(topic.title)) {
    const expanded = expandTopicTitle(doc, id, now);
    if (expanded) {
      commit(expanded.map, { select: [expanded.focus], focus: expanded.focus });
      announce(`Added ${expanded.count} ${expanded.count === 1 ? 'topic' : 'topics'}`);
      return true;
    }
  }

  const applied = applyTitleTokens(doc, id, now);
  if (!applied) return false;
  commit(applied.map);
  announce(`Set ${applied.labels.join(', ')}`);
  return true;
}
