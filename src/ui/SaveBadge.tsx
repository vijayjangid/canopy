import { useSaveState, saveLabel, useNow } from './saveStatus';

/** A quiet note beside the map title saying whether, and how long ago, the map was saved. */
export function SaveBadge() {
  const state = useSaveState();
  const now = useNow();
  const { text, spoken, tone } = saveLabel(state, now);
  const exact =
    state.status === 'saved' && state.savedAt !== null
      ? `Saved at ${new Date(state.savedAt).toLocaleTimeString()}`
      : undefined;
  return (
    <span className="save-status" data-tone={tone} data-tip={exact} data-tip-side="bottom">
      <span className="save-dot" aria-hidden="true" />
      <span aria-hidden="true">{text}</span>
      {/* Only the state is announced, not the passing seconds. */}
      <span className="sr-only" role="status">
        {spoken}
      </span>
    </span>
  );
}
