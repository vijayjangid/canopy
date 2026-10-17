import { useEffect, useRef, type KeyboardEvent } from 'react';
import { focusCanvas } from '../canvas/layoutState';
import {
  MAX_EDGE_LABEL,
  MAX_EDGE_STICKERS,
  MAX_STICKERS,
  ancestorsOf,
  childrenOf,
  renameTopic,
  setEdgeLabel,
  toggleEdgeSticker,
  toggleSticker,
  type Topic,
} from '../model';
import { prefersReducedMotion } from '../motion';
import { markFresh } from '../canvas/stampStore';
import { canopyStore, useCanopy } from '../store';
import { StickerArt } from '../stickers/art';
import { STICKERS } from '../stickers/catalog';
import { Icon } from './icons';
import { InfoTip } from './InfoTip';
import { NotesTab, PropertiesTab } from './PropertiesTab';
import { showToast } from './toast';
import { closeInspector, setEdgeFocus, setInspectorTab, useUi } from './uiStore';
import './inspector.css';

const CRUMB_CHARS = 22;

/** One line, cut to `max` characters with an ellipsis. */
const clamp = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}\u2026` : text;

/** The details panel: it opens when a topic is clicked, and closes with its button. */
export function Inspector() {
  const open = useUi((s) => s.inspectorOpen);
  const target = useUi((s) => s.inspectorTab);
  const focus = useCanopy((s) => s.focus);
  const picked = useCanopy((s) => s.picked);
  const topic = useCanopy((s) => s.doc.topics[s.focus]);
  const selectionCount = useCanopy((s) => s.selection.length);
  const many = selectionCount > 1;
  const pane = !many && target === 'notes' ? 'notes' : 'details';

  // Bring the requested section into view when it is asked for.
  useEffect(() => {
    if (!open) return;
    if (target === 'stickers') {
      document.getElementById('inspector-section-stickers')?.scrollIntoView({ block: 'nearest' });
    } else {
      document.getElementById('inspector-panel')?.scrollTo({ top: 0 });
    }
  }, [focus, open, target]);

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
  const parentName = parent?.title.trim().replace(/\s+/g, ' ') || 'Empty node';
  const flow = doc.prefs.flow;
  const showLevels = doc.prefs.showLevels;

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
            <p className="panel-eyebrow">
              {many ? (
                `${selectionCount} nodes`
              ) : (
                <span
                  className="panel-core-mark"
                  role="img"
                  aria-label="Core node"
                  title="Core node"
                >
                  <Icon name="home" />
                </span>
              )}
            </p>
          ) : (
            <nav className="panel-crumb" aria-label="Parent node">
              <button
                type="button"
                aria-label={`Parent node: ${parentName}`}
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
            {many ? 'Several nodes' : <TopicTitleInput key={topic.id} topic={topic} />}
          </h2>
          {!many && showLevels && (
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
        <div className="inspector-tabs" role="tablist" aria-label="Node details">
          <button
            type="button"
            role="tab"
            id="inspector-tab-details"
            aria-selected={pane === 'details'}
            aria-controls="inspector-panel"
            onClick={() => setInspectorTab('properties')}
          >
            Details
          </button>
          <button
            type="button"
            role="tab"
            id="inspector-tab-notes"
            aria-selected={pane === 'notes'}
            aria-controls="inspector-panel"
            onClick={() => setInspectorTab('notes')}
          >
            Note
            {topic.note ? <span className="tab-mark" aria-label="has a note" /> : null}
          </button>
        </div>
      )}
      <div
        className="panel-scroll"
        id="inspector-panel"
        data-pane={pane}
        role={many ? undefined : 'tabpanel'}
        aria-labelledby={
          many ? undefined : `inspector-tab-${pane === 'details' ? 'details' : pane}`
        }
      >
        {pane === 'notes' ? (
          <section
            id="inspector-section-notes"
            className="panel-section panel-section-plain"
            aria-label="Note"
          >
            <div className="panel-section-body">
              <NotesTab key={focus} topic={topic} />
            </div>
          </section>
        ) : (
          <section
            id="inspector-section-properties"
            className="panel-section panel-section-plain"
            aria-label="Details"
          >
            <div className="panel-section-body">
              <PropertiesTab
                stickerSection={
                  !many ? (
                    <section
                      id="inspector-section-stickers"
                      className="detail-sticker-section"
                      aria-labelledby="inspector-heading-stickers"
                    >
                      <div className="panel-section-heading">
                        <h3 id="inspector-heading-stickers">Stickers</h3>
                        <span className="panel-section-rule" aria-hidden="true" />
                      </div>
                      <StickersTab key={focus} topic={topic} />
                    </section>
                  ) : null
                }
              />
            </div>
          </section>
        )}
        {many && (
          <p className="inspector-hint panel-note">
            Select one node to edit its note and stickers.
          </p>
        )}
      </div>
    </aside>
  );
}

function TopicTitleInput({ topic }: { topic: Topic }) {
  const initial = useRef(topic.title);

  return (
    <input
      className="topic-title-input"
      type="text"
      aria-label="Node title"
      value={topic.title}
      placeholder="Empty node"
      onFocus={() => {
        initial.current = topic.title;
      }}
      onChange={(event) => {
        const title = event.target.value;
        const { doc, commit } = canopyStore.getState();
        commit(renameTopic(doc, topic.id, title), { group: `rename:${topic.id}` });
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          event.currentTarget.blur();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          const { doc, commit } = canopyStore.getState();
          commit(renameTopic(doc, topic.id, initial.current), { group: `rename:${topic.id}` });
          event.currentTarget.blur();
        }
      }}
    />
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
  const onLine = useUi((s) => s.edgeFocus === topic.id) && topic.parentId !== null;
  const placed = (onLine ? topic.edge?.stickers : topic.stickers) ?? [];
  const max = onLine ? MAX_EDGE_STICKERS : MAX_STICKERS;
  const full = placed.length >= max;
  const on = new Set(placed.map((s) => s.key));
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
              Node
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
      <ul className="sticker-grid" aria-label="Stickers">
        {STICKERS.map((s) => {
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
      <p className="sticker-meta">
        <span data-full={full || undefined}>
          {full ? `Full: ${max} of ${max}` : `${placed.length} of ${max} used`}
        </span>
        <InfoTip
          text={
            full
              ? `This ${where} is full. Click a marked sticker to take it off.`
              : 'Click a sticker to put it on, or again to take it off.'
          }
          about="stickers"
        />
      </p>
    </div>
  );
}
