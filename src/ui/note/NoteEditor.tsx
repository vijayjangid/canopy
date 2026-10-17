import { useEffect, useRef, useState, type FormEvent } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import type { Editor } from '@tiptap/core';
import { isSafeLink } from '../../model';
import { noteExtensions } from './extensions';
import '../markdown.css';
import './note.css';

interface Tool {
  id: string;
  label: string;
  face: string;
  active: (editor: Editor) => boolean;
  run: (editor: Editor) => void;
}

const TOOLS: Tool[] = [
  {
    id: 'bold',
    label: 'Bold',
    face: 'B',
    active: (e) => e.isActive('bold'),
    run: (e) => e.chain().focus().toggleBold().run(),
  },
  {
    id: 'italic',
    label: 'Italic',
    face: 'I',
    active: (e) => e.isActive('italic'),
    run: (e) => e.chain().focus().toggleItalic().run(),
  },
  {
    id: 'bullets',
    label: 'Bulleted list',
    face: '•',
    active: (e) => e.isActive('bulletList'),
    run: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    id: 'tasks',
    label: 'Checklist',
    face: '☑',
    active: (e) => e.isActive('taskList'),
    run: (e) => e.chain().focus().toggleTaskList().run(),
  },
];

/** `example.com` is taken to mean `https://example.com`. */
function toAddress(text: string): string {
  const value = text.trim();
  return /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
}

/**
 * A rich text field for a note. It reads and writes Markdown, so the note is stored in the file
 * as plain text and the node can preview it.
 */
export function NoteEditor({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (markdown: string) => void;
}) {
  const last = useRef(value);
  const change = useRef(onChange);
  useEffect(() => {
    change.current = onChange;
  });
  const [linkOpen, setLinkOpen] = useState(false);
  const [address, setAddress] = useState('');
  const [problem, setProblem] = useState('');

  const editor = useEditor({
    extensions: noteExtensions(),
    content: value,
    contentType: 'markdown',
    editorProps: {
      attributes: {
        id,
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': 'Note',
      },
      // A plain click edits the text. Holding Ctrl or ⌘ follows the link.
      handleClick: (_view, _pos, event) => {
        const link = (event.target as HTMLElement).closest('a');
        const href = link?.getAttribute('href') ?? '';
        if (!link || !(event.metaKey || event.ctrlKey) || !isSafeLink(href)) return false;
        window.open(href, '_blank', 'noopener,noreferrer');
        return true;
      },
    },
    onUpdate: ({ editor: current }) => {
      const markdown = current.isEmpty ? '' : current.getMarkdown();
      last.current = markdown;
      change.current(markdown);
    },
  });

  // Undo, redo and other edits change the note from outside, so the field follows them.
  useEffect(() => {
    if (!editor || value === last.current) return;
    last.current = value;
    editor.commands.setContent(value, { contentType: 'markdown', emitUpdate: false });
  }, [editor, value]);

  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      active: TOOLS.filter((tool) => current && tool.active(current)).map((tool) => tool.id),
      link: current?.getAttributes('link')['href'] as string | undefined,
    }),
  });

  if (!editor) return null;

  const openLink = () => {
    setAddress(state?.link ?? '');
    setProblem('');
    setLinkOpen(true);
  };

  const applyLink = (event: FormEvent) => {
    event.preventDefault();
    const href = address.trim() ? toAddress(address) : '';
    if (!href) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else if (!isSafeLink(href)) {
      setProblem('Use a web address (https://) or an email address (mailto:).');
      return;
    } else if (editor.state.selection.empty && !editor.isActive('link')) {
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'text',
          text: address.trim(),
          marks: [{ type: 'link', attrs: { href } }],
        })
        .run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    }
    setLinkOpen(false);
  };

  return (
    <div className="note-editor">
      <div className="note-toolbar" role="toolbar" aria-label="Format note">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            type="button"
            className="note-tool"
            data-tool={tool.id}
            aria-label={tool.label}
            aria-pressed={state?.active.includes(tool.id) ?? false}
            data-tip={tool.label}
            // Keep the cursor in the text when a button is pressed.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => tool.run(editor)}
          >
            {tool.face}
          </button>
        ))}
        <button
          type="button"
          className="note-tool"
          data-tool="link"
          aria-label="Link"
          aria-pressed={!!state?.link}
          aria-expanded={linkOpen}
          data-tip="Link"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => (linkOpen ? setLinkOpen(false) : openLink())}
        >
          Link
        </button>
      </div>
      {linkOpen && (
        <form className="note-link" onSubmit={applyLink}>
          <input
            type="text"
            aria-label="Link address"
            placeholder="https://example.com"
            value={address}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            onChange={(event) => {
              setAddress(event.target.value);
              setProblem('');
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                setLinkOpen(false);
                editor.commands.focus();
              }
            }}
          />
          <button type="submit" className="pill">
            {address.trim() ? 'Apply' : 'Remove'}
          </button>
          {problem && (
            <p className="note-link-problem" role="alert">
              {problem}
            </p>
          )}
        </form>
      )}
      <EditorContent editor={editor} className="note-content markdown" />
    </div>
  );
}
