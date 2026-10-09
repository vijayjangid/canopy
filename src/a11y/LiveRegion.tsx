import { useStore } from 'zustand';
import { announcerStore } from './announcer';

export function LiveRegion() {
  const message = useStore(announcerStore, (s) => s.message);
  const seq = useStore(announcerStore, (s) => s.seq);
  // An invisible suffix makes a repeated message count as a change.
  return (
    <div
      className="sr-only"
      role="status"
      aria-label="Announcements"
      aria-live="polite"
      aria-atomic="true"
    >
      {message}
      {seq % 2 === 0 ? '' : '\u00a0'}
    </div>
  );
}
