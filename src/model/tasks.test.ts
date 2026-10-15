import { describe, expect, it } from 'vitest';
import { addTopicTask, removeTopicTask, setTopicTaskText, toggleTopicTask } from './tasks';
import { createMap, createSubTopic } from './ops';
import { parseJson, stringifyFile } from './serialize';
import { setTopicStyle, topicForeground } from './style';
import { copyBranches, branchesFromJson, branchesToJson } from './clipboard';

describe('node color and tasks', () => {
  it('adds, edits, toggles and removes checklist items', () => {
    let map = createMap({ coreId: 'core' });
    map = addTopicTask(map, 'core', '  Write   tests ');
    const task = map.topics.core?.tasks?.[0];
    expect(task).toMatchObject({ text: 'Write tests', done: false });
    if (!task) return;

    map = setTopicTaskText(map, 'core', task.id, 'Write better tests');
    map = toggleTopicTask(map, 'core', task.id);
    expect(map.topics.core?.tasks?.[0]).toMatchObject({
      text: 'Write better tests',
      done: true,
    });
    map = removeTopicTask(map, 'core', task.id);
    expect(map.topics.core?.tasks).toBeUndefined();
  });

  it('chooses readable text colors for the preset backgrounds', () => {
    expect(topicForeground('yellow')).toBe('#111827');
    expect(topicForeground('indigo')).toBe('#ffffff');
  });

  it('persists style and task state through file round-trips', () => {
    let map = createMap({ coreId: 'core' });
    map = setTopicStyle(map, 'core', { color: 'teal' });
    map = addTopicTask(map, 'core', 'Ship the feature');
    const taskId = map.topics.core?.tasks?.[0]?.id;
    if (taskId) map = toggleTopicTask(map, 'core', taskId);

    const parsed = parseJson(stringifyFile(map));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.map.topics.core?.style).toEqual({ color: 'teal' });
      expect(parsed.map.topics.core?.tasks?.[0]).toMatchObject({
        text: 'Ship the feature',
        done: true,
      });
    }
  });

  it('ignores legacy node type values and derives Tasklist display from tasks', () => {
    const parsed = parseJson(
      JSON.stringify({
        schema: 'canopy/1',
        core: {
          id: 'core',
          title: 'Core',
          style: { type: 'tasklist', color: 'teal' },
          children: [],
        },
      }),
    );
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.map.topics.core?.style).toEqual({ color: 'teal' });
      expect(parsed.map.topics.core?.tasks).toBeUndefined();
    }
  });

  it('copies node style and task content with a topic branch', () => {
    let map = createMap({ coreId: 'core' });
    map = createSubTopic(map, 'core', { id: 'topic', title: 'Project' }).map;
    map = setTopicStyle(map, 'topic', { color: 'coral' });
    map = addTopicTask(map, 'topic', 'Review');
    const branch = copyBranches(map, ['topic']);
    const decoded = branchesFromJson(branchesToJson(branch));
    expect(decoded?.[0]?.extras?.style).toEqual({ color: 'coral' });
    expect(decoded?.[0]?.extras?.tasks?.[0]).toMatchObject({ text: 'Review', done: false });
  });
});
