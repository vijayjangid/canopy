import { describe, expect, it } from 'vitest';
import { expressionGuide } from './expressionGuide';

describe('expressionGuide', () => {
  it('is only for titles that start with !!', () => {
    expect(expressionGuide('Plain')).toBeNull();
  });

  it('starts by asking for a name', () => {
    expect(expressionGuide('!!')?.step).toBe('start');
    expect(expressionGuide('!!  ')?.step).toBe('start');
  });

  it('suggests > or a comma after a name, and names what they would attach to', () => {
    const guide = expressionGuide('!!Plan');
    expect(guide?.step).toBe('name');
    expect(guide?.message).toContain('Plan');
    expect(expressionGuide('!!Plan>Research')?.message).toContain('Research');
  });

  it('asks for the child after > and the sibling after a comma or a line break', () => {
    expect(expressionGuide('!!Plan>')?.step).toBe('child');
    expect(expressionGuide('!!Plan>')?.message).toContain('Plan');
    expect(expressionGuide('!!Plan,')?.step).toBe('sibling');
    expect(expressionGuide('!!Plan\n')?.step).toBe('sibling');
  });
});
