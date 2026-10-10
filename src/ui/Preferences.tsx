import { useId, type ReactNode } from 'react';
import { setPrefs, type MapPrefs } from '../model';
import { settingsStore, useSettings, type AppSettings } from '../settings';
import { Icon, type IconName } from './icons';
import { InfoTip } from './InfoTip';
import { canopyStore, useCanopy } from '../store';
import { LOOK_VOICE, VOICES } from '../theme';
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
  const labelId = useId();
  return (
    <div className="pref" role="group" aria-labelledby={labelId}>
      <span className="pref-label">
        <span id={labelId}>{legend}</span>
        {hint && <InfoTip text={hint} about={legend} />}
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
    </div>
  );
}

/** A theme is a preset: colours, shapes and a font. Each name is set in its own font. */
const lookOption = (value: MapPrefs['look'], label: string): Option<MapPrefs['look']> => ({
  value,
  label,
  font: VOICES[LOOK_VOICE[value]].stack,
});
const LOOKS: Array<Option<MapPrefs['look']>> = [
  lookOption('minimal', 'Standard'),
  lookOption('contrast', 'High contrast'),
  lookOption('playful', 'Playful'),
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
/** A yes or no setting, as a switch. Its explanation sits behind the "i" beside its name. */
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
  return (
    <div className="pref pref-toggle">
      <span className="pref-label">
        <span>{legend}</span>
        {hint && <InfoTip text={hint} about={legend} />}
      </span>
      <button
        type="button"
        role="switch"
        className="switch"
        aria-checked={checked}
        aria-label={legend}
        onClick={() => onChange(!checked)}
      >
        <span className="switch-knob" />
      </button>
    </div>
  );
}

const DEVICE_NOTE = 'Most of these are kept in this browser, not saved with the map.';

/** A titled group of settings. The title is followed by a line that runs to the edge. */
function Group({
  id,
  title,
  label,
  note,
  children,
}: {
  id: string;
  /** Shown above the group. A group without one is named for assistive technology only. */
  title?: string;
  label?: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={title ? `prefs-${id}` : undefined}
      aria-label={title ? undefined : label}
    >
      {title && (
        <div className="prefs-heading">
          <h3 id={`prefs-${id}`}>{title}</h3>
          {note && <InfoTip text={note} about={`${title} settings`} />}
          <span className="prefs-rule" aria-hidden="true" />
        </div>
      )}
      {children}
    </section>
  );
}

/** Colour, theme and font, then how the map is laid out, then how the app behaves. */
export function AppearanceBody() {
  const prefs = useCanopy((s) => s.doc.prefs);
  const handles = useSettings((s) => s.handles);
  const handlePreview = useSettings((s) => s.handlePreview);
  const hints = useSettings((s) => s.hints);
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
      <Group id="appearance" label="Appearance">
        <Choice
          legend="Theme"
          options={LOOKS}
          value={prefs.look}
          onChange={(look) => setMap({ look })}
        />
      </Group>

      <Group id="layout" title="Map">
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
          legend="Property chips"
          options={[
            { value: 'off', label: 'Off' },
            { value: 'compact', label: 'Compact' },
            { value: 'full', label: 'Full' },
          ]}
          value={prefs.chips}
          onChange={(chips) => setMap({ chips })}
        />
        <Choice
          legend="Handles"
          hint="The + and link buttons around the selected topic, for adding topics and references."
          options={[
            { value: 'hover', label: 'On hover' },
            { value: 'always', label: 'Always' },
            { value: 'never', label: 'Never' },
          ]}
          value={handles}
          onChange={(v) => setDevice({ handles: v })}
        />
      </Group>

      <Group id="behaviour" title="Behaviour" note={DEVICE_NOTE}>
        <Toggle
          legend="Level numbers"
          hint="Shows 1.1, 1.2 before each title. Saved with the map."
          checked={prefs.showLevels}
          onChange={(on) => setMap({ showLevels: on })}
        />
        <Toggle
          legend="Trail"
          hint="Marks the way up to the Core from the selected topic."
          checked={trail}
          onChange={(on) => setDevice({ trail: on })}
        />
        <Toggle
          legend="Shortcut hints"
          hint="A quiet row of keys at the bottom."
          checked={hints}
          onChange={(on) => setDevice({ hints: on })}
        />
        <Toggle
          legend="Preview on hover"
          hint="Shows a ghost of the topic a + button would add while you point at it. Off by default, since it can get in the way. Dragging a + always shows where it will land."
          checked={handlePreview}
          onChange={(on) => setDevice({ handlePreview: on })}
        />
        <Toggle
          legend="Auto-pan"
          hint="Keeps the topic you are working on in view."
          checked={autoPan}
          onChange={(on) => setDevice({ autoPan: on })}
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
      </Group>
    </div>
  );
}
