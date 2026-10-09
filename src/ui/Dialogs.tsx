import { CheatSheet } from './CheatSheet';
import { Palette } from './Palette';
import { QuickAdd } from './QuickAdd';
import { TopicSearchDialog } from './TopicSearchDialog';
import { useDialog, useUi } from './uiStore';

/** Whichever dialog is open. Larger tools live in the side panels instead. */
export function Dialogs() {
  const dialog = useDialog();
  const topicSearchFrom = useUi((s) => s.topicSearchFrom);
  if (dialog === 'shortcuts') return <CheatSheet />;
  if (dialog === 'quickadd') return <QuickAdd />;
  if (dialog === 'topicSearch') {
    return <TopicSearchDialog referenceFrom={topicSearchFrom} />;
  }
  if (dialog === 'palette') return <Palette />;
  return null;
}
