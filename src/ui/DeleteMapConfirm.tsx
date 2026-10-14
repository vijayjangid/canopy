import { useRef } from 'react';
import type { MapSummary } from '../persistence';
import { Dialog } from './Dialog';

interface Props {
  map: MapSummary;
  isCurrent: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteMapConfirm({ map, isCurrent, busy, onCancel, onConfirm }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const title = map.title.trim() || 'Untitled map';

  return (
    <Dialog title={`Delete “${title}”?`} onClose={onCancel}>
      <div ref={root} className="dialog-body confirm-delete">
        <p>This permanently deletes the saved map from this device. This cannot be undone.</p>
        {isCurrent && <p>A new blank map will open after you delete the map currently in use.</p>}
        <div className="confirm-actions">
          <button
            type="button"
            disabled={busy}
            onClick={() => root.current?.closest('dialog')?.close()}
          >
            Cancel
          </button>
          <button type="button" data-danger="" disabled={busy} onClick={onConfirm}>
            {busy ? 'Deleting…' : 'Delete map'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
