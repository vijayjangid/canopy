import { CheatSheet } from './CheatSheet';
import { FilterDialog } from './FilterDialog';
import { Palette } from './Palette';
import { QuickAdd } from './QuickAdd';
import { useDialog } from './uiStore';

/** Whichever dialog is open. Larger tools live in the side panels instead. */
export function Dialogs() {
  const dialog = useDialog();
  if (dialog === 'shortcuts') return <CheatSheet />;
  if (dialog === 'quickadd') return <QuickAdd />;
  if (dialog === 'filter') return <FilterDialog />;
  if (dialog === 'palette') return <Palette />;
  return null;
}
