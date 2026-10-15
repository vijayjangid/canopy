import { produce } from 'immer';
import { newId } from './ids';
import { getTopic } from './tree';
import { MAX_TOPIC_TASK_TEXT, type CanopyMap, type TopicId } from './types';

/** Adds a short task to a topic. Empty task labels are ignored. */
export function addTopicTask(map: CanopyMap, id: TopicId, text: string): CanopyMap {
  getTopic(map, id);
  const clean = text.replace(/\s+/g, ' ').trim().slice(0, MAX_TOPIC_TASK_TEXT);
  if (!clean) return map;
  const task = { id: newId('task_'), text: clean, done: false };
  return produce(map, (draft) => {
    const target = draft.topics[id];
    if (target) target.tasks = [...(target.tasks ?? []), task];
  });
}

/** Edits a task label while retaining spaces typed before the field loses focus. */
export function setTopicTaskText(
  map: CanopyMap,
  id: TopicId,
  taskId: string,
  text: string,
): CanopyMap {
  const topic = getTopic(map, id);
  const task = topic.tasks?.find((item) => item.id === taskId);
  const clean = text.slice(0, MAX_TOPIC_TASK_TEXT);
  if (!task || task.text === clean) return map;
  return produce(map, (draft) => {
    const target = draft.topics[id]?.tasks?.find((item) => item.id === taskId);
    if (target) target.text = clean;
  });
}

/** Marks a task complete or reopens it. */
export function toggleTopicTask(map: CanopyMap, id: TopicId, taskId: string): CanopyMap {
  const topic = getTopic(map, id);
  if (!topic.tasks?.some((task) => task.id === taskId)) return map;
  return produce(map, (draft) => {
    const task = draft.topics[id]?.tasks?.find((item) => item.id === taskId);
    if (task) task.done = !task.done;
  });
}

/** Removes a task and drops an empty task list from the file. */
export function removeTopicTask(map: CanopyMap, id: TopicId, taskId: string): CanopyMap {
  const topic = getTopic(map, id);
  if (!topic.tasks?.some((task) => task.id === taskId)) return map;
  return produce(map, (draft) => {
    const target = draft.topics[id];
    if (!target?.tasks) return;
    target.tasks = target.tasks.filter((task) => task.id !== taskId);
    if (target.tasks.length === 0) delete target.tasks;
  });
}
