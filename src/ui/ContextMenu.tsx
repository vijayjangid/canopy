import { useEffect, useLayoutEffect, useRef, type KeyboardEvent } from 'react';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { focusCanvas } from '../canvas/layoutState';
import { navigateToTopic, removeReference } from '../canvas/navigation';
import { copyFromMenu, pasteFromMenu } from '../editor/clipboard';
import { executeCommand } from '../editor/commands';
import { appContext } from '../editor/context';
import { COMMANDS, formatShortcut, type CommandId } from '../editor/shortcuts';
import { hasChildren } from '../model';
import { canRedo, canUndo, canopyStore } from '../store';
import { Icon, type IconName } from './icons';
import { uiStore } from './uiStore';
import './context-menu.css';

type Where = 'topic' | 'canvas' | 'reference';

interface Open {
  x: number;
  y: number;
  where: Where;
  entries: Entry[];
}

const menuStore = createStore<{ at: Open | null }>(() => ({ at: null }));

/** Entries are read when the menu opens, so they reflect the selection at that moment. */
export const openContextMenu = (x: number, y: number, where: Where) =>
  menuStore.setState({
    at: { x, y, where, entries: where === 'topic' ? topicEntries() : canvasEntries() },
  });
export const closeContextMenu = () => menuStore.setState({ at: null });

/** The menu for a reference line, opened by right-clicking it. */
export function openReferenceMenu(x: number, y: number, from: string): void {
  menuStore.setState({
    at: {
      x,
      y,
      where: 'reference',
      entries: [
        head('Reference'),
        {
          kind: 'item',
          label: 'Go to referenced topic',
          icon: 'arrow-right',
          run: () => {
            const to = canopyStore.getState().doc.topics[from]?.referenceTo;
            if (to) navigateToTopic(to);
          },
        },
        {
          kind: 'item',
          label: 'Change reference…',
          icon: 'link',
          run: () => appContext.app?.topicSearch(from),
        },
        { kind: 'separator' },
        {
          kind: 'item',
          label: 'Remove reference',
          icon: 'trash',
          danger: true,
          run: () => removeReference(from),
        },
      ],
    },
  });
}

type Entry =
  | {
      kind: 'item';
      label: string;
      icon: IconName;
      keys?: string;
      run: () => void;
      disabled?: boolean;
      danger?: boolean;
    }
  | { kind: 'heading'; label: string }
  | { kind: 'separator' };

const keysOf = (id: CommandId) => {
  const first = COMMANDS.find((c) => c.id === id)?.shortcuts[0];
  return first ? formatShortcut(first) : undefined;
};

const cmd = (
  label: string,
  id: CommandId,
  icon: IconName,
  options: { disabled?: boolean; danger?: boolean } = {},
): Entry => ({
  kind: 'item',
  label,
  icon,
  keys: keysOf(id),
  ...options,
  run: () => void executeCommand(id, appContext),
});

const clip = (
  label: string,
  icon: IconName,
  key: string,
  shift: boolean,
  run: () => void,
  disabled = false,
): Entry => ({
  kind: 'item',
  label,
  icon,
  keys: `${formatShortcut({ key: 'x', mod: true }).slice(0, -1)}${shift ? '⇧' : ''}${key}`,
  disabled,
  run,
});

const head = (label: string): Entry => ({ kind: 'heading', label });

/** Groups read top to bottom: add, change, describe, arrange, and last, remove. */
function topicEntries(): Entry[] {
  const { doc, focus, selection } = canopyStore.getState();
  const core = focus === doc.coreId;
  const many = selection.length > 1;
  return [
    head('Add'),
    cmd('Add sub-topic', 'topic.addChild', 'sub-topic', { disabled: many }),
    cmd(
      doc.topics[focus]?.referenceTo ? 'Change reference…' : 'Reference to…',
      'topic.reference',
      'link',
      { disabled: many },
    ),
    ...(core
      ? []
      : [
          cmd('Add peer below', 'topic.addPeerAfter', 'arrow-down', { disabled: many }),
          cmd('Add peer above', 'topic.addPeerBefore', 'arrow-up', { disabled: many }),
          cmd(many ? 'Wrap in a new topic' : 'Insert a topic above', 'topic.wrap', 'insert-level'),
        ]),
    ...(hasChildren(doc, focus)
      ? [cmd('Insert a topic below', 'topic.insertBelow', 'insert-level', { disabled: many })]
      : []),

    head('Edit'),
    cmd('Edit title', 'topic.edit', 'edit', { disabled: many }),
    clip(
      many ? 'Cut topics' : 'Cut',
      'cut',
      'X',
      false,
      () => void copyFromMenu(appContext, true),
      core,
    ),
    clip(
      many ? 'Copy topics' : 'Copy',
      'copy',
      'C',
      false,
      () => void copyFromMenu(appContext, false),
    ),
    clip(
      'Paste as sub-topics',
      'paste',
      'V',
      false,
      () => void pasteFromMenu(appContext, false),
      many,
    ),
    ...(core
      ? []
      : [
          clip(
            'Paste as peers',
            'paste',
            'V',
            true,
            () => void pasteFromMenu(appContext, true),
            many,
          ),
          cmd('Duplicate', 'topic.duplicate', 'duplicate'),
        ]),

    head('Details'),
    cmd('Set status…', 'props.status', 'status'),
    cmd('Set due date…', 'props.due', 'calendar'),
    cmd('Add tag…', 'props.tag', 'tag'),
    cmd('Write a note', 'note.open', 'note', { disabled: many }),
    cmd('Add a sticker', 'stickers.open', 'stickers', { disabled: many }),
    ...(doc.topics[focus]?.parentId
      ? [
          cmd('Label the line…', 'edge.label', 'edit', { disabled: many }),
          cmd('Add a sticker to the line', 'edge.sticker', 'stickers', { disabled: many }),
        ]
      : []),
    ...(doc.topics[focus]?.image
      ? [
          cmd('Describe picture…', 'topic.imageAlt', 'edit', { disabled: many }),
          cmd('Remove picture', 'topic.imageRemove', 'trash', { disabled: many }),
        ]
      : []),
    cmd('All properties…', 'props.open', 'properties'),

    ...(core || uiStore.getState().focusBranch
      ? []
      : [cmd('Fold everything above', 'view.focusBranch', 'collapse')]),
    ...(hasChildren(doc, focus)
      ? [
          head('Branch'),
          cmd(
            doc.topics[focus]?.folded ? 'Unfold' : 'Fold',
            'topic.toggleFold',
            doc.topics[focus]?.folded ? 'expand' : 'collapse',
          ),
        ]
      : []),

    ...(core
      ? []
      : [
          { kind: 'separator' } as Entry,
          ...(hasChildren(doc, focus)
            ? [cmd('Delete topic only', 'topic.deleteKeep', 'trash', { danger: true })]
            : []),
          cmd(
            hasChildren(doc, focus) ? 'Delete whole branch…' : 'Delete',
            'topic.delete',
            'trash',
            { danger: true },
          ),
        ]),
  ];
}

function canvasEntries(): Entry[] {
  const state = canopyStore.getState();
  const { doc, focus } = state;
  const name = doc.topics[focus]?.title.trim() || 'Empty topic';
  return [
    head('Edit'),
    cmd('Undo', 'edit.undo', 'undo', { disabled: !canUndo(state) }),
    cmd('Redo', 'edit.redo', 'redo', { disabled: !canRedo(state) }),
    clip('Paste', 'paste', 'V', false, () => void pasteFromMenu(appContext, false)),
    cmd(
      `Add sub-topic to “${name.length > 22 ? `${name.slice(0, 21)}…` : name}”`,
      'topic.addChild',
      'sub-topic',
    ),

    head('View'),
    ...(focus === doc.coreId || uiStore.getState().focusBranch
      ? []
      : [cmd('Fold everything above', 'view.focusBranch', 'collapse')]),
    cmd('Unfold everything', 'view.unfoldAll', 'braces'),

    head('More'),
    cmd('Search and filter…', 'filter.open', 'filter'),
    cmd('Export…', 'export.open', 'export'),
    cmd('Keyboard shortcuts', 'help.shortcuts', 'keyboard'),
  ];
}

/** A right-click menu with the actions that otherwise need a shortcut. */
export function ContextMenu() {
  const at = useStore(menuStore, (s) => s.at);
  const ref = useRef<HTMLDivElement>(null);

  // Keep the menu on screen, flipping above or left of the pointer when it would overflow.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!at || !el) return;
    const { width, height } = el.getBoundingClientRect();
    el.style.left = `${Math.max(8, Math.min(at.x, window.innerWidth - width - 8))}px`;
    el.style.top = `${at.y + height > window.innerHeight - 8 ? Math.max(8, at.y - height) : at.y}px`;
    el.style.visibility = 'visible';
    el.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')?.focus();
  }, [at]);

  useEffect(() => {
    if (!at) return;
    const away = (e: Event) => {
      if (!ref.current?.contains(e.target as Node)) closeContextMenu();
    };
    const close = () => closeContextMenu();
    window.addEventListener('pointerdown', away, true);
    window.addEventListener('wheel', close, { passive: true });
    window.addEventListener('resize', close);
    window.addEventListener('blur', close);
    return () => {
      window.removeEventListener('pointerdown', away, true);
      window.removeEventListener('wheel', close);
      window.removeEventListener('resize', close);
      window.removeEventListener('blur', close);
    };
  }, [at]);

  if (!at) return null;

  const items = () =>
    Array.from(
      ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? [],
    );

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault();
      closeContextMenu();
      focusCanvas();
      return;
    }
    const list = items();
    const at0 = list.indexOf(document.activeElement as HTMLElement);
    const move = (to: number) => {
      e.preventDefault();
      list[(to + list.length) % list.length]?.focus();
    };
    if (e.key === 'ArrowDown') move(at0 + 1);
    else if (e.key === 'ArrowUp') move(at0 < 0 ? list.length - 1 : at0 - 1);
    else if (e.key === 'Home') move(0);
    else if (e.key === 'End') move(list.length - 1);
  };

  return (
    <div
      ref={ref}
      className="context-menu"
      role="menu"
      aria-label={at.where === 'topic' ? 'Topic actions' : 'Map actions'}
      tabIndex={-1}
      style={{ left: at.x, top: at.y, visibility: 'hidden' }}
      onKeyDown={onKeyDown}
      onContextMenu={(e) => e.preventDefault()}
    >
      {at.entries.map((entry, i) => {
        if (entry.kind === 'separator') return <div key={i} role="separator" />;
        if (entry.kind === 'heading') {
          return (
            <div key={i} className="context-heading" role="presentation">
              {entry.label}
            </div>
          );
        }
        return (
          <button
            key={i}
            type="button"
            role="menuitem"
            data-danger={entry.danger || undefined}
            tabIndex={-1}
            disabled={entry.disabled}
            onClick={() => {
              closeContextMenu();
              focusCanvas();
              entry.run();
            }}
          >
            <Icon name={entry.icon} />
            <span>{entry.label}</span>
            {entry.keys && <kbd>{entry.keys}</kbd>}
          </button>
        );
      })}
    </div>
  );
}
