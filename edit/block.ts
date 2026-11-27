/**
 * The commands `oriko block add|update|remove|move` on adx: a whole block of a CV.
 *
 * add, update, remove, move: the commands, which the tool lists under the words block ….
 *
 * @example const { exit, out } = await run(oriko, ['block', 'remove', '--json', '{"id":"awards"}']);
 */
import { effect } from '@honeyglass/adx';
import { cvChoices } from '../core/sources.ts';
import { apply } from './apply.ts';
import { INPUT } from './edit.schema.ts';
import { saved } from './save.ts';

export const add = effect({
  does: 'adds a block, such as a job or a skill group',
  input: INPUT['block add'],
  example: { block: { id: 'tools', kind: 'list', section: 'Tools', items: ['Vim'] } },
  values: { cv: cvChoices },
  replace: false,
  plan: async (input, { files, refuse }) => {
    const done = await saved(input.cv, files, master => apply(master, 'block add', input));
    return Array.isArray(done) ? refuse(...done) : done;
  },
});

export const update = effect({
  does: 'changes fields of a block',
  input: INPUT['block update'],
  example: { id: 'libraries', set: { title: 'Frameworks' } },
  values: { cv: cvChoices },
  replace: false,
  plan: async (input, { files, refuse }) => {
    const done = await saved(input.cv, files, master => apply(master, 'block update', input));
    return Array.isArray(done) ? refuse(...done) : done;
  },
});

export const remove = effect({
  does: 'removes a block',
  input: INPUT['block remove'],
  example: { id: 'awards' },
  values: { cv: cvChoices },
  replace: false,
  plan: async (input, { files, refuse }) => {
    const done = await saved(input.cv, files, master => apply(master, 'block remove', input));
    return Array.isArray(done) ? refuse(...done) : done;
  },
});

export const move = effect({
  does: 'moves a block, or pins it to a page',
  input: INPUT['block move'],
  example: { id: 'awards', before: 'interests' },
  values: { cv: cvChoices },
  replace: false,
  plan: async (input, { files, refuse }) => {
    const done = await saved(input.cv, files, master => apply(master, 'block move', input));
    return Array.isArray(done) ? refuse(...done) : done;
  },
});
