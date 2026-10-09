import { useId } from 'react';
import { updateFilter, useUi } from './uiStore';

/** Picks out topics due between two dates. Either end can be left empty. */
export function DateFilter() {
  const from = useUi((s) => s.filterSel.from);
  const to = useUi((s) => s.filterSel.to);
  const fromId = useId();
  const toId = useId();

  return (
    <div className="date-filter">
      <label htmlFor={fromId}>From</label>
      <input
        id={fromId}
        type="date"
        min="1900-01-01"
        max="2099-12-31"
        value={from}
        onChange={(e) => updateFilter({ from: e.target.value })}
      />
      <label htmlFor={toId}>To</label>
      <input
        id={toId}
        type="date"
        min="1900-01-01"
        max="2099-12-31"
        value={to}
        onChange={(e) => updateFilter({ to: e.target.value })}
      />
    </div>
  );
}
