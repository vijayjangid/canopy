import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useStore } from 'zustand';
import { announce } from '../a11y';
import { focusCanvas } from '../canvas/layoutState';
import { viewportStore } from '../canvas/viewportStore';
import { topicRows, textLines, typeForDepth, TOPIC_PADDING, type TopicBox } from '../layout';
import {
  isExpansion,
  mayHaveTokens,
  parseExpansion,
  parseTitle,
  renameTopic,
  type Branch,
} from '../model';
import { useSettings } from '../settings';
import { convertTitleTokens } from './titleTokens';
import { canopyStore, useCanopy } from '../store';
import { textWidth } from '../canvas/metrics';
import { cornerRadius } from '../canvas/TopicNode';
import { discardBlank, leaveBlank } from './discardBlank';
import { expressionGuide } from './expressionGuide';
import { formatShortcut } from './shortcuts';
import { executeCommand } from './commands';
import { appContext } from './context';
import './title-editor.css';

/** The names an expansion will make, such as "a › b · c". */
function summarize(branches: Branch[]): string {
  const chain = (b: Branch): string => [b.title, ...b.children.map(chain)].join(' › ');
  const text = branches.map(chain).join('  ·  ');
  return text.length > 80 ? `${text.slice(0, 79)}…` : text;
}

/** Edits a topic title in place, over the topic, at the current zoom. */
export function TitleEditor({ box }: { box: TopicBox }) {
  const title = useCanopy((s) => s.doc.topics[box.id]?.title ?? '');
  const topic = useCanopy((s) => s.doc.topics[box.id]);
  const look = useCanopy((s) => s.doc.prefs.look);
  const vp = useStore(viewportStore, (s) => s.vp);
  const field = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    field.current?.focus();
    field.current?.select();
  }, []);

  // A topic that is still empty when its editor goes away was never filled in, so it is dropped.
  // Enter and Tab move on to a new topic, so a blank one is remembered and dropped with the last.
  const [started] = useState(() => ({
    blank: title.trim() === '',
    past: canopyStore.getState().editBase?.pastLength ?? -1,
  }));
  const moveOn = useRef(false);
  useEffect(() => {
    const id = box.id;
    return () => {
      if (moveOn.current) {
        if (started.blank) leaveBlank(id);
        return;
      }
      // Wait a beat: React may remount this effect straight away, and a topic that is still
      // being edited must stay.
      queueMicrotask(() => discardBlank(id, started.blank ? started.past : null));
    };
  }, [box.id, started]);

  const style = typeForDepth(box.depth);
  const lineCount = textLines(title, box.depth, textWidth).length;
  // Stickers and icons sit in a row under the title, so the title centres above them.
  const rowH = topic ? topicRows(topic).total : 0;
  const padTop =
    rowH > 0
      ? TOPIC_PADDING.y
      : Math.max(TOPIC_PADDING.y, (box.h - lineCount * style.lineHeight) / 2);

  // Shorthand typed so far, shown under the topic before it becomes Properties.
  const doc = useCanopy((s) => s.doc);
  const preview = useMemo(
    () => (mayHaveTokens(title) ? parseTitle(doc, title).tokens : []),
    [doc, title],
  );

  // `!!a>b, c` shows what it will make before it is finished.
  const expandOn = useSettings((s) => s.textExpansion);
  const expansion = useMemo(
    () => (expandOn && isExpansion(title) ? parseExpansion(title) : null),
    [expandOn, title],
  );

  // Typing !! switches the title into expression mode, and this shows it.
  const expressing = expandOn && box.depth > 0 && isExpansion(title);

  const guide = useMemo(() => (expressing ? expressionGuide(title) : null), [expressing, title]);

  // The guide's buttons type for you, and keep the cursor where it was.
  const insert = (text: string) => {
    field.current?.focus();
    document.execCommand('insertText', false, text);
  };

  const finish = () => {
    convertTitleTokens(canopyStore, box.id);
    canopyStore.getState().setEditing(null);
    focusCanvas();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    const mod = e.metaKey || e.ctrlKey;
    if (e.key === 'Escape') {
      e.preventDefault();
      canopyStore.getState().cancelEdit();
      focusCanvas();
      announce('Edit cancelled');
    } else if (e.key === 'Enter' && (mod || e.altKey || e.shiftKey)) {
      // Shift, Cmd and Alt with Enter break the line inside the title.
      e.preventDefault();
      // Typing it natively keeps the caret and the undo history right.
      document.execCommand('insertText', false, '\n');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      convertTitleTokens(canopyStore, box.id);
      moveOn.current = true;
      executeCommand('topic.addPeerAfter', appContext);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) finish();
      else {
        convertTitleTokens(canopyStore, box.id);
        moveOn.current = true;
        executeCommand('topic.addChild', appContext);
      }
    }
  };

  return (
    <>
      <textarea
        ref={field}
        className="title-editor"
        data-depth={Math.min(box.depth, 3)}
        data-expression={expressing || undefined}
        aria-label="Topic title"
        placeholder="New topic"
        rows={1}
        value={title}
        spellCheck={false}
        onChange={(e) => {
          const { doc, commit } = canopyStore.getState();
          const next = renameTopic(doc, box.id, e.target.value.replace(/\r\n?/g, '\n'));
          commit(next, { group: `rename:${box.id}` });
        }}
        onKeyDown={onKeyDown}
        onBlur={() => {
          // Moving to another topic's editor changes `editing` first, so only end our own edit.
          if (canopyStore.getState().editing === box.id) {
            convertTitleTokens(canopyStore, box.id);
            canopyStore.getState().setEditing(null);
          }
        }}
        // Sized in layout units and scaled as a whole, so text wraps exactly like the drawn topic.
        style={{
          left: box.x * vp.k + vp.x,
          top: box.y * vp.k + vp.y,
          width: box.w,
          height: box.h,
          transform: `scale(${vp.k})`,
          fontSize: style.size,
          fontWeight: style.weight,
          lineHeight: `${style.lineHeight}px`,
          padding: `${padTop}px ${TOPIC_PADDING.x}px 0`,
          borderRadius: cornerRadius(look, box.depth, box.h),
        }}
      />
      {expressing && (
        <span
          className="title-mode"
          role="status"
          style={{ left: box.x * vp.k + vp.x, top: box.y * vp.k + vp.y - 8 }}
        >
          <b aria-hidden="true">!!</b> Expression
          <span className="sr-only">
            : {'a>b'} makes children, {'a, b'} makes siblings
          </span>
        </span>
      )}
      {guide && (
        <div
          className="title-guide"
          style={{ left: box.x * vp.k + vp.x, top: (box.y + box.h) * vp.k + vp.y + 8 }}
        >
          <p className="title-guide-message" aria-live="polite">
            {guide.message}
          </p>
          <div className="title-guide-keys">
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insert('>')}
            >
              <kbd>&gt;</kbd> Child
            </button>
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insert(',')}
            >
              <kbd>,</kbd> Sibling
            </button>
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={finish}
            >
              <kbd>{formatShortcut({ key: 'Tab', shift: true })}</kbd> Apply
            </button>
          </div>
          {expansion && (
            <p className="title-guide-preview">
              {expansion.count} {expansion.count === 1 ? 'topic' : 'topics'}:{' '}
              {summarize(expansion.branches)}
            </p>
          )}
        </div>
      )}
      {preview.length > 0 && !guide && (
        <p
          className="title-tokens"
          role="status"
          style={{ left: box.x * vp.k + vp.x, top: (box.y + box.h) * vp.k + vp.y + 8 }}
        >
          {preview.map((t) => t.label).join(' · ')}
          <span> Enter to apply</span>
        </p>
      )}
    </>
  );
}
