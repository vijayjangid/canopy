import { isExpansion, EXPAND_PREFIX } from '../model';

/** Where someone is in typing an expression, which decides what to suggest next. */
export type GuideStep = 'start' | 'name' | 'child' | 'sibling';

export interface Guide {
  step: GuideStep;
  /** One short sentence saying what to do next. */
  message: string;
}

const short = (text: string) => (text.length > 18 ? `${text.slice(0, 17)}…` : text);

/** What to suggest next while a `!!` title is typed. Null when the title is not an expression. */
export function expressionGuide(title: string): Guide | null {
  if (!isExpansion(title)) return null;
  const body = title
    .trimStart()
    .slice(EXPAND_PREFIX.length)
    .replace(/[ \t]+$/, '');
  if (body.trim() === '') {
    return {
      step: 'start',
      message: 'Type a name, then add > for a child or a comma for a sibling.',
    };
  }

  // The name being typed is whatever follows the last separator.
  const segment = body.split(/[,\n]/).at(-1) ?? '';
  const names = segment.split('>').map((n) => n.trim());
  const last = body.slice(-1);
  const named = names.filter(Boolean);
  if (last === '>') {
    return { step: 'child', message: `Type the child of “${short(named.at(-1) ?? '')}”.` };
  }
  if (last === ',' || last === '\n') {
    return { step: 'sibling', message: 'Type the next sibling.' };
  }
  const current = named.at(-1) ?? '';
  return {
    step: 'name',
    message: `Add > for a child of “${short(current)}”, or a comma for the next sibling.`,
  };
}
