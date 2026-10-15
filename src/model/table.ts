import { planningOf } from './planning';
import { isOverdue } from './rollup';
import { ancestorsOf, subtreeOf } from './tree';
import type { CanopyMap, TopicId } from './types';

export const TABLE_COLUMNS = ['Path', 'Topic', 'Start', 'Due', 'Overdue', 'Tags', 'Tasks'] as const;

export type TableRow = Record<(typeof TABLE_COLUMNS)[number], string>;

/** One row per topic, in reading order, with Properties spelled out in words. */
export function tableRows(map: CanopyMap, today: string, only?: ReadonlySet<TopicId>): TableRow[] {
  const rows: TableRow[] = [];
  const tagLabels = new Map(planningOf(map).tags.map((t) => [t.key, t.label]));
  for (const topic of subtreeOf(map, map.coreId)) {
    if (only && !only.has(topic.id)) continue;
    const p = topic.props;
    const path = ancestorsOf(map, topic.id)
      .reverse()
      .map((a) => a.title.trim() || 'Untitled')
      .join(' > ');
    rows.push({
      Path: path,
      Topic: topic.title.trim() || 'Untitled',
      Start: p?.due?.start ?? '',
      Due: p?.due?.end ?? '',
      Overdue: isOverdue(map, topic.id, today) ? 'yes' : '',
      Tags: (p?.tags ?? []).map((t) => tagLabels.get(t) ?? t).join('; '),
      Tasks: (topic.tasks ?? [])
        .map((task) => `[${task.done ? 'x' : ' '}] ${task.text}`)
        .join('; '),
    });
  }
  return rows;
}

/**
 * A cell safe to open in a spreadsheet. Text that starts like a formula gets a leading quote, so
 * a topic called `=HYPERLINK(...)` cannot run anything.
 */
export function csvCell(value: string): string {
  let text = value;
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: readonly TableRow[]): string {
  const lines = [TABLE_COLUMNS.join(',')];
  for (const row of rows) lines.push(TABLE_COLUMNS.map((c) => csvCell(row[c])).join(','));
  // A byte order mark lets Excel read UTF-8 names correctly.
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}
