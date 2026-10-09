import { produce } from 'immer';
import type { CanopyMap } from './types';

/** Sets the map's own title (shown in the top bar and used for the file name). */
export function renameMap(map: CanopyMap, title: string): CanopyMap {
  const clean = title.replace(/\s+/g, ' ').slice(0, 200);
  if (map.meta.title === clean) return map;
  return produce(map, (draft) => {
    draft.meta.title = clean;
  });
}
