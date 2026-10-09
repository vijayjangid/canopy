/** Playful colours the map by level: the Core, then five colours that repeat for deeper levels. */
export const LEVEL_COUNT = 5;

/** 0 for the Core, then 1 to 5, cycling for deeper topics. */
export const levelOf = (depth: number): number =>
  depth <= 0 ? 0 : ((depth - 1) % LEVEL_COUNT) + 1;
