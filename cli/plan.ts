/**
 * The command `oriko plan` on adx: which block of a CV lands on which page.
 *
 * plan: the command, which the tool lists under the word plan.
 *
 * @example const { exit, out } = await run(oriko, ['plan', '--profile', 'acme']);
 */
import { read } from '@honeyglass/adx';
import { z } from 'zod';
import { checked } from '../core/load.ts';
import { cv, profile } from '../core/options.ts';
import { Plan, place } from '../core/place.ts';
import { cvChoices, profileChoices } from '../core/sources.ts';
import { build, preview } from './build.ts';

export const plan = read({
  does: 'places every block on the pages',
  input: z.object({ cv, profile }),
  example: {},
  values: { cv: cvChoices, profile: profileChoices },
  output: Plan,
  run: async ({ cv, profile }, { refuse }) => {
    const loaded = await checked(cv, profile);
    if (Array.isArray(loaded)) return refuse(...loaded);
    const placed = place(loaded);
    return Array.isArray(placed) ? refuse(...placed) : placed;
  },
  next: (_, { cv, profile }) => [preview.step({ cv, profile }), build.step({ cv, profile })],
});
