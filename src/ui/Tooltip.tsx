import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './tooltip.css';

type Side = 'top' | 'bottom' | 'left' | 'right';

interface Tip {
  text: string;
  rect: DOMRect;
  side: Side;
}

const SHOW_DELAY = 450;
const GAP = 8;

/**
 * One tooltip for the whole app. Any element with `data-tip="Text"` gets it on hover or keyboard
 * focus, and `data-tip-side` picks the side it prefers. The element must carry its own accessible
 * name, since the tooltip only repeats it.
 */
export function TooltipHost() {
  const [tip, setTip] = useState<Tip | null>(null);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timer = 0;
    let current: Element | null = null;
    let lastShown = 0;

    const hide = () => {
      window.clearTimeout(timer);
      current = null;
      setVisible(false);
    };
    const show = (el: HTMLElement, delay: number) => {
      window.clearTimeout(timer);
      current = el;
      timer = window.setTimeout(() => {
        const text = el.dataset['tip'];
        if (!text || !el.isConnected) return;
        lastShown = Date.now();
        setTip({
          text,
          rect: el.getBoundingClientRect(),
          side: (el.dataset['tipSide'] as Side | undefined) ?? 'bottom',
        });
        // One frame later, so the first showing fades in too.
        requestAnimationFrame(() => setVisible(true));
      }, delay);
    };
    const find = (target: EventTarget | null) =>
      target instanceof Element ? target.closest<HTMLElement>('[data-tip]') : null;

    const onOver = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const el = find(e.target);
      if (el === current) return;
      if (!el) return hide();
      // Moving along a row of buttons shows the next tip at once.
      show(el, Date.now() - lastShown < 600 ? 60 : SHOW_DELAY);
    };
    const onFocus = (e: FocusEvent) => {
      const el = find(e.target);
      if (el && el.matches(':focus-visible')) show(el, 0);
    };

    document.addEventListener('pointerover', onOver);
    document.addEventListener('focusin', onFocus);
    document.addEventListener('focusout', hide);
    document.addEventListener('pointerdown', hide, true);
    document.addEventListener('keydown', hide, true);
    document.addEventListener('scroll', hide, true);
    window.addEventListener('blur', hide);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('pointerover', onOver);
      document.removeEventListener('focusin', onFocus);
      document.removeEventListener('focusout', hide);
      document.removeEventListener('pointerdown', hide, true);
      document.removeEventListener('keydown', hide, true);
      document.removeEventListener('scroll', hide, true);
      window.removeEventListener('blur', hide);
    };
  }, []);

  // Place it beside its element, on the other side when it would run off the screen.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!tip || !el) return;
    const { width, height } = el.getBoundingClientRect();
    const { rect } = tip;
    const room = {
      top: rect.top - height - GAP >= 4,
      bottom: rect.bottom + height + GAP <= window.innerHeight - 4,
      left: rect.left - width - GAP >= 4,
      right: rect.right + width + GAP <= window.innerWidth - 4,
    };
    const opposite = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' } as const;
    const side = room[tip.side]
      ? tip.side
      : room[opposite[tip.side]]
        ? opposite[tip.side]
        : tip.side;
    const horizontal = side === 'left' || side === 'right';
    const left = horizontal
      ? side === 'left'
        ? rect.left - width - GAP
        : rect.right + GAP
      : rect.left + rect.width / 2 - width / 2;
    const top = horizontal
      ? rect.top + rect.height / 2 - height / 2
      : side === 'top'
        ? rect.top - height - GAP
        : rect.bottom + GAP;
    el.style.left = `${Math.max(4, Math.min(left, window.innerWidth - width - 4))}px`;
    el.style.top = `${Math.max(4, Math.min(top, window.innerHeight - height - 4))}px`;
    el.dataset['side'] = side;
  }, [tip]);

  if (!tip) return null;
  return (
    <div ref={ref} className="tooltip" role="tooltip" data-visible={visible || undefined}>
      {tip.text}
    </div>
  );
}
