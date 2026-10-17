/**
 * The demo maps the README screenshots are drawn from.
 *
 * They are plain data, so the pictures can be made again, the same, whenever the look of the app
 * changes. `scripts/screenshots/screenshots.spec.ts` builds them into a real map and shoots it.
 */

export interface DemoTopic {
  title: string;
  /** A due date, as YYYY-MM-DD. */
  due?: string;
  tags?: string[];
  /** Markdown shown as a preview on the node. */
  note?: string;
  /** Keys from the sticker catalog. */
  stickers?: string[];
  /** A label on the line up to the parent. */
  edge?: string;
  /** Titles of other topics this one points at. */
  references?: string[];
  children?: DemoTopic[];
}

/** A product launch plan with dates, tags, notes, stickers, line labels and references. */
export const PRODUCT_LAUNCH: DemoTopic = {
  title: 'Product launch',
  children: [
    {
      title: 'Strategy',
      note: '- [x] Define the launch audience\n- [ ] Validate positioning with customers',
      children: [
        { title: 'Positioning', edge: 'informs' },
        {
          title: 'Target customers',
          children: [{ title: 'Early adopters' }, { title: 'Enterprise teams' }],
        },
        { title: 'Pricing', due: '2026-10-16', tags: ['revenue'] },
      ],
    },
    {
      title: 'Design',
      children: [
        { title: 'Brand identity', stickers: ['idea'] },
        {
          title: 'Website',
          children: [
            {
              title: 'Landing page',
              due: '2026-10-23',
              tags: ['web'],
              stickers: ['monday', 'p1'],
              note: '**Brief:** see the [launch plan](https://example.com/plan)\n\n- [x] Draft the page copy\n- [ ] Review the mobile layout',
              references: ['Positioning'],
            },
            { title: 'Pricing page', due: '2026-10-30', references: ['Pricing'] },
          ],
        },
        { title: 'Demo video', due: '2026-11-06' },
      ],
    },
    {
      title: 'Engineering',
      children: [
        { title: 'Onboarding flow', due: '2026-10-20', tags: ['web'] },
        {
          title: 'Performance',
          children: [{ title: 'Cold start' }, { title: 'Large maps' }],
        },
        { title: 'Accessibility audit', due: '2026-10-27', stickers: ['flag'] },
      ],
    },
    {
      title: 'Marketing',
      children: [
        {
          title: 'Launch post',
          due: '2026-11-03',
          stickers: ['celebrate'],
          references: ['Landing page'],
        },
        { title: 'Newsletter', due: '2026-11-04' },
        {
          title: 'Community',
          children: [{ title: 'Beta testers' }, { title: 'Office hours' }],
        },
      ],
    },
    {
      title: 'Operations',
      children: [
        { title: 'Support playbook', due: '2026-11-10' },
        { title: 'Analytics', tags: ['revenue'] },
        { title: 'Legal review', due: '2026-10-14', stickers: ['warning'] },
      ],
    },
    {
      title: 'Risks',
      children: [{ title: 'Slow adoption' }, { title: 'Scope creep', stickers: ['bug'] }],
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

/** What each area goes through, and the steps in each phase. */
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
