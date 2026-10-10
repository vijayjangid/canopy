/**
 * The demo maps the README screenshots are drawn from.
 *
 * They are plain data, so the pictures can be made again, the same, whenever the look of the app
 * changes. `scripts/screenshots/screenshots.spec.ts` builds them into a real map and shoots it.
 */

export interface DemoTopic {
  title: string;
  /** A key from the Status Set: todo, doing, blocked, review, done or canceled. */
  status?: string;
  /** A due date, as YYYY-MM-DD. */
  due?: string;
  tags?: string[];
  /** Keys from the sticker catalog. */
  stickers?: string[];
  note?: string;
  /** A label on the line up to the parent. */
  edge?: string;
  /** Titles of other topics this one points at. */
  references?: string[];
  children?: DemoTopic[];
}

/** A product launch plan: statuses, dates, tags, stickers, a note, a line label and references. */
export const PRODUCT_LAUNCH: DemoTopic = {
  title: 'Product launch',
  children: [
    {
      title: 'Strategy',
      note: 'Why now, who for, and what we charge.\n\n- Positioning first\n- Pricing after interviews',
      children: [
        { title: 'Positioning', status: 'done', edge: 'informs' },
        {
          title: 'Target customers',
          children: [{ title: 'Early adopters' }, { title: 'Enterprise teams' }],
        },
        { title: 'Pricing', status: 'review', due: '2026-10-16', tags: ['revenue'] },
      ],
    },
    {
      title: 'Design',
      children: [
        { title: 'Brand identity', status: 'done', stickers: ['star'] },
        {
          title: 'Website',
          children: [
            {
              title: 'Landing page',
              status: 'doing',
              due: '2026-10-23',
              tags: ['web'],
              references: ['Positioning'],
            },
            { title: 'Pricing page', status: 'todo', due: '2026-10-30', references: ['Pricing'] },
          ],
        },
        { title: 'Demo video', status: 'doing', due: '2026-11-06' },
      ],
    },
    {
      title: 'Engineering',
      children: [
        { title: 'Onboarding flow', status: 'doing', due: '2026-10-20', tags: ['web'] },
        {
          title: 'Performance',
          children: [
            { title: 'Cold start', status: 'blocked' },
            { title: 'Large maps', status: 'done' },
          ],
        },
        { title: 'Accessibility audit', status: 'review', due: '2026-10-27', stickers: ['flag'] },
      ],
    },
    {
      title: 'Marketing',
      children: [
        {
          title: 'Launch post',
          status: 'todo',
          due: '2026-11-03',
          stickers: ['rocket'],
          references: ['Landing page'],
        },
        { title: 'Newsletter', status: 'todo', due: '2026-11-04' },
        {
          title: 'Community',
          children: [{ title: 'Beta testers', status: 'doing' }, { title: 'Office hours' }],
        },
      ],
    },
    {
      title: 'Operations',
      children: [
        { title: 'Support playbook', status: 'todo', due: '2026-11-10' },
        { title: 'Analytics', status: 'doing', tags: ['revenue'] },
        { title: 'Legal review', status: 'blocked', due: '2026-10-14', stickers: ['alert'] },
      ],
    },
    {
      title: 'Risks',
      children: [{ title: 'Slow adoption' }, { title: 'Scope creep', stickers: ['fire'] }],
    },
  ],
};

const AREAS = [
  'Identity',
  'Billing',
  'Search',
  'Notifications',
  'Integrations',
  'Analytics',
  'Mobile',
  'Security',
];

/** What each area goes through, and the tasks in each step. */
const PHASES: Record<string, string[]> = {
  Discovery: ['Spike', 'Prototype', 'Review'],
  Design: ['Spike', 'Prototype', 'Review', 'Launch notes'],
  Build: ['Spike', 'Prototype', 'Review', 'Launch notes', 'Metrics'],
  Rollout: ['Spike', 'Prototype'],
};

/** A big, regular map of 153 topics, which does not fit one A4 page in the standard layout. */
export const PLATFORM_ROADMAP: DemoTopic = {
  title: 'Platform roadmap',
  children: AREAS.map((area) => ({
    title: area,
    children: Object.entries(PHASES).map(([phase, tasks]) => ({
      title: phase,
      children: tasks.map((title) => ({ title })),
    })),
  })),
};
