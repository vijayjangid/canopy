import { useMemo, type ReactNode } from 'react';
import { StatusIcon } from '../canvas/Chips';
import { readExportTheme } from '../io/exportTheme';
import { planningOf, usedStickers } from '../model';
import { StickerArt } from '../stickers/art';
import { STICKERS } from '../stickers/catalog';
import { useCanopy } from '../store';
import { useThemeVersion } from '../theme';
import { DateFilter } from './DateFilter';
import { useActiveFilter } from './filter';
import { setFilter, toggleFilterChoice, toggleFilterDue, useUi } from './uiStore';

function ChoiceList({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="filter-group">
      <h3>{label}</h3>
      <ul className="filter-list" aria-label={label}>
        {children}
      </ul>
    </section>
  );
}

function Choice({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <li>
      <button type="button" aria-pressed={on} onClick={onClick}>
        {children}
      </button>
    </li>
  );
}

/** Pills for narrowing the map by due date, status, tag and sticker. Each one applies at once. */
export function QuickFilters() {
  const doc = useCanopy((s) => s.doc);
  const plan = useMemo(() => planningOf(doc), [doc]);
  const used = useMemo(() => usedStickers(doc), [doc]);
  const sel = useUi((s) => s.filterSel);
  const active = useActiveFilter();
  const themeVersion = useThemeVersion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const theme = useMemo(() => readExportTheme(), [themeVersion]);
  const count = active?.result.ordered.length ?? 0;

  return (
    <div className="quick-filters">
      <div className="quick-filters-head">
        <h3>Quick filters</h3>
        {active && (
          <p className="filter-count" role="status" data-state={count === 0 ? 'empty' : 'found'}>
            {count === 0 ? 'Nothing matches' : `${count} ${count === 1 ? 'match' : 'matches'}`}
            <button
              type="button"
              className="quick-clear"
              aria-label="Clear filter"
              onClick={() => setFilter(null)}
            >
              Clear
            </button>
          </p>
        )}
      </div>
      <ChoiceList label="Due date">
        <Choice on={sel.due === 'overdue'} onClick={() => toggleFilterDue('overdue')}>
          Overdue
        </Choice>
        <Choice on={sel.due === 'week'} onClick={() => toggleFilterDue('week')}>
          Due this week
        </Choice>
        <Choice on={sel.due === 'range'} onClick={() => toggleFilterDue('range')}>
          Date range
        </Choice>
      </ChoiceList>
      {sel.due === 'range' && <DateFilter />}
      <ChoiceList label="Status">
        {plan.statusSet.map((s) => (
          <Choice
            key={s.key}
            on={sel.status.includes(s.key)}
            onClick={() => toggleFilterChoice('status', s.key)}
          >
            <StatusIcon def={s} theme={theme} />
            {s.label}
          </Choice>
        ))}
      </ChoiceList>
      {plan.tags.length > 0 && (
        <ChoiceList label="Tags">
          {plan.tags.map((t) => (
            <Choice
              key={t.key}
              on={sel.tags.includes(t.key)}
              onClick={() => toggleFilterChoice('tags', t.key)}
            >
              <span
                className="tag-dot"
                aria-hidden="true"
                style={{ ['--tag-color' as string]: t.color }}
              />
              {t.label}
            </Choice>
          ))}
        </ChoiceList>
      )}
      {used.size > 0 && (
        <ChoiceList label="Stickers">
          {STICKERS.filter((s) => used.has(s.key)).map((s) => (
            <Choice
              key={s.key}
              on={sel.stickers.includes(s.key)}
              onClick={() => toggleFilterChoice('stickers', s.key)}
            >
              <svg className="filter-sticker" viewBox="-2 -2 36 38" aria-hidden="true">
                <StickerArt name={s.key} />
              </svg>
              {s.name}
            </Choice>
          ))}
        </ChoiceList>
      )}
    </div>
  );
}
