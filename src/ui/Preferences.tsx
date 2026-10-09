import { useId } from 'react';
import { setPrefs, type MapPrefs } from '../model';
import { settingsStore, useSettings, type AppSettings } from '../settings';
import { Icon, type IconName } from './icons';
import { canopyStore, useCanopy } from '../store';
import { FONT_SIZE_LABELS, VOICES } from '../theme';
import './preferences.css';

interface Option<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
  /** Show only the icon, with the label as its name and tooltip. Use where the icon says it all. */
  iconOnly?: boolean;
  /** Set a font on the label, to show a font by its own look. */
  font?: string;
}

function Choice<T extends string>({
  legend,
  options,
  value,
  onChange,
  hint,
}: {
  legend: string;
  options: Array<Option<T>>;
  value: T;
  onChange: (value: T) => void;
  hint?: string;
}) {
  const hintId = useId();
  const labelId = useId();
  return (
    <div
      className="pref"
      role="group"
      aria-labelledby={labelId}
      aria-describedby={hint ? hintId : undefined}
    >
      <span id={labelId} className="pref-label">
        {legend}
      </span>
      <div className="segmented">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            aria-label={o.iconOnly ? o.label : undefined}
            data-tip={o.iconOnly ? o.label : undefined}
            data-icon-only={o.iconOnly || undefined}
            style={o.font ? { fontFamily: o.font } : undefined}
            onClick={() => onChange(o.value)}
          >
            {o.icon && <Icon name={o.icon} />}
            {!o.iconOnly && o.label}
          </button>
        ))}
      </div>
      {hint && (
        <p id={hintId} className="pref-hint">
          {hint}
        </p>
      )}
    </div>
  );
}

const LOOKS: Array<Option<MapPrefs['look']>> = [
  { value: 'minimal', label: 'Minimal' },
  { value: 'contrast', label: 'High contrast' },
  { value: 'playful', label: 'Playful' },
];
const CONNECTORS: Array<Option<MapPrefs['connector']>> = [
  { value: 'curved', label: 'Curved', icon: 'curve', iconOnly: true },
  { value: 'elbow', label: 'Elbow', icon: 'elbow', iconOnly: true },
  { value: 'straight', label: 'Straight', icon: 'line', iconOnly: true },
  { value: 'tapered', label: 'Tapered', icon: 'taper', iconOnly: true },
];
const DENSITIES: Array<Option<MapPrefs['density']>> = [
  { value: 'compact', label: 'Compact', icon: 'density-compact', iconOnly: true },
  { value: 'comfortable', label: 'Comfortable', icon: 'density-comfortable', iconOnly: true },
  { value: 'airy', label: 'Airy', icon: 'density-airy', iconOnly: true },
];
const FLOWS: Array<Option<MapPrefs['flow']>> = [
  { value: 'right', label: 'Right', icon: 'arrow-right', iconOnly: true },
  { value: 'down', label: 'Down', icon: 'arrow-down', iconOnly: true },
];
const FONT_SIZE_OPTIONS = (Object.keys(FONT_SIZE_LABELS) as Array<MapPrefs['fontSize']>).map(
  (value): Option<MapPrefs['fontSize']> => ({ value, label: FONT_SIZE_LABELS[value] }),
);

const VOICE_OPTIONS = (Object.keys(VOICES) as Array<MapPrefs['voice']>).map(
  (value): Option<MapPrefs['voice']> => ({
    value,
    label: VOICES[value].label,
    font: VOICES[value].stack,
  }),
);

/** A yes or no setting, as a switch with its explanation beneath. */
function Toggle({
  legend,
  hint,
  checked,
  onChange,
}: {
  legend: string;
  hint?: string;
  checked: boolean;
  onChange: (on: boolean) => void;
}) {
  const hintId = useId();
  return (
    <div className="pref pref-toggle">
      <span className="pref-label">
        {legend}
        {hint && (
          <small id={hintId} className="pref-sub">
            {hint}
          </small>
        )}
      </span>
      <button
        type="button"
        role="switch"
        className="switch"
        aria-checked={checked}
        aria-label={legend}
        aria-describedby={hint ? hintId : undefined}
        onClick={() => onChange(!checked)}
      >
        <span className="switch-knob" />
      </button>
    </div>
  );
}

/** Colour, theme and font, then how the map is laid out, then how the app behaves. */
export function AppearanceBody() {
  const prefs = useCanopy((s) => s.doc.prefs);
  const mode = useSettings((s) => s.mode);
  const handles = useSettings((s) => s.handles);
  const hints = useSettings((s) => s.hints);
  const motion = useSettings((s) => s.motion);
  const autoPan = useSettings((s) => s.autoPan);
  const discardBlank = useSettings((s) => s.discardBlank);
  const textExpansion = useSettings((s) => s.textExpansion);
  const trail = useSettings((s) => s.trail);
  const setMap = (patch: Partial<MapPrefs>) => {
    const { doc, commit } = canopyStore.getState();
    commit(setPrefs(doc, patch), { group: `prefs:${Object.keys(patch).join(',')}` });
  };
  const setDevice = (patch: Partial<AppSettings>) => settingsStore.getState().update(patch);

  return (
    <div className="prefs">
      <section aria-labelledby="prefs-appearance">
        <h3 id="prefs-appearance">Appearance</h3>
        <Choice
          legend="Colour mode"
          options={[
            { value: 'auto', label: 'Auto', icon: 'auto', iconOnly: true },
            { value: 'light', label: 'Light', icon: 'sun', iconOnly: true },
            { value: 'dark', label: 'Dark', icon: 'moon', iconOnly: true },
          ]}
          value={mode}
          onChange={(v) => setDevice({ mode: v })}
        />
        <Choice
          legend="Theme"
          options={LOOKS}
          value={prefs.look}
          onChange={(look) => setMap({ look })}
        />
        <Choice
          legend="Font"
          options={VOICE_OPTIONS}
          value={prefs.voice}
          onChange={(voice) => setMap({ voice })}
        />
        <Choice
          legend="Font size"
          options={FONT_SIZE_OPTIONS}
          value={prefs.fontSize}
          onChange={(fontSize) => setMap({ fontSize })}
        />
      </section>

      <section aria-labelledby="prefs-layout">
        <h3 id="prefs-layout">Map layout</h3>
        <Choice
          legend="Layout"
          options={FLOWS}
          value={prefs.flow}
          onChange={(flow) => setMap({ flow })}
        />
        <Choice
          legend="Spacing"
          options={DENSITIES}
          value={prefs.density}
          onChange={(density) => setMap({ density })}
        />
        <Choice
          legend="Connectors"
          options={CONNECTORS}
          value={prefs.connector}
          onChange={(connector) => setMap({ connector })}
        />
        <Choice
          legend="Property chips"
          options={[
            { value: 'off', label: 'Off' },
            { value: 'compact', label: 'Compact' },
            { value: 'full', label: 'Full' },
          ]}
          value={prefs.chips}
          onChange={(chips) => setMap({ chips })}
        />
        <Toggle
          legend="Level numbers"
          hint="Shows 1.1, 1.2 before each title."
          checked={prefs.showLevels}
          onChange={(on) => setMap({ showLevels: on })}
        />
      </section>

      <section aria-labelledby="prefs-behaviour">
        <h3 id="prefs-behaviour">Behaviour</h3>
        <p className="pref-nudge">Kept in this browser, not saved with the map.</p>
        <Toggle
          legend="Auto-pan"
          hint="Keeps the topic you are working on in view."
          checked={autoPan}
          onChange={(on) => setDevice({ autoPan: on })}
        />
        <Toggle
          legend="Trail"
          hint="Marks the way up to the Core from the selected topic."
          checked={trail}
          onChange={(on) => setDevice({ trail: on })}
        />
        <Toggle
          legend="Text expansion"
          hint="Start a title with !! and type a>b>c or a, b, c."
          checked={textExpansion}
          onChange={(on) => setDevice({ textExpansion: on })}
        />
        <Toggle
          legend="Remove empty new topics"
          hint="A new topic left blank is deleted."
          checked={discardBlank}
          onChange={(on) => setDevice({ discardBlank: on })}
        />
        <Toggle
          legend="Shortcut hints"
          hint="A quiet row of keys at the bottom."
          checked={hints}
          onChange={(on) => setDevice({ hints: on })}
        />
        <Choice
          legend="Add-topic handles"
          options={[
            { value: 'hover', label: 'On hover' },
            { value: 'always', label: 'Always' },
            { value: 'never', label: 'Never' },
          ]}
          value={handles}
          onChange={(v) => setDevice({ handles: v })}
        />
        <Choice
          legend="Motion (animation)"
          options={[
            { value: 'auto', label: 'System' },
            { value: 'full', label: 'Full' },
            { value: 'reduced', label: 'Reduced' },
          ]}
          value={motion}
          onChange={(v) => setDevice({ motion: v })}
        />
      </section>
    </div>
  );
}
