import { CheatSheet } from './CheatSheet';
import { DeleteConfirm } from './DeleteConfirm';
import { SearchDialog } from './SearchDialog';
import { QuickAdd } from './QuickAdd';
import { TopicSearchDialog } from './TopicSearchDialog';
import { useDialog, useUi } from './uiStore';

/** Whichever dialog is open. Larger tools live in the side panels instead. */
export function Dialogs() {
  const dialog = useDialog();
  const topicSearchFrom = useUi((s) => s.topicSearchFrom);
  if (dialog === 'shortcuts') return <CheatSheet />;
  if (dialog === 'quickadd') return <QuickAdd />;
  if (dialog === 'confirmDelete') return <DeleteConfirm />;
  if (dialog === 'topicSearch') {
    return topicSearchFrom ? (
      <TopicSearchDialog referenceFrom={topicSearchFrom} />
    ) : (
      <SearchDialog />
    );
  }
  if (dialog === 'palette') return <SearchDialog />;
  return null;
}
