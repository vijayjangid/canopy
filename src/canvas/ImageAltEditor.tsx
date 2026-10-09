import { useEffect, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { announce } from '../a11y';
import { IMAGE_PAD, imageSize, type Layout } from '../layout';
import { MAX_IMAGE_ALT, setImageAlt } from '../model';
import { canopyStore, useCanopy } from '../store';
import { stopImageAltEdit } from '../ui/uiStore';
import { focusCanvas } from './layoutState';
import { viewportStore } from './viewportStore';

/** Types the description of a picture, in a field laid over its lower edge. */
export function ImageAltEditor({ id, layout }: { id: string; layout: Layout }) {
  const vp = useStore(viewportStore, (s) => s.vp);
  const image = useCanopy((s) => s.doc.topics[id]?.image);
  const field = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(() => image?.alt ?? '');
  const done = useRef(false);

  useEffect(() => {
    field.current?.focus();
    field.current?.select();
  }, []);

  const box = layout.boxes.get(id);
  const picture = imageSize(image);
  if (!box || !picture) return null;

  const finish = (keep: boolean) => {
    if (done.current) return;
    done.current = true;
    if (keep) {
      const { doc, commit } = canopyStore.getState();
      commit(setImageAlt(doc, id, text));
      announce(text.trim() ? 'Picture description saved' : 'Picture description cleared');
    }
    stopImageAltEdit();
  };

  const width = Math.max(180, Math.min(box.w - IMAGE_PAD * 2, 320));
  return (
    <input
      ref={field}
      className="image-alt-editor"
      aria-label="Picture description"
      placeholder="Describe this picture"
      maxLength={MAX_IMAGE_ALT}
      value={text}
      spellCheck
      style={{
        left: (box.x + box.w / 2) * vp.k + vp.x,
        top: (box.y + IMAGE_PAD + picture.h - 6) * vp.k + vp.y,
        width,
        transform: `translate(-50%, -100%) scale(${vp.k})`,
        transformOrigin: '50% 100%',
      }}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        if (e.nativeEvent.isComposing) return;
        if (e.key === 'Enter') {
          e.preventDefault();
          finish(true);
          focusCanvas();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          finish(false);
          focusCanvas();
          announce('Edit cancelled');
        }
        e.stopPropagation();
      }}
      onBlur={() => finish(true)}
    />
  );
}
