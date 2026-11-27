/**
 * The commands `oriko item add|update|remove|move` on adx: one item inside a block of a CV.
 *
 * add, update, remove, move: the commands, which the tool lists under the words item ….
 *
 * An item is a bullet of a job, a skill of a list, a rated skill or an entry, by the kind of its
 * block, so apply.ts checks the value once it found the block.
 *
 * @example const { exit, out } = await run(oriko, ['item', 'add', '--json', '{"block":"libraries","value":"Vitest"}']);
 */
import { effect } from '@honeyglass/adx';
import { oversized } from '../core/issues.ts';
import { cvChoices } from '../core/sources.ts';
import { apply } from './apply.ts';
import { INPUT } from './edit.schema.ts';
import { saved } from './save.ts';

export const add = effect({
  does: 'adds a bullet, a skill or an entry to a block',
  input: INPUT['item add'],
  example: { block: 'libraries', value: 'Vitest' },
  values: { cv: cvChoices },
  check: oversized,
  replace: false,
  plan: async (input, { files, refuse }) => {
    const done = await saved(input.cv, files, master => apply(master, 'item add', input));
    return Array.isArray(done) ? refuse(...done) : done;
  },
});

export const update = effect({
  does: 'changes one item of a block',
  input: INPUT['item update'],
  example: { block: 'libraries', index: 0, value: 'Express' },
  values: { cv: cvChoices },
  check: oversized,
  replace: false,
  plan: async (input, { files, refuse }) => {
    const done = await saved(input.cv, files, master => apply(master, 'item update', input));
    return Array.isArray(done) ? refuse(...done) : done;
  },
});

export const remove = effect({
  does: 'removes one item of a block',
  input: INPUT['item remove'],
  example: { block: 'libraries', index: 0 },
  values: { cv: cvChoices },
  check: oversized,
  replace: false,
  plan: async (input, { files, refuse }) => {
    const done = await saved(input.cv, files, master => apply(master, 'item remove', input));
    return Array.isArray(done) ? refuse(...done) : done;
  },
});

export const move = effect({
  does: 'moves one item inside its block',
  input: INPUT['item move'],
  example: { block: 'libraries', index: 1, to: 0 },
  values: { cv: cvChoices },
  check: oversized,
  replace: false,
  plan: async (input, { files, refuse }) => {
    const done = await saved(input.cv, files, master => apply(master, 'item move', input));
    return Array.isArray(done) ? refuse(...done) : done;
  },
});
