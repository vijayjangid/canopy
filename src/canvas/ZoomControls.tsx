import { executeCommand } from '../editor/commands';
import { appContext } from '../editor/context';
import { isMac } from '../editor/shortcuts';
import { setZen } from '../ui/uiStore';
import { Icon, type IconName } from '../ui/icons';
import { focusCanvas } from './layoutState';
import { setTool, useEffectiveTool, type CanvasTool } from './toolStore';

/** After a mouse click the map takes focus back, so its keys (V, H, Space) work straight away. */
const backToMap = (e: { detail: number }) => {
  if (e.detail > 0) focusCanvas();
};

const TOOLS: Array<{
  id: CanvasTool;
  label: string;
  icon: IconName;
  tip: (cmd: string) => string;
}> = [
  {
    id: 'select',
    label: 'Select',
    icon: 'cursor',
    tip: () => 'Select (V). Hold Shift to pick several',
  },
  { id: 'pan', label: 'Pan', icon: 'hand', tip: () => 'Pan (H). Or hold Space and drag' },
  {
    id: 'zoom',
    label: 'Zoom',
    icon: 'zoom-in',
    tip: (cmd) => `Zoom (⇧Z). Or hold ${cmd}. Click in, Alt-click out, drag an area`,
  },
];

/** The pointer tools, unfold everything (which also fits the map), and Zen, which hides everything but the map. */
export function ZoomControls() {
  const tool = useEffectiveTool();
  const cmd = isMac() ? '⌘' : 'Ctrl';
  return (
    <div className="zoom-controls" role="toolbar" aria-label="Pointer and zoom">
      <div className="tool-group" role="group" aria-label="Pointer tool">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-label={t.label}
            aria-pressed={tool === t.id}
            data-tip={t.tip(cmd)}
            data-tip-side="top"
            onClick={(e) => {
              setTool(t.id);
              backToMap(e);
            }}
          >
            <Icon name={t.icon} />
          </button>
        ))}
      </div>
      <span className="tool-sep" aria-hidden="true" />
      <button
        type="button"
        aria-label="Unfold everything"
        data-tip="Unfold everything (0)"
        data-tip-side="top"
        onClick={(e) => {
          void executeCommand('view.unfoldAll', appContext);
          backToMap(e);
        }}
      >
        <Icon name="braces" />
      </button>
      <button
        type="button"
        className="zen-button"
        data-tip="Hide everything but the map (Z)"
        data-tip-side="top"
        onClick={() => setZen(true)}
      >
        <Icon name="zen" />
        <span>Zen</span>
      </button>
    </div>
  );
}
