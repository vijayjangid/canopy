import { produce } from 'immer';
import { getTopic } from './tree';
import {
  TOPIC_COLOR_PRESETS,
  type CanopyMap,
  type TopicColor,
  type TopicId,
  type TopicStyle,
} from './types';

export type TopicStylePatch = {
  [K in keyof TopicStyle]?: TopicStyle[K] | null;
};

/** Chooses the higher-contrast of white and near-black for a preset background. */
export function topicForeground(color: TopicColor): '#ffffff' | '#111827' {
  const hex = TOPIC_COLOR_PRESETS[color].value.slice(1);
  const channels = [0, 2, 4].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255);
  const linear = channels.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const luminance =
    0.2126 * (linear[0] ?? 0) + 0.7152 * (linear[1] ?? 0) + 0.0722 * (linear[2] ?? 0);
  const darkContrast = (luminance + 0.05) / 0.05;
  const lightContrast = 1.05 / (luminance + 0.05);
  return lightContrast > darkContrast ? '#ffffff' : '#111827';
}

/** Sets selected visual presets. Null clears a preset so the map's default look is restored. */
export function setTopicStyle(map: CanopyMap, id: TopicId, patch: TopicStylePatch): CanopyMap {
  const topic = getTopic(map, id);
  const next: TopicStyle = { ...topic.style };
  if (patch.color === null) delete next.color;
  else if (patch.color !== undefined) next.color = patch.color;
  if (Object.keys(next).length === 0) {
    if (!topic.style) return map;
    return produce(map, (draft) => {
      delete draft.topics[id]?.style;
    });
  }
  if (next.color === topic.style?.color) {
    return map;
  }
  return produce(map, (draft) => {
    const target = draft.topics[id];
    if (target) target.style = next;
  });
}
