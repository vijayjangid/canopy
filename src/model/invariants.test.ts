import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  createMap,
  createPeer,
  createSubTopic,
  deleteBranch,
  deleteNode,
  duplicateBranch,
  foldToLevel,
  moveBranch,
  moveSibling,
  renameTopic,
  toggleFold,
} from './ops';
import { countTopics, subtreeOf } from './tree';
import { ModelError, type CanopyMap } from './types';
import { validateMap } from './validate';

type Command = { kind: number; a: number; b: number };

const commandArb = fc.record({
  kind: fc.nat(9),
  a: fc.nat(1000),
  b: fc.nat(1000),
});

function apply(map: CanopyMap, cmd: Command): CanopyMap {
  const ids = Object.keys(map.topics).sort();
  const pick = (n: number) => ids[n % ids.length] as string;
  const a = pick(cmd.a);
  const b = pick(cmd.b);
  try {
    switch (cmd.kind) {
      case 0:
        return createSubTopic(map, a, { position: cmd.b % 2 ? 'first' : 'last' }).map;
      case 1:
        return createPeer(map, a, cmd.b % 2 ? 'before' : 'after').map;
      case 2:
        return deleteBranch(map, a);
      case 3:
        return moveBranch(map, a, { parentId: b, index: cmd.b % 5 });
      case 4:
        return moveSibling(map, a, cmd.b % 2 ? 1 : -1);
      case 5:
        return duplicateBranch(map, a).map;
      case 6:
        return toggleFold(map, a);
      case 7:
        return foldToLevel(map, (cmd.b % 4) + 1);
      case 9:
        return deleteNode(map, a);
      default:
        return renameTopic(map, a, `T${cmd.b}`);
    }
  } catch (error) {
    // Rejected operations (Core edits, cycles) must leave the map untouched.
    if (error instanceof ModelError) return map;
    throw error;
  }
}

describe('tree invariants under random edits', () => {
  it('stay valid after every operation', () => {
    fc.assert(
      fc.property(fc.array(commandArb, { maxLength: 80 }), (commands) => {
        let map = createMap({ coreId: 'core' });
        for (const cmd of commands) {
          map = apply(map, cmd);
          expect(validateMap(map)).toEqual([]);
          expect(map.topics['core']?.parentId).toBeNull();
        }
      }),
      { numRuns: 200 },
    );
  });

  it('keeps counts consistent for delete and duplicate', () => {
    fc.assert(
      fc.property(fc.array(commandArb, { maxLength: 40 }), fc.nat(1000), (commands, pickAt) => {
        let map = createMap({ coreId: 'core' });
        for (const cmd of commands) map = apply(map, cmd);
        const ids = Object.keys(map.topics).filter((id) => id !== 'core');
        if (ids.length === 0) return;
        const id = ids[pickAt % ids.length] as string;
        const size = subtreeOf(map, id).length;
        expect(countTopics(deleteBranch(map, id))).toBe(countTopics(map) - size);
        expect(countTopics(duplicateBranch(map, id).map)).toBe(countTopics(map) + size);
      }),
      { numRuns: 100 },
    );
  });
});
