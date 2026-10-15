import { useId, useRef, useState, type FormEvent, type ReactNode, type RefObject } from 'react';
import { announce } from '../a11y';
import {
  addTopicTask,
  ancestorsOf,
  removeTopicTask,
  setImageAlt,
  setTopicStyle,
  setTopicImage,
  setTopicTaskText,
  toggleTopicTask,
  ensureTag,
  formatDate,
  planningOf,
  setProps,
  TOPIC_COLOR_PRESETS,
  MAX_TOPIC_TASK_TEXT,
  type TopicColor,
  type TopicStylePatch,
  type PropsPatch,
  type Topic,
} from '../model';
import { playfulColorForDepth } from '../theme/levels';
import { ImageTooLargeError, imageFromBlob } from '../editor/imageImport';
import { canopyStore, useCanopy } from '../store';
import { Icon } from './icons';
import { showToast } from './toast';

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

/** Edits node color, due date and tags. Mixed values are shown as such, and
left alone until changed. */
export function PropertiesTab({ stickerSection }: { stickerSection?: ReactNode }) {
  const doc = useCanopy((s) => s.doc);
  const selection = useCanopy((s) => s.selection);
  const ids = {
    due: useId(),
    tags: useId(),
    dateInput: useId(),
    color: useId(),
  };
  const [tagText, setTagText] = useState('');
  const imageInput = useRef<HTMLInputElement>(null);
  const topics = selection.map((id) => doc.topics[id]).filter((t): t is Topic => t !== undefined);
  if (topics.length === 0) return null;

  const plan = planningOf(doc);
  const color = common(
    topics,
    (t) =>
      t.style?.color ??
      (doc.prefs.look === 'playful'
        ? playfulColorForDepth(ancestorsOf(doc, t.id).length)
        : undefined),
  );
  const due = common(topics, (t) => t.props?.due?.end ?? t.props?.due?.start);
  const tagCounts = new Map<string, number>();
  for (const t of topics)
    for (const k of t.props?.tags ?? []) tagCounts.set(k, (tagCounts.get(k) ?? 0) + 1);

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

  const setStyle = (patch: TopicStylePatch, message: string) => {
    const { doc: current, selection: selected, commit } = canopyStore.getState();
    let next = current;
    for (const id of selected) next = setTopicStyle(next, id, patch);
    commit(next);
    announce(message);
  };

  const setImage = async (file: File | undefined) => {
    if (!file || topics.length !== 1) return;
    try {
      const image = await imageFromBlob(file);
      const { doc: current, commit } = canopyStore.getState();
      commit(setTopicImage(current, topics[0]!.id, image));
    } catch (error) {
      showToast(
        error instanceof ImageTooLargeError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'That picture could not be read.',
      );
    } finally {
      if (imageInput.current) imageInput.current.value = '';
    }
  };

  return (
    <div className="props-tab">
      {topics.length > 1 && (
        <p className="inspector-hint">
          {topics.length} nodes selected. Changes apply to all of them.
        </p>
      )}

      <Field label="Color" labelId={ids.color}>
        <div className="topic-color-options" role="group" aria-labelledby={ids.color}>
          <button
            type="button"
            className="topic-color-swatch topic-color-auto"
            aria-label="Automatic color"
            title="Automatic color"
            aria-pressed={color.kind === 'none'}
            onClick={() => setStyle({ color: null }, 'Automatic color')}
          />
          {(
            Object.entries(TOPIC_COLOR_PRESETS) as [
              TopicColor,
              (typeof TOPIC_COLOR_PRESETS)[TopicColor],
            ][]
          ).map(([key, preset]) => (
            <button
              key={key}
              type="button"
              className="topic-color-swatch"
              aria-label={preset.label}
              aria-pressed={color.kind === 'same' && color.value === key}
              data-color={key}
              title={preset.label}
              onClick={() => setStyle({ color: key }, `${preset.label} color`)}
            />
          ))}
        </div>
        {color.kind === 'mixed' && <p className="inspector-hint">Mixed. Pick one to set all.</p>}
      </Field>

      {topics.length === 1 && (
        <ImageField
          topic={topics[0]!}
          input={imageInput}
          onPick={() => imageInput.current?.click()}
          onSelect={setImage}
        />
      )}

      {stickerSection}

      <div className="panel-section-heading">
        <h3>Planning</h3>
        <span className="panel-section-rule" aria-hidden="true" />
      </div>

      <Field label="Due date" labelId={ids.due}>
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
          <p className="inspector-hint">The selected nodes have different dates.</p>
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

function ImageField({
  topic,
  input,
  onPick,
  onSelect,
}: {
  topic: Topic;
  input: RefObject<HTMLInputElement | null>;
  onPick: () => void;
  onSelect: (file: File | undefined) => void;
}) {
  const altId = useId();
  return (
    <div className="prop-field topic-image-field">
      <span className="prop-label">Picture</span>
      {topic.image && (
        <div className="topic-image-preview">
          <img src={topic.image.src} alt={topic.image.alt || 'Node picture'} />
          <button
            type="button"
            className="pill-clear"
            aria-label="Remove picture"
            onClick={() => {
              const { doc, commit } = canopyStore.getState();
              commit(setTopicImage(doc, topic.id, null));
              announce('Picture removed');
            }}
          >
            <Icon name="trash" />
          </button>
        </div>
      )}
      {topic.image && (
        <input
          id={altId}
          type="text"
          maxLength={200}
          aria-label="Picture description"
          placeholder="Add a description for screen readers"
          value={topic.image.alt ?? ''}
          onChange={(event) => {
            const { doc, commit } = canopyStore.getState();
            commit(setImageAlt(doc, topic.id, event.target.value), {
              group: `image-alt:${topic.id}`,
            });
          }}
        />
      )}
      <input
        ref={input}
        hidden
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        aria-label={topic.image ? 'Replace picture' : 'Add picture'}
        onChange={(event) => onSelect(event.target.files?.[0])}
      />
      <button type="button" className="pill" onClick={onPick}>
        {topic.image ? 'Replace picture' : 'Add picture'}
      </button>
      {!topic.image && <p className="inspector-hint">Choose an image file to add to this node.</p>}
    </div>
  );
}

export function TasksTab({ topic }: { topic: Topic }) {
  const [newTask, setNewTask] = useState('');

  const add = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = newTask.trim();
    if (!text) return;
    const { doc, commit } = canopyStore.getState();
    commit(addTopicTask(doc, topic.id, text));
    setNewTask('');
    announce(`Added task: ${text}`);
  };

  return (
    <div className="prop-field topic-tasks">
      <span className="prop-label">Tasks</span>
      {topic.tasks && topic.tasks.length > 0 ? (
        <ul className="topic-task-editor" aria-label="Tasks">
          {topic.tasks.map((task, index) => (
            <li key={task.id}>
              <input
                type="checkbox"
                checked={task.done}
                aria-label={`Mark task ${index + 1} complete`}
                onChange={() => {
                  const { doc, commit } = canopyStore.getState();
                  commit(toggleTopicTask(doc, topic.id, task.id));
                  announce(`${task.done ? 'Reopened' : 'Completed'} task: ${task.text}`);
                }}
              />
              <input
                type="text"
                maxLength={MAX_TOPIC_TASK_TEXT}
                aria-label={`Task ${index + 1}`}
                value={task.text}
                data-done={task.done || undefined}
                onChange={(event) => {
                  const { doc, commit } = canopyStore.getState();
                  commit(setTopicTaskText(doc, topic.id, task.id, event.target.value), {
                    group: `task:${topic.id}:${task.id}`,
                  });
                }}
                onBlur={() => {
                  const { doc, commit } = canopyStore.getState();
                  const current = doc.topics[topic.id]?.tasks?.find((item) => item.id === task.id);
                  const text = current?.text.trim() ?? '';
                  commit(
                    text
                      ? setTopicTaskText(doc, topic.id, task.id, text)
                      : removeTopicTask(doc, topic.id, task.id),
                    { group: `task:${topic.id}:${task.id}` },
                  );
                }}
              />
              <button
                type="button"
                className="pill-clear"
                aria-label={`Remove task ${index + 1}`}
                onClick={() => {
                  const { doc, commit } = canopyStore.getState();
                  commit(removeTopicTask(doc, topic.id, task.id));
                  announce(`Removed task: ${task.text}`);
                }}
              >
                <Icon name="close" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="inspector-hint">No tasks yet.</p>
      )}
      <form className="topic-task-add" onSubmit={add}>
        <input
          id={`topic-task-add-${topic.id}`}
          type="text"
          maxLength={MAX_TOPIC_TASK_TEXT}
          aria-label="Add a task"
          value={newTask}
          placeholder="Add a task"
          onChange={(event) => setNewTask(event.target.value)}
        />
        <button type="submit" className="pill" disabled={!newTask.trim()}>
          Add
        </button>
      </form>
    </div>
  );
}
