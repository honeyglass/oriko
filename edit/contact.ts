/**
 * The commands `oriko contact add|update|remove|move` on adx: one contact line of a CV.
 *
 * add, update, remove, move: the commands, which the tool lists under the words contact ….
 *
 * @example const { exit, out } = await run(oriko, ['contact', 'remove', '--json', '{"index":0}']);
 */
import { effect } from '@honeyglass/adx';
import { cvChoices } from '../core/sources.ts';
import { apply } from './apply.ts';
import { INPUT } from './edit.schema.ts';
import { saved } from './save.ts';

export const add = effect({
  does: 'adds a contact line',
  input: INPUT['contact add'],
  example: { value: { icon: 'mail', lines: ['jane@example.org'] } },
  values: { cv: cvChoices },
  replace: false,
  plan: async (input, { files, refuse }) => {
    const done = await saved(input.cv, files, master => apply(master, 'contact add', input));
    return Array.isArray(done) ? refuse(...done) : done;
  },
});

export const update = effect({
  does: 'changes a contact line',
  input: INPUT['contact update'],
  example: { index: 0, value: { lines: ['jane@example.org'] } },
  values: { cv: cvChoices },
  replace: false,
  plan: async (input, { files, refuse }) => {
    const done = await saved(input.cv, files, master => apply(master, 'contact update', input));
    return Array.isArray(done) ? refuse(...done) : done;
  },
});

export const remove = effect({
  does: 'removes a contact line',
  input: INPUT['contact remove'],
  example: { index: 0 },
  values: { cv: cvChoices },
  replace: false,
  plan: async (input, { files, refuse }) => {
    const done = await saved(input.cv, files, master => apply(master, 'contact remove', input));
    return Array.isArray(done) ? refuse(...done) : done;
  },
});

export const move = effect({
  does: 'moves a contact line',
  input: INPUT['contact move'],
  example: { index: 1, to: 0 },
  values: { cv: cvChoices },
  replace: false,
  plan: async (input, { files, refuse }) => {
    const done = await saved(input.cv, files, master => apply(master, 'contact move', input));
    return Array.isArray(done) ? refuse(...done) : done;
  },
});
