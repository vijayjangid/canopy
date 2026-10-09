import { executeCommand } from '../editor/commands';
import { appContext } from '../editor/context';
import { isMac } from '../editor/shortcuts';
import { setZen } from '../ui/uiStore';
import { Icon, type IconName } from '../ui/icons';
import { setTool, useEffectiveTool, type CanvasTool } from './toolStore';

interface Props {
  onFit: () => void;
}

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

/** The pointer tools, fit the map, and Zen, which hides everything but the map. */
export function ZoomControls({ onFit }: Props) {
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
            onClick={() => setTool(t.id)}
          >
            <Icon name={t.icon} />
          </button>
        ))}
      </div>
      <span className="tool-sep" aria-hidden="true" />
      <button
        type="button"
        aria-label="Fit to screen"
        data-tip="Fit to screen (⌘0)"
        data-tip-side="top"
        onClick={onFit}
      >
        <Icon name="fit" />
      </button>
      <button
        type="button"
        aria-label="Unfold everything"
        data-tip="Unfold everything (0)"
        data-tip-side="top"
        onClick={() => void executeCommand('view.unfoldAll', appContext)}
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
