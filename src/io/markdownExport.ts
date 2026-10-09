import { childrenOf, planningOf, type CanopyMap, type Topic, type TopicId } from '../model';

export interface MarkdownOptions {
  /** Put each topic's note under it. */
  notes: boolean;
  /** Export only these branches. Empty exports the whole map. */
  roots?: readonly TopicId[];
  /** Write Properties after each title in the same shorthand the editor reads (`/doing #launch ^2026-11-01`). */
  tokens?: boolean;
  /** Leave out topics that are not in this set. */
  only?: ReadonlySet<TopicId>;
}

const underscored = (text: string) => text.trim().replace(/\s+/g, '_');

/** The shorthand that would recreate a topic's Properties when typed into its title. */
export function tokensFor(doc: CanopyMap, topic: Topic): string {
  const p = topic.props;
  if (!p) return '';
  const parts: string[] = [];
  if (p.status) parts.push(`/${p.status}`);
  const due = p.due?.end ?? p.due?.start;
  if (due) parts.push(`^${due}`);
  const tags = planningOf(doc).tags;
  for (const key of p.tags ?? []) {
    parts.push(`#${underscored(tags.find((t) => t.key === key)?.label ?? key)}`);
  }
  return parts.join(' ');
}

const oneLine = (text: string) => text.replace(/\s+/g, ' ').trim() || 'Untitled';

/** An outline in Markdown: the Core as the title, and every topic as a nested list item. */
export function mapToMarkdown(doc: CanopyMap, options: MarkdownOptions): string {
  const lines: string[] = [];
  const roots = options.roots && options.roots.length > 0 ? options.roots : [doc.coreId];
  const whole = roots.length === 1 && roots[0] === doc.coreId;

  const emit = (id: TopicId, depth: number) => {
    const topic = doc.topics[id];
    if (!topic) return;
    const pad = '  '.repeat(depth);
    const extra = options.tokens ? tokensFor(doc, topic) : '';
    lines.push(`${pad}- ${oneLine(topic.title)}${extra ? ` ${extra}` : ''}`);
    if (options.notes && topic.note?.trim()) {
      lines.push('');
      for (const l of topic.note.trim().split(/\r?\n/)) lines.push(l === '' ? '' : `${pad}  ${l}`);
      lines.push('');
    }
    for (const child of childrenOf(doc, id))
      if (!options.only || options.only.has(child.id)) emit(child.id, depth + 1);
  };

  if (whole) {
    const core = doc.topics[doc.coreId];
    lines.push(`# ${oneLine(core?.title ?? doc.meta.title)}`);
    if (options.notes && core?.note?.trim()) lines.push('', core.note.trim());
    lines.push('');
    for (const child of childrenOf(doc, doc.coreId))
      if (!options.only || options.only.has(child.id)) emit(child.id, 0);
  } else {
    for (const id of roots) emit(id, 0);
  }
  return `${lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd()}\n`;
}
