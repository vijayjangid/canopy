import { useCallback, useMemo } from 'react';
import { addTopicReference, ancestorsOf } from '../model';
import { canopyStore } from '../store';
import { navigateToTopic } from '../canvas/navigation';
import type { PaletteEntry } from './commandIndex';
import { Palette } from './Palette';

/** Fuzzy-search topics by title or full path, to choose the one a topic references. */
export function TopicSearchDialog({ referenceFrom }: { referenceFrom: string }) {
  const { allTopics, browseTopics } = useMemo(() => {
    const { doc } = canopyStore.getState();
    const allTopics: PaletteEntry[] =
      referenceFrom && !doc.topics[referenceFrom]
        ? []
        : Object.values(doc.topics)
            .filter(
              (topic) =>
                topic.id !== referenceFrom &&
                !doc.topics[referenceFrom]?.references?.includes(topic.id),
            )
            .map((topic) => {
              const path = ancestorsOf(doc, topic.id)
                .reverse()
                .map((ancestor) => ancestor.title.trim() || 'Empty topic');
              const label = topic.title.trim() || 'Empty topic';
              return {
                id: `topic:${topic.id}`,
                label,
                group: path.length > 0 ? path.join(' › ') : 'Core',
                keys: [],
                run: () => {
                  if (referenceFrom) {
                    const state = canopyStore.getState();
                    state.commit(addTopicReference(state.doc, referenceFrom, topic.id));
                  } else navigateToTopic(topic.id);
                },
              };
            });
    return {
      allTopics,
      browseTopics: allTopics.map((entry) => ({ ...entry, group: 'Topics' })),
    };
  }, [referenceFrom]);
  const source = useCallback(
    (query: string) => (query.trim() ? allTopics : browseTopics),
    [allTopics, browseTopics],
  );

  const sourceName = referenceFrom
    ? canopyStore.getState().doc.topics[referenceFrom]?.title.trim() || 'this topic'
    : null;

  return (
    <Palette
      title={referenceFrom ? `Reference from ${sourceName}` : 'Find a topic'}
      placeholder={referenceFrom ? 'Search by topic or path' : 'Search topics by name or path'}
      source={source}
      remember={false}
      resultLabel="topics"
    />
  );
}
