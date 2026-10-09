import { Icon } from './icons';

/**
 * A small "i" that holds an explanation, so the panel can stay a clean list of names and controls.
 * The words show on hover or keyboard focus, and are the button's name for assistive technology.
 */
export function InfoTip({
  text,
  about,
  side = 'top',
}: {
  text: string;
  about?: string;
  side?: 'top' | 'bottom';
}) {
  return (
    <button
      type="button"
      className="info-tip"
      aria-label={about ? `About ${about}: ${text}` : text}
      data-tip={text}
      data-tip-side={side}
    >
      <Icon name="info" />
    </button>
  );
}
