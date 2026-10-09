import type { ReactNode } from 'react';

export type IconName =
  | 'look'
  | 'filter'
  | 'people'
  | 'planning'
  | 'export'
  | 'settings'
  | 'properties'
  | 'note'
  | 'files'
  | 'link'
  | 'folder'
  | 'trail'
  | 'insert-level'
  | 'hand'
  | 'stickers'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-down'
  | 'search'
  | 'sun'
  | 'moon'
  | 'auto'
  | 'eye'
  | 'eye-off'
  | 'arrow-right'
  | 'arrow-down'
  | 'curve'
  | 'elbow'
  | 'line'
  | 'taper'
  | 'density-compact'
  | 'density-comfortable'
  | 'density-airy'
  | 'cursor'
  | 'play'
  | 'pause'
  | 'tag'
  | 'calendar'
  | 'status'
  | 'close'
  | 'plus'
  | 'trash'
  | 'copy'
  | 'cut'
  | 'paste'
  | 'edit'
  | 'duplicate'
  | 'sub-topic'
  | 'arrow-up'
  | 'collapse'
  | 'expand'
  | 'braces'
  | 'undo'
  | 'redo'
  | 'zoom-in'
  | 'zoom-out'
  | 'keyboard'
  | 'info'
  | 'zen';

const PATHS: Record<IconName, ReactNode> = {
  look: (
    <>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 2v12M2 8h6" />
    </>
  ),
  filter: <path d="M2 3h12l-4.5 5.5V13l-3-1.5V8.5z" />,
  people: (
    <>
      <circle cx="6" cy="5.5" r="2.5" />
      <path d="M1.5 13c.3-2.4 2.1-3.8 4.5-3.8s4.2 1.4 4.5 3.8M10.5 3.3a2.4 2.4 0 0 1 0 4.4M12 9.4c1.4.5 2.3 1.6 2.5 3.6" />
    </>
  ),
  planning: <path d="M2.5 4.5l1.3 1.3 2-2.3M2.5 9.5l1.3 1.3 2-2.3M8 5h5.5M8 10h5.5" />,
  export: <path d="M8 2v8m0 0L5 7m3 3 3-3M3 12.5h10" />,
  settings: (
    <>
      <path d="M2 4.5h7M12 4.5h2M2 11.5h2M7 11.5h7" />
      <circle cx="10.5" cy="4.5" r="1.5" />
      <circle cx="5.5" cy="11.5" r="1.5" />
    </>
  ),
  properties: <path d="M2.5 4h11M2.5 8h11M2.5 12h7" />,
  note: <path d="M4 2h5.5L13 5.5V14H4zM9 2v4h4M6 8.5h5M6 11h5" />,
  info: (
    <>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 7.3v3.4M8 5.1v.1" />
    </>
  ),
  files: <path d="M11.5 7 7 11.5a2.4 2.4 0 0 1-3.4-3.4l5.3-5.3a1.6 1.6 0 0 1 2.3 2.3L6.2 10.2" />,
  link: (
    <path d="M6.5 10.5 4.8 12.2a2.3 2.3 0 0 1-3.2-3.2l3-3a2.3 2.3 0 0 1 3.2 0M9.5 5.5l1.7-1.7a2.3 2.3 0 0 1 3.2 3.2l-3 3a2.3 2.3 0 0 1-3.2 0M5.5 8.5h5" />
  ),
  'insert-level': (
    <>
      <path d="M8 1.5V5M8 11v3.5" />
      <circle cx="8" cy="8" r="2.5" />
    </>
  ),
  hand: (
    <path d="M5.500 8.500V3.500a1 1 0 0 1 2 0V7m0-4a1 1 0 0 1 2 0V7m0-3a1 1 0 0 1 2 0V8.500m0-2a1 1 0 0 1 2 0v3A4 4 0 0 1 9.500 14.500h-.8a3.500 3.500 0 0 1-2.800-1.400L3 9.300a1 1 0 0 1 1.600-1.200Z" />
  ),
  trail: (
    <>
      <circle cx="3.5" cy="12.5" r="1.6" />
      <circle cx="12.5" cy="3.5" r="1.6" />
      <path d="M5 12.5h3.5a2.5 2.5 0 0 0 0-5h-1a2.5 2.5 0 0 1 0-5H11" />
    </>
  ),
  folder: (
    <path d="M2 4.8c0-.7.5-1.3 1.3-1.3h2.9l1.5 1.7h4.9c.7 0 1.4.6 1.4 1.3v5.2c0 .7-.6 1.3-1.3 1.3H3.3c-.7 0-1.3-.6-1.3-1.3z" />
  ),
  stickers: (
    <>
      <circle cx="8" cy="8" r="6" />
      <path d="M5.5 9.5c.6 1 1.4 1.5 2.5 1.5s1.9-.5 2.5-1.5M6 6.5v.1M10 6.5v.1" />
    </>
  ),
  'chevron-left': <path d="M10 3.5 5.5 8l4.5 4.5" />,
  'chevron-right': <path d="M6 3.5 10.5 8 6 12.5" />,
  'chevron-down': <path d="M3.5 6 8 10.5 12.5 6" />,
  sun: (
    <>
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1.5V3M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M12.6 3.4l-1 1M4.4 11.6l-1 1" />
    </>
  ),
  moon: <path d="M13 9.5A5.5 5.5 0 0 1 6.5 3a5.5 5.5 0 1 0 6.5 6.5Z" />,
  auto: (
    <>
      <rect x="2" y="3" width="12" height="8" rx="1.5" />
      <path d="M6 14h4M8 11v3" />
    </>
  ),
  eye: (
    <>
      <path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z" />
      <circle cx="8" cy="8" r="2" />
    </>
  ),
  'eye-off': (
    <>
      <path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z" />
      <path d="M3 13 13 3" />
    </>
  ),
  'arrow-right': <path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" />,
  'arrow-down': <path d="M8 2.5v11M3.5 9 8 13.5 12.5 9" />,
  curve: <path d="M2 12C7 12 9 4 14 4" />,
  elbow: <path d="M2 12h5V4h7" />,
  line: <path d="M2 12 14 4" />,
  taper: <path d="M2 10C7 10 9 4.5 14 4v1.200C9 6 7 13 2 13Z" fill="currentColor" />,
  'density-compact': <path d="M3 5.500h10M3 8h10M3 10.500h10" />,
  'density-comfortable': <path d="M3 4.500h10M3 8h10M3 11.500h10" />,
  'density-airy': <path d="M3 3h10M3 8h10M3 13h10" />,
  cursor: <path d="M4 2.500l7 4.500-3 .8 2 3.200-1.500.9-2-3.300-2.500 2Z" />,
  play: <path d="M5 3l8 5-8 5Z" />,
  pause: <path d="M5.500 3v10M10.500 3v10" />,
  tag: (
    <>
      <path d="M2.500 8.500V3h5.500l5.500 5.500-5.500 5.500Z" />
      <circle cx="5.500" cy="5.500" r="1" />
    </>
  ),
  calendar: <path d="M3 4.500h10v9H3zM3 7.500h10M5.500 2.500v3M10.500 2.500v3" />,
  status: (
    <>
      <circle cx="8" cy="8" r="5.500" />
      <path d="M8 2.500a5.500 5.500 0 0 1 0 11Z" fill="currentColor" />
    </>
  ),
  close: <path d="M4 4l8 8m0-8-8 8" />,
  trash: <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5M7 7v4M9 7v4" />,
  copy: (
    <>
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
      <path d="M10.5 5.5V4A1.5 1.5 0 0 0 9 2.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 4 10.5h1.5" />
    </>
  ),
  cut: (
    <>
      <circle cx="4.5" cy="11.5" r="1.8" />
      <circle cx="11.5" cy="11.5" r="1.8" />
      <path d="M5.7 10 11 2.5M10.3 10 5 2.5" />
    </>
  ),
  paste: (
    <>
      <rect x="3.5" y="3" width="9" height="11" rx="1.5" />
      <path d="M6 3v-.8c0-.4.3-.7.7-.7h2.6c.4 0 .7.3.7.7V3M6 8h4M6 10.5h4" />
    </>
  ),
  edit: <path d="M10.5 3 13 5.5 6 12.5l-3 .5.5-3z" />,
  duplicate: (
    <>
      <rect x="2.5" y="2.5" width="8" height="8" rx="1.5" />
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
    </>
  ),
  'sub-topic': <path d="M4 3v5.5A1.5 1.5 0 0 0 5.5 10H12M9.5 7.5 12 10l-2.5 2.5" />,
  'arrow-up': <path d="M8 13.5v-11M3.5 7 8 2.5 12.5 7" />,
  collapse: (
    <>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M5.5 8h5" />
    </>
  ),
  braces: (
    <path d="M5.500 2.500Q3.500 2.500 3.500 4.500V6.500Q3.500 8 2 8Q3.500 8 3.500 9.500V11.500Q3.500 13.500 5.500 13.500M10.500 2.500Q12.500 2.500 12.500 4.500V6.500Q12.500 8 14 8Q12.500 8 12.500 9.500V11.500Q12.500 13.500 10.500 13.500" />
  ),
  expand: (
    <>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M5.5 8h5M8 5.5v5" />
    </>
  ),
  undo: <path d="M4 7h5.5a3 3 0 0 1 0 6H6M4 7l2.5-2.5M4 7l2.5 2.5" />,
  redo: <path d="M12 7H6.5a3 3 0 0 0 0 6H10M12 7l-2.5-2.5M12 7l-2.5 2.5" />,
  'zoom-in': (
    <>
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5 14 14M5.5 7h3M7 5.5v3" />
    </>
  ),
  'zoom-out': (
    <>
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5 14 14M5.5 7h3" />
    </>
  ),
  zen: <path d="M11.6 3.9A5.5 5.5 0 1 0 13.5 8.6" />,
  keyboard: (
    <>
      <rect x="1.8" y="4" width="12.4" height="8" rx="1.5" />
      <path d="M4.5 7h.01M7 7h.01M9.5 7h.01M12 7h.01M5 9.5h6" />
    </>
  ),
  plus: <path d="M8 3v10M3 8h10" />,
  search: (
    <>
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5 14 14" />
    </>
  ),
};

/** A 16px outline icon that takes its colour from the text around it. */
export function Icon({ name }: { name: IconName }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
