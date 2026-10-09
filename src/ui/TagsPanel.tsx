import { useEffect, useId, useRef, useState } from 'react';
import { planningOf, removeTag, updateTag } from '../model';
import { canopyStore, useCanopy } from '../store';
import { Icon } from './icons';
import './tags-panel.css';

/** Common tag colours: chosen to read well with white or black text on top. */
const PALETTE = [
  '#e03131',
  '#e8590c',
  '#f59f00',
  '#40c057',
  '#15aabf',
  '#228be6',
  '#5b4bdb',
  '#9c36b5',
  '#e64980',
  '#868e96',
  '#343a40',
];

const HEX = /^#[0-9a-f]{6}$/i;

function ColourPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (colour: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const popId = useId();
  const current = HEX.test(value) ? value.toLowerCase() : '#5b4bdb';
  const custom = !PALETTE.includes(current);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);

  return (
    // Escape closes the popover from any swatch inside it.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className="colour-picker"
      ref={root}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.preventDefault();
          setOpen(false);
          root.current?.querySelector<HTMLElement>('.colour-dot')?.focus();
        }
      }}
    >
      <button
        type="button"
        className="colour-dot"
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? popId : undefined}
        style={{ background: current }}
        onClick={() => setOpen(!open)}
      />
      {open && (
        <div className="colour-pop" id={popId} role="group" aria-label={`${label}, choose`}>
          <div className="colour-grid">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                className="colour-dot"
                aria-label={c}
                aria-pressed={c === current}
                style={{ background: c }}
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                }}
              />
            ))}
            <label
              className="colour-dot colour-custom"
              data-active={custom || undefined}
              style={custom ? { background: current } : undefined}
              data-tip="Custom colour"
            >
              <span className="sr-only">Custom colour</span>
              {!custom && <Icon name="plus" />}
              <input type="color" value={current} onChange={(e) => onChange(e.target.value)} />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

/** The tags of this map: rename, recolour and delete. */
export function TagsPanel() {
  const doc = useCanopy((s) => s.doc);
  const tags = planningOf(doc).tags;

  const edit = (key: string, patch: { label?: string; color?: string }) => {
    const { doc: d, commit } = canopyStore.getState();
    commit(updateTag(d, key, patch), { group: `tag:${key}` });
  };

  if (tags.length === 0) {
    return (
      <p className="pref-hint">
        No tags yet. Add one from a topic, or type #name in a title. Tags show as badges and can be
        used as filters.
      </p>
    );
  }

  return (
    <div className="prefs">
      <ul className="tag-edit" aria-label="Tags">
        {tags.map((t) => (
          <li key={t.key}>
            <ColourPicker
              label={`Colour of tag ${t.label}`}
              value={t.color}
              onChange={(color) => edit(t.key, { color })}
            />
            <input
              type="text"
              aria-label={`Name of tag ${t.label}`}
              value={t.label}
              onChange={(e) => edit(t.key, { label: e.target.value || ' ' })}
            />
            <button
              type="button"
              className="tag-delete"
              aria-label={`Delete tag ${t.label}`}
              data-tip="Delete tag"
              onClick={() => {
                const { doc: d, commit } = canopyStore.getState();
                commit(removeTag(d, t.key));
              }}
            >
              <Icon name="close" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
