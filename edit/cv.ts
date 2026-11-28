/**
 * The command `oriko cv update` on adx: the language, the pages, the person and the contact title.
 *
 * update: the command, which the tool lists under the words cv update.
 *
 * The photo stays out of reach here: `oriko photo set` writes the picture and its path together.
 *
 * @example const { exit, out } = await run(oriko, ['cv', 'update', '--json', '{"pages":1}']);
 */
import { effect } from '@honeyglass/adx';
import { oversized } from '../core/issues.ts';
import { cvChoices } from '../core/sources.ts';
import { apply } from './apply.ts';
import { INPUT } from './edit.schema.ts';
import { saved } from './save.ts';

export const update = effect({
  does: 'changes the language, the pages, the person or the contact title',
  input: INPUT['cv update'],
  example: { language: 'de' },
  values: { cv: cvChoices },
  check: oversized,
  replace: false,
  plan: async (input, { files, refuse }) => {
    const done = await saved(input.cv, files, master => apply(master, 'cv update', input));
    return Array.isArray(done) ? refuse(...done) : done;
  },
});
