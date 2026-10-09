import { useId, useMemo, useState, type ReactNode } from 'react';
import { announce } from '../a11y';
import {
  addDays,
  endOfWeek,
  ensureTag,
  formatDate,
  planningOf,
  setProps,
  today,
  type PropsPatch,
  type Topic,
} from '../model';
import { StatusIcon } from '../canvas/Chips';
import { readExportTheme } from '../io/exportTheme';
import { canopyStore, useCanopy } from '../store';
import { useThemeVersion } from '../theme';
import { Icon } from './icons';

type Common<T> = { kind: 'none' } | { kind: 'same'; value: T } | { kind: 'mixed' };

/** The value every topic shares, or that they disagree, or that none has one. */
function common<T>(topics: readonly Topic[], read: (t: Topic) => T | undefined): Common<T> {
  let first: T | undefined;
  let seen = false;
  let any = false;
  for (const t of topics) {
    const v = read(t);
    if (v !== undefined) any = true;
    if (!seen) {
      first = v;
      seen = true;
    } else if (v !== first) return { kind: 'mixed' };
  }
  return any && first !== undefined ? { kind: 'same', value: first } : { kind: 'none' };
}

function apply(patch: PropsPatch, say: string) {
  const { doc, selection, commit } = canopyStore.getState();
  commit(setProps(doc, selection, patch), { group: `props:${Object.keys(patch).join(',')}` });
  announce(say);
}

function Field({
  label,
  labelId,
  children,
}: {
  label: string;
  labelId: string;
  children: ReactNode;
}) {
  return (
    <div className="prop-field">
      <span className="prop-label" id={labelId}>
        {label}
      </span>
      {children}
    </div>
  );
}

/** Edits status, due date and tags for every selected topic. Mixed values are shown as such, and
left alone until changed. */
export function PropertiesTab() {
  const doc = useCanopy((s) => s.doc);
  const selection = useCanopy((s) => s.selection);
  const ids = { status: useId(), due: useId(), tags: useId(), dateInput: useId() };
  const [tagText, setTagText] = useState('');
  const themeVersion = useThemeVersion();
  const theme = useMemo(
    () => readExportTheme(),
    // The theme is read from the page, so a new version needs a new reading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [themeVersion],
  );
  const topics = selection.map((id) => doc.topics[id]).filter((t): t is Topic => t !== undefined);
  if (topics.length === 0) return null;

  const plan = planningOf(doc);
  const status = common(topics, (t) => t.props?.status);
  const due = common(topics, (t) => t.props?.due?.end ?? t.props?.due?.start);
  const tagCounts = new Map<string, number>();
  for (const t of topics)
    for (const k of t.props?.tags ?? []) tagCounts.set(k, (tagCounts.get(k) ?? 0) + 1);

  const now = new Date();
  const base = today(now);
  const quickDates = [
    { label: 'Today', iso: base },
    { label: 'Tomorrow', iso: addDays(base, 1) },
    { label: 'This week', iso: endOfWeek(now) },
  ].filter((q, i, all) => all.findIndex((x) => x.iso === q.iso) === i);

  const changeTags = (edit: (current: string[], key: string) => string[], label: string) => {
    const { doc: d, selection: sel, commit } = canopyStore.getState();
    const tag = ensureTag(d, label);
    let map = tag.map;
    for (const id of sel) {
      const current = map.topics[id]?.props?.tags ?? [];
      map = setProps(map, [id], { tags: edit(current, tag.key) });
    }
    commit(map);
  };

  const addTag = (raw: string) => {
    const label = raw.trim().replace(/^#/, '');
    if (!label) return;
    changeTags((current, key) => [...new Set([...current, key])], label);
    announce(`Tag ${label} added`);
  };

  // A comma ends a tag, so several can be typed in a row.
  const typeTag = (value: string) => {
    if (!value.includes(',')) {
      setTagText(value);
      return;
    }
    const parts = value.split(',');
    const rest = parts.pop() ?? '';
    parts.forEach(addTag);
    setTagText(rest);
  };

  const typed = tagText.trim().replace(/^#/, '').toLowerCase();
  const suggestions = plan.tags
    .filter((t) => (tagCounts.get(t.key) ?? 0) < topics.length)
    .filter((t) => !typed || t.label.toLowerCase().includes(typed))
    .slice(0, 8);

  const setDue = (iso: string | null) =>
    apply({ due: iso ? { end: iso } : null }, iso ? `Due ${formatDate(iso)}` : 'Due date cleared');

  return (
    <div className="props-tab">
      {topics.length > 1 && (
        <p className="inspector-hint">
          {topics.length} topics selected. Changes apply to all of them.
        </p>
      )}

      <Field label="Status" labelId={ids.status}>
        <div className="pill-group" role="group" aria-labelledby={ids.status}>
          {plan.statusSet.map((s) => {
            const on = status.kind === 'same' && status.value === s.key;
            return (
              <button
                key={s.key}
                type="button"
                className="pill"
                data-icon=""
                aria-pressed={on}
                onClick={() =>
                  on
                    ? apply({ status: null }, 'Status cleared')
                    : apply({ status: s.key }, `Status ${s.label}`)
                }
              >
                <StatusIcon def={s} theme={theme} />
                {s.label}
              </button>
            );
          })}
        </div>
        {status.kind === 'mixed' && (
          <p className="inspector-hint">Mixed. Pick one to set them all.</p>
        )}
      </Field>

      <Field label="Due date" labelId={ids.due}>
        <div className="pill-group" role="group" aria-labelledby={ids.due}>
          {quickDates.map((q) => {
            const on = due.kind === 'same' && due.value === q.iso;
            return (
              <button
                key={q.label}
                type="button"
                className="pill"
                aria-pressed={on}
                data-tip={formatDate(q.iso, now)}
                data-tip-side="bottom"
                onClick={() => setDue(on ? null : q.iso)}
              >
                {q.label}
              </button>
            );
          })}
        </div>
        <div className="date-row">
          <span className="date-field">
            <Icon name="calendar" />
            <input
              id={ids.dateInput}
              type="date"
              aria-label="Due date"
              min="1900-01-01"
              max="2099-12-31"
              value={due.kind === 'same' ? due.value : ''}
              onChange={(e) => setDue(e.target.value || null)}
            />
          </span>
          {due.kind !== 'none' && (
            <button
              type="button"
              className="pill-clear"
              aria-label="Clear due date"
              data-tip="Clear"
              data-tip-side="bottom"
              onClick={() => setDue(null)}
            >
              <Icon name="close" />
            </button>
          )}
        </div>
        {due.kind === 'mixed' && (
          <p className="inspector-hint">The selected topics have different dates.</p>
        )}
      </Field>

      <Field label="Tags" labelId={ids.tags}>
        {tagCounts.size > 0 && (
          <ul className="prop-chips" aria-label="Tags">
            {[...tagCounts].map(([key, n]) => {
              const tag = plan.tags.find((t) => t.key === key);
              return (
                <li
                  key={key}
                  data-partial={n < topics.length || undefined}
                  style={{ ['--tag-color' as string]: tag?.color ?? '#888' }}
                >
                  <span className="tag-dot" aria-hidden="true" />
                  {tag?.label ?? key}
                  {n < topics.length && <em> (some)</em>}
                  <button
                    type="button"
                    aria-label={`Remove tag ${tag?.label ?? key}`}
                    onClick={() =>
                      changeTags((current) => current.filter((k) => k !== key), tag?.label ?? key)
                    }
                  >
                    <Icon name="close" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <form
          className="tag-input"
          onSubmit={(e) => {
            e.preventDefault();
            addTag(tagText);
            setTagText('');
          }}
        >
          <input
            type="text"
            aria-label="Add a tag"
            value={tagText}
            placeholder="Add a tag, or press comma"
            autoComplete="off"
            onChange={(e) => typeTag(e.target.value)}
          />
          <button type="submit" className="pill" disabled={!tagText.trim()}>
            Add
          </button>
        </form>
        {suggestions.length > 0 && (
          <ul className="tag-suggestions" aria-label="Existing tags">
            {suggestions.map((t) => (
              <li key={t.key}>
                <button
                  type="button"
                  className="pill"
                  aria-label={`Add tag ${t.label}`}
                  style={{ ['--tag-color' as string]: t.color }}
                  onClick={() => {
                    addTag(t.label);
                    setTagText('');
                  }}
                >
                  <span className="tag-dot" aria-hidden="true" />
                  {t.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Field>
    </div>
  );
}
