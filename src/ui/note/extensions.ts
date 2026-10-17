import { Placeholder } from '@tiptap/extensions';
import { Markdown } from '@tiptap/markdown';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import StarterKit from '@tiptap/starter-kit';
import { isSafeLink } from '../../model';

/**
 * What a note can hold. It matches what the Markdown reader in the model understands, so what
 * is written here is what the node shows. Underline and soft line breaks have no Markdown form
 * that the reader keeps, so they are left out.
 */
export const noteExtensions = () => [
  StarterKit.configure({
    underline: false,
    hardBreak: false,
    link: {
      openOnClick: false,
      autolink: true,
      HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      isAllowedUri: (url) => isSafeLink(url),
    },
  }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Placeholder.configure({ placeholder: 'Write a note…' }),
  Markdown,
];
