import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { focusCanvas } from '../canvas/layoutState';
import {
  MAX_EDGE_LABEL,
  MAX_EDGE_STICKERS,
  MAX_STICKERS,
  ancestorsOf,
  childrenOf,
  setEdgeLabel,
  setNote,
  toggleEdgeSticker,
  toggleSticker,
  type Topic,
} from '../model';
import { prefersReducedMotion } from '../motion';
import { markFresh } from '../canvas/stampStore';
import { canopyStore, useCanopy } from '../store';
import { StickerArt } from '../stickers/art';
import { searchStickers } from '../stickers/catalog';
import { Icon, type IconName } from './icons';
import { Markdown } from './Markdown';
import { PropertiesTab } from './PropertiesTab';
import { showToast } from './toast';
import {
  closeInspector,
  setEdgeFocus,
  setInspectorTab,
  toggleSection,
  useUi,
  type InspectorTab,
} from './uiStore';
import './inspector.css';

const CRUMB_CHARS = 22;

/** One line, cut to `max` characters with an ellipsis. */
const clamp = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}\u2026` : text;

const SECTIONS: Array<{ id: InspectorTab; label: string; icon: IconName }> = [
  { id: 'properties', label: 'Properties', icon: 'status' },
  { id: 'stickers', label: 'Stickers', icon: 'stickers' },
  { id: 'note', label: 'Note', icon: 'note' },
];

/** Short text beside a section title, so a closed section still says what is in it. */
function summaryOf(id: InspectorTab, topic: Topic): string {
  if (id === 'note') return topic.note ? 'Has a note' : '';
  if (id === 'stickers') return topic.stickers?.length ? String(topic.stickers.length) : '';
  return topic.props ? 'Set' : '';
}

/** The details panel: it opens when a topic is clicked, and closes with its button. */
export function Inspector() {
  const open = useUi((s) => s.inspectorOpen);
  const target = useUi((s) => s.inspectorTab);
  const sections = useUi((s) => s.sections);
  const focus = useCanopy((s) => s.focus);
  const picked = useCanopy((s) => s.picked);
  const topic = useCanopy((s) => s.doc.topics[s.focus]);
  const selectionCount = useCanopy((s) => s.selection.length);
  const many = selectionCount > 1;
  const pane = !many && target === 'note' ? 'note' : 'details';

  // Bring the requested section into view when it is asked for.
  useEffect(() => {
    if (open)
      document.getElementById(`inspector-section-${target}`)?.scrollIntoView({ block: 'nearest' });
  }, [open, target]);

  const doc = useCanopy((s) => s.doc);
  const edgeFocus = useUi((s) => s.edgeFocus);
  if (!open || !topic || !picked) return null;

  const parent = topic.parentId ? (doc.topics[topic.parentId] ?? null) : null;
  const siblings = parent ? childrenOf(doc, parent.id) : [];
  const at = siblings.findIndex((t) => t.id === focus);
  const before = siblings[at - 1];
  const after = siblings[at + 1];
  const place = at + 1;
  const depth = ancestorsOf(doc, topic.id).length;
  const parentName = parent?.title.trim().replace(/\s+/g, ' ') || 'Empty topic';
  const flow = doc.prefs.flow;

  // A picked line stays picked as you move along its siblings.
  const goTo = (id: string) => {
    canopyStore.getState().select([id], id);
    if (edgeFocus === focus) setEdgeFocus(id);
  };

  const close = () => {
    closeInspector();
    focusCanvas();
  };

  return (
    // Escape works from anywhere inside the panel, so the listener sits on the landmark itself.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <aside
      className="panel panel-right"
      aria-label="Inspector"
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === 'Escape' && !e.defaultPrevented) {
          e.preventDefault();
          close();
        }
      }}
    >
      <header className="panel-header">
        <div className="panel-heading">
          {many || !parent ? (
            <p className="panel-eyebrow">{many ? `${selectionCount} topics` : 'Core topic'}</p>
          ) : (
            <nav className="panel-crumb" aria-label="Parent topic">
              <button
                type="button"
                aria-label={`Parent topic: ${parentName}`}
                data-tip={`Go to ${parentName}`}
                data-tip-side="bottom"
                onClick={() => goTo(parent.id)}
              >
                {clamp(parentName, CRUMB_CHARS)}
              </button>
              <Icon name="chevron-right" />
            </nav>
          )}
          <h2 title={many ? undefined : topic.title.trim()}>
            {many
              ? 'Several topics'
              : clamp(topic.title.trim().replace(/\s+/g, ' ') || 'Empty topic', 60)}
          </h2>
          {!many && (
            <p className="panel-level">
              {parent ? `Level ${depth} · ${depth}.${place}` : 'Core · Level 0'}
            </p>
          )}
        </div>
        {!many && siblings.length > 1 && (
          <div className="panel-nav" role="group" aria-label="Move between siblings">
            <button
              type="button"
              aria-label={flow === 'right' ? 'Previous sibling (up)' : 'Previous sibling (left)'}
              data-tip={`Previous sibling, ${place} of ${siblings.length}`}
              data-tip-side="bottom"
              disabled={!before}
              onClick={() => before && goTo(before.id)}
            >
              <Icon name={flow === 'right' ? 'arrow-up' : 'chevron-left'} />
            </button>
            <button
              type="button"
              aria-label={flow === 'right' ? 'Next sibling (down)' : 'Next sibling (right)'}
              data-tip={`Next sibling, ${place} of ${siblings.length}`}
              data-tip-side="bottom"
              disabled={!after}
              onClick={() => after && goTo(after.id)}
            >
              <Icon name={flow === 'right' ? 'arrow-down' : 'chevron-right'} />
            </button>
          </div>
        )}
        <button
          type="button"
          className="panel-collapse"
          aria-label="Close details"
          data-tip="Close"
          data-tip-side="left"
          onClick={close}
        >
          <Icon name="close" />
        </button>
      </header>
      {!many && (
        <div className="inspector-tabs" role="tablist" aria-label="Topic details">
          <button
            type="button"
            role="tab"
            id="inspector-tab-details"
            aria-selected={pane === 'details'}
            aria-controls="inspector-panel"
            onClick={() => setInspectorTab(target === 'note' ? 'properties' : target)}
          >
            Details
          </button>
          <button
            type="button"
            role="tab"
            id="inspector-tab-note"
            aria-selected={pane === 'note'}
            aria-controls="inspector-panel"
            onClick={() => setInspectorTab('note')}
          >
            Note
            {topic.note && <span className="tab-mark" aria-label="has a note" />}
          </button>
        </div>
      )}
      <div
        className="panel-scroll"
        id="inspector-panel"
        data-pane={pane}
        role={many ? undefined : 'tabpanel'}
        aria-labelledby={many ? undefined : `inspector-tab-${pane}`}
      >
        {pane === 'note' ? (
          <section id="inspector-section-note" className="note-pane" aria-label="Note">
            <NoteTab key={focus} topic={topic} />
          </section>
        ) : (
          SECTIONS.filter((x) => x.id !== 'note' && (!many || x.id === 'properties')).map(
            ({ id, label, icon }) => {
              const isOpen = sections[id];
              return (
                <section
                  key={id}
                  id={`inspector-section-${id}`}
                  className="panel-section"
                  aria-label={label}
                >
                  <button
                    type="button"
                    className="panel-section-head"
                    aria-expanded={isOpen}
                    aria-controls={`inspector-body-${id}`}
                    onClick={() => toggleSection(id)}
                  >
                    <Icon name={icon} />
                    <span>{label}</span>
                    <span className="panel-section-summary">
                      {many ? '' : summaryOf(id, topic)}
                    </span>
                    <Icon name={isOpen ? 'chevron-down' : 'chevron-right'} />
                  </button>
                  {isOpen && (
                    <div id={`inspector-body-${id}`} className="panel-section-body">
                      {id === 'properties' && <PropertiesTab />}
                      {id === 'stickers' && <StickersTab key={focus} topic={topic} />}
                    </div>
                  )}
                </section>
              );
            },
          )
        )}
        {many && (
          <p className="inspector-hint panel-note">
            Select one topic to edit its note and stickers.
          </p>
        )}
      </div>
    </aside>
  );
}

// ---------- Note ----------

interface Wrap {
  label: string;
  before: string;
  after: string;
  placeholder: string;
  /** Applies to the start of each selected line instead of around the text. */
  line?: boolean;
}

const WRAPS: Wrap[] = [
  { label: 'Bold', before: '**', after: '**', placeholder: 'bold' },
  { label: 'Italic', before: '*', after: '*', placeholder: 'italic' },
  { label: 'Heading', before: '## ', after: '', placeholder: 'Heading', line: true },
  { label: 'Bullet list', before: '- ', after: '', placeholder: 'Item', line: true },
  { label: 'Task list', before: '- [ ] ', after: '', placeholder: 'Task', line: true },
  { label: 'Code', before: '`', after: '`', placeholder: 'code' },
  { label: 'Link', before: '[', after: '](https://)', placeholder: 'text' },
];

function NoteTab({ topic }: { topic: Topic }) {
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const area = useRef<HTMLTextAreaElement>(null);
  const note = topic.note ?? '';

  const write = (value: string, caret?: [number, number]) => {
    const { doc, commit } = canopyStore.getState();
    commit(setNote(doc, topic.id, value), { group: `note:${topic.id}` });
    if (caret) {
      requestAnimationFrame(() => {
        area.current?.focus();
        area.current?.setSelectionRange(caret[0], caret[1]);
      });
    }
  };

  const apply = (w: Wrap) => {
    const el = area.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b, value } = el;
    if (w.line) {
      const start = value.lastIndexOf('\n', a - 1) + 1;
      const chunk = value.slice(start, b) || w.placeholder;
      const lines = chunk.split('\n').map((l) => w.before + l);
      const out = value.slice(0, start) + lines.join('\n') + value.slice(b);
      write(out, [start, start + lines.join('\n').length]);
      return;
    }
    const picked = value.slice(a, b) || w.placeholder;
    const out = value.slice(0, a) + w.before + picked + w.after + value.slice(b);
    write(out, [a + w.before.length, a + w.before.length + picked.length]);
  };

  return (
    <div className="note-tab">
      <div className="note-toolbar">
        <div className="segmented" role="group" aria-label="Note view">
          <button type="button" aria-pressed={mode === 'write'} onClick={() => setMode('write')}>
            Write
          </button>
          <button
            type="button"
            aria-pressed={mode === 'preview'}
            onClick={() => setMode('preview')}
          >
            Preview
          </button>
        </div>
        {mode === 'write' && (
          <div className="note-format" role="toolbar" aria-label="Formatting">
            {WRAPS.map((w) => (
              <button
                key={w.label}
                type="button"
                aria-label={w.label}
                data-tip={w.label}
                onClick={() => apply(w)}
              >
                {
                  {
                    Bold: 'B',
                    Italic: 'I',
                    Heading: 'H',
                    'Bullet list': '•',
                    'Task list': '☑',
                    Code: '</>',
                    Link: '🔗',
                  }[w.label]
                }
              </button>
            ))}
          </div>
        )}
      </div>
      {mode === 'write' ? (
        <textarea
          ref={area}
          className="note-input"
          aria-label="Note"
          placeholder="Write a note. Markdown works: **bold**, lists, - [ ] tasks, tables and links."
          spellCheck
          value={note}
          onChange={(e) => write(e.target.value)}
        />
      ) : note.trim() ? (
        <Markdown source={note} />
      ) : (
        <p className="inspector-empty">Nothing to preview yet.</p>
      )}
    </div>
  );
}

// ---------- Stickers ----------

function Sticker({ name, size = 28 }: { name: string; size?: number }) {
  return (
    <svg viewBox="-2 -2 36 38" width={size} height={size} aria-hidden="true">
      <StickerArt name={name} />
    </svg>
  );
}

function StickersTab({ topic }: { topic: Topic }) {
  const [query, setQuery] = useState('');
  const onLine = useUi((s) => s.edgeFocus === topic.id) && topic.parentId !== null;
  const placed = (onLine ? topic.edge?.stickers : topic.stickers) ?? [];
  const max = onLine ? MAX_EDGE_STICKERS : MAX_STICKERS;
  const full = placed.length >= max;
  const on = new Set(placed.map((s) => s.key));
  const shown = searchStickers(query);
  const where = onLine ? 'line' : 'topic';
  const target = useRef<HTMLDivElement>(null);
  const nudge = useUi((s) => s.edgeNudge);

  // Pointing at a line brings its controls into view and flashes them once.
  useEffect(() => {
    const el = target.current;
    if (!onLine || !el) return;
    el.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    el.removeAttribute('data-flash');
    void el.offsetWidth;
    el.setAttribute('data-flash', '');
  }, [onLine, nudge]);

  // Each sticker is a switch: a press puts it on, and a press on one that is on takes it off.
  const toggle = (key: string) => {
    const { doc, commit } = canopyStore.getState();
    const next = onLine ? toggleEdgeSticker(doc, topic.id, key) : toggleSticker(doc, topic.id, key);
    if (next === doc) {
      showToast(
        onLine
          ? `The line holds ${max} stickers. Take one off to add another.`
          : `All ${max} corners are taken. Take a sticker off to add another.`,
      );
      return;
    }
    const before = doc.topics[topic.id];
    const after = next.topics[topic.id];
    if (onLine) markFresh(before?.edge?.stickers, after?.edge?.stickers);
    else markFresh(before?.stickers, after?.stickers);
    commit(next);
  };

  return (
    <div className="stickers-tab">
      <div className="edge-target" ref={target}>
        {topic.parentId !== null && (
          <div className="segmented sticker-target" role="group" aria-label="Put stickers on">
            <button type="button" aria-pressed={!onLine} onClick={() => setEdgeFocus(null)}>
              Topic
            </button>
            <button type="button" aria-pressed={onLine} onClick={() => setEdgeFocus(topic.id)}>
              Line to parent
            </button>
          </div>
        )}
        {onLine && (
          <label className="edge-label-field">
            <span>Label</span>
            <input
              type="text"
              value={topic.edge?.label ?? ''}
              maxLength={MAX_EDGE_LABEL}
              placeholder="such as depends on"
              onChange={(e) => {
                const { doc, commit } = canopyStore.getState();
                commit(setEdgeLabel(doc, topic.id, e.target.value), { group: `edge:${topic.id}` });
              }}
            />
          </label>
        )}
      </div>
      <input
        type="search"
        className="sticker-search"
        aria-label="Search stickers"
        placeholder="Search stickers"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {shown.length === 0 ? (
        <p className="inspector-empty">No stickers match.</p>
      ) : (
        <ul className="sticker-grid" aria-label="Stickers">
          {shown.map((s) => {
            const applied = on.has(s.key);
            return (
              <li key={s.key}>
                <button
                  type="button"
                  aria-label={s.name}
                  aria-pressed={applied}
                  data-tip={applied ? `${s.name}. Click to take off` : s.name}
                  disabled={full && !applied}
                  onClick={() => toggle(s.key)}
                >
                  <Sticker name={s.key} />
                  {applied && (
                    <span className="sticker-check" aria-hidden="true">
                      <svg viewBox="0 0 12 12" width="9" height="9">
                        <path
                          d="M2.5 6.4l2.4 2.4 4.6-5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="inspector-hint">
        {full
          ? `This ${where} is full (${max} of ${max}). Click a marked sticker to take it off.`
          : `Click a sticker to put it on, or again to take it off. ${placed.length} of ${max} used.`}
      </p>
    </div>
  );
}
