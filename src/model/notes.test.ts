import { describe, expect, it } from 'vitest';
import { setTopicNote } from './notes';
import { createMap, createSubTopic } from './ops';
import { parseJson, stringifyFile } from './serialize';
import { setTopicStyle, topicForeground } from './style';
import { copyBranches, branchesFromJson, branchesToJson } from './clipboard';
import { MAX_TOPIC_NOTE } from './types';

describe('node color and notes', () => {
  it('sets, replaces and clears a Markdown note', () => {
    let map = createMap({ coreId: 'core' });
    map = setTopicNote(map, 'core', '# Plan\n\n- [ ] Write tests\n- [docs](https://example.com)');
    expect(map.topics.core?.note).toBe(
      '# Plan\n\n- [ ] Write tests\n- [docs](https://example.com)',
    );
    expect(setTopicNote(map, 'core', map.topics.core?.note ?? '')).toBe(map);

    map = setTopicNote(map, 'core', '**Done**');
    expect(map.topics.core?.note).toBe('**Done**');
    map = setTopicNote(map, 'core', '  \n ');
    expect(map.topics.core?.note).toBeUndefined();
  });

  it('keeps notes within the length limit', () => {
    const map = setTopicNote(
      createMap({ coreId: 'core' }),
      'core',
      'a'.repeat(MAX_TOPIC_NOTE + 50),
    );
    expect(map.topics.core?.note).toHaveLength(MAX_TOPIC_NOTE);
  });

  it('chooses readable text colors for the preset backgrounds', () => {
    expect(topicForeground('yellow')).toBe('#111827');
    expect(topicForeground('indigo')).toBe('#ffffff');
  });

  it('persists style and note through file round-trips', () => {
    let map = createMap({ coreId: 'core' });
    map = setTopicStyle(map, 'core', { color: 'teal' });
    map = setTopicNote(map, 'core', 'Ship the **feature**\n\n- one\n- two');

    const parsed = parseJson(stringifyFile(map));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.map.topics.core?.style).toEqual({ color: 'teal' });
      expect(parsed.map.topics.core?.note).toBe('Ship the **feature**\n\n- one\n- two');
    }
  });

  it('turns the checklist of an older file into a Markdown task list', () => {
    const parsed = parseJson(
      JSON.stringify({
        schema: 'canopy/1',
        core: {
          id: 'core',
          title: 'Core',
          tasks: [
            { id: 'a', text: 'Write   tests', done: false },
            { id: 'b', text: 'Ship it', done: true },
          ],
          children: [],
        },
      }),
    );
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.map.topics.core?.note).toBe('- [ ] Write tests\n- [x] Ship it');
      expect(parsed.map.topics.core).not.toHaveProperty('tasks');
    }
  });

  it('ignores legacy node type values', () => {
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
      expect(parsed.map.topics.core?.note).toBeUndefined();
    }
  });

  it('copies node style and note with a topic branch', () => {
    let map = createMap({ coreId: 'core' });
    map = createSubTopic(map, 'core', { id: 'topic', title: 'Project' }).map;
    map = setTopicStyle(map, 'topic', { color: 'coral' });
    map = setTopicNote(map, 'topic', '[Review](https://example.com)');
    const branch = copyBranches(map, ['topic']);
    const decoded = branchesFromJson(branchesToJson(branch));
    expect(decoded?.[0]?.extras?.style).toEqual({ color: 'coral' });
    expect(decoded?.[0]?.extras?.note).toBe('[Review](https://example.com)');
  });
});
