import { createMap, ensureTag, type CanopyMap, type Flow, type Topic } from '../model';

const WORDS = [
  'Research',
  'Design',
  'Launch',
  'Budget',
  'Roadmap',
  'Customers',
  'Insights',
  'Prototype',
  'Hiring',
  'Metrics',
  'Pricing',
  'Accessibility',
  'Onboarding',
  'Feedback',
  'Strategy',
  'Risks',
  'Milestones',
  'Partnerships',
  'Brand voice',
  'Performance',
  'Security review',
  'Documentation',
];

// Small seeded generator so a demo map looks the same every time.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A bushy demo tree with `count` topics, for development and benchmarks. */
export function generateDemoMap(
  count: number,
  flow: Flow = 'right',
  seed = 7,
  planned = false,
): CanopyMap {
  const random = mulberry32(seed);
  const base = createMap({ coreId: 'core', title: 'Demo map', coreTitle: 'Product launch' });
  const topics: Record<string, Topic> = { ...base.topics };
  const ids = ['core'];
  const depths = [0];
  const childCounts = new Map<string, number>();
  for (let i = 1; i < Math.max(1, count); i++) {
    // Early topics get more children, and nothing goes deeper than Level 6.
    let at = Math.floor(random() ** 2 * ids.length);
    while ((depths[at] ?? 0) >= 6) at = Math.floor(at / 2);
    const parentId = ids[at] ?? 'core';
    const n = childCounts.get(parentId) ?? 0;
    childCounts.set(parentId, n + 1);
    const id = `n${i}`;
    const word = WORDS[Math.floor(random() * WORDS.length)] ?? 'Idea';
    topics[id] = {
      id,
      parentId,
      orderKey: `${String(n).padStart(6, '0')}V`,
      title: random() < 0.15 ? `${word} and follow-up plan` : word,
      folded: false,
    };
    ids.push(id);
    depths.push((depths[at] ?? 0) + 1);
  }
  const map: CanopyMap = { ...base, prefs: { ...base.prefs, flow }, topics };
  return planned ? withPlan(map, random) : map;
}

const STICKER_KEYS = ['star', 'fire', 'rocket', 'idea', 'flag', 'heart', 'bolt', 'party'];

/** Adds statuses, due dates, tags and a few stickers to about half the topics. */
function withPlan(map: CanopyMap, random: () => number): CanopyMap {
  const statuses = ['todo', 'doing', 'blocked', 'review', 'done', 'canceled'];
  let planned = map;
  const tagKeys = ['Launch', 'Design', 'Risk'].map((label) => {
    const made = ensureTag(planned, label);
    planned = made.map;
    return made.key;
  });
  const topics: Record<string, Topic> = {};
  for (const [id, t] of Object.entries(planned.topics)) {
    if (id === map.coreId || random() > 0.5) {
      topics[id] = t;
      continue;
    }
    const props: NonNullable<Topic['props']> = {
      status: statuses[Math.floor(random() * statuses.length)] ?? 'todo',
    };
    if (random() < 0.5) {
      const day = 1 + Math.floor(random() * 28);
      props.due = { end: `2026-${random() < 0.5 ? '09' : '11'}-${String(day).padStart(2, '0')}` };
    }
    if (random() < 0.4) props.tags = [tagKeys[Math.floor(random() * tagKeys.length)] ?? 'launch'];
    const topic: Topic = { ...t, props };
    if (random() < 0.2) {
      const key = STICKER_KEYS[Math.floor(random() * STICKER_KEYS.length)] ?? 'star';
      topic.stickers = [{ id: `s_${id}`, key }];
    }
    topics[id] = topic;
  }
  return { ...planned, topics };
}
