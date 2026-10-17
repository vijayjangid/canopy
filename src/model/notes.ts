import { produce } from 'immer';
import { getTopic } from './tree';
import { MAX_TOPIC_NOTE, type CanopyMap, type TopicId } from './types';

/** Sets a topic's Markdown note. A blank note removes it from the file. */
export function setTopicNote(map: CanopyMap, id: TopicId, text: string): CanopyMap {
  const topic = getTopic(map, id);
  const clean = text.replace(/\r\n?/g, '\n').slice(0, MAX_TOPIC_NOTE);
  const next = clean.trim() ? clean : undefined;
  if (topic.note === next) return map;
  return produce(map, (draft) => {
    const target = draft.topics[id];
    if (!target) return;
    if (next === undefined) delete target.note;
    else target.note = next;
  });
}
