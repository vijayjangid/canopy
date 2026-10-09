import type { ReactNode } from 'react';
import { parseMarkdown, type Block, type Inline } from './markdownParse';
import './markdown.css';

function inline(nodes: readonly Inline[]): ReactNode {
  return nodes.map((node, i) => {
    switch (node.type) {
      case 'text':
        return node.text;
      case 'code':
        return <code key={i}>{node.text}</code>;
      case 'strong':
        return <strong key={i}>{inline(node.children)}</strong>;
      case 'em':
        return <em key={i}>{inline(node.children)}</em>;
      case 'del':
        return <del key={i}>{inline(node.children)}</del>;
      case 'link':
        return (
          <a key={i} href={node.href} target="_blank" rel="noopener noreferrer">
            {inline(node.children)}
          </a>
        );
    }
  });
}

function blocks(list: readonly Block[]): ReactNode {
  return list.map((block, i) => {
    switch (block.type) {
      case 'heading': {
        const Tag = `h${Math.min(block.level + 2, 6)}` as 'h3' | 'h4' | 'h5' | 'h6';
        return <Tag key={i}>{inline(block.children)}</Tag>;
      }
      case 'paragraph':
        return <p key={i}>{inline(block.children)}</p>;
      case 'code':
        return (
          <pre key={i} data-lang={block.lang || undefined}>
            <code>{block.text}</code>
          </pre>
        );
      case 'quote':
        return <blockquote key={i}>{blocks(block.children)}</blockquote>;
      case 'rule':
        return <hr key={i} />;
      case 'list': {
        const Tag = block.ordered ? 'ol' : 'ul';
        return (
          <Tag
            key={i}
            className={block.items.some((x) => x.checked !== undefined) ? 'tasks' : undefined}
          >
            {block.items.map((item, j) => (
              <li key={j}>
                {item.checked !== undefined && (
                  <input
                    type="checkbox"
                    checked={item.checked}
                    readOnly
                    tabIndex={-1}
                    aria-label={item.checked ? 'Done' : 'Not done'}
                  />
                )}
                {inline(item.children)}
                {item.nested.length > 0 && blocks(item.nested)}
              </li>
            ))}
          </Tag>
        );
      }
      case 'table':
        return (
          <table key={i}>
            <thead>
              <tr>
                {block.head.map((cell, j) => (
                  <th key={j}>{inline(cell)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, j) => (
                    <td key={j}>{inline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        );
    }
  });
}

/** Shows Markdown as React elements, so no HTML is ever injected. */
export function Markdown({ source }: { source: string }) {
  return <div className="markdown">{blocks(parseMarkdown(source))}</div>;
}
