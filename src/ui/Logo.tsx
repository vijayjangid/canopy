import { useId } from 'react';
import '@fontsource-variable/bricolage-grotesque/index.css';

/** The Canopy mark: a letter C drawn as a branch with nodes at its tips and a root inside. */
export function LogoMark({ size = 28 }: { size?: number }) {
  const id = useId();
  return (
    <svg
      className="logo-mark"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={id} x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: 'var(--brand-from)' }} />
          <stop offset="1" style={{ stopColor: 'var(--brand-to)' }} />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${id})`} />
      <g fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round">
        <path d="M22.6 10.4A8.6 8.6 0 1 0 22.6 21.6" />
        <path d="M8 16H16" />
      </g>
      <g fill="#fff">
        <circle cx="23.4" cy="9.6" r="2.6" />
        <circle cx="23.4" cy="22.4" r="2.6" />
        <circle cx="17.2" cy="16" r="2.8" />
      </g>
    </svg>
  );
}

/** Mark and name together, for the top bar. */
export function Brand() {
  return (
    <span className="brand">
      <LogoMark />
      <span className="app-name">Canopy</span>
    </span>
  );
}
