/**
 * The command `oriko cvs` on adx: every CV of the data folder, and whether it fits its pages.
 *
 * cvs: the list, which the tool lists under the word cvs.
 *
 * A CV is checked and placed, and the list answers what keeps it from fitting instead of
 * refusing: a refusal of adx for the read of one stored file, such as a file that holds no JSON
 * or may not be read, becomes the codes of that CV. Any other error is a bug and ends the call.
 * The key is the name, and the outline holds every field, so no command shows one.
 *
 * @example const { exit, out } = await run(oriko, ['cvs']);
 */
import { Refused, list, paged } from '@honeyglass/adx';
import { $try } from '@honeyglass/utils/ts';
import { z } from 'zod';
import { check } from '../core/check.ts';
import { Language } from '../core/cv.schema.ts';
import { cvFile, cvNames } from '../core/home.ts';
import { noStoredCv, storedJson } from '../core/load.ts';
import { pagePlan } from '../core/place.ts';
import { show } from './show.ts';

const Listed = z.object({
  name: z.string().describe('the name of the CV'),
  language: Language.optional().describe('its language, such as en'),
  person: z.string().optional().describe('the first and the last name'),
  fits: z.boolean().describe('whether it fits its pages'),
  pages: z.number().optional().describe('the pages it fills, when it fits'),
  issues: z.array(z.string()).optional().describe('the codes of what keeps it from fitting'),
});

// The step after it, profiles, lies in profile/ and stands in cli/next.ts.
export const cvs = list({
  does: 'lists the CVs and whether each fits its pages',
  item: Listed,
  key: 'name',
  outline: ['language', 'person', 'fits', 'pages', 'issues'],
  run: async (_, { page, refuse }) => {
    const names = await cvNames();
    if (names.length === 0) return refuse(noStoredCv());
    const listed = [];
    for (const name of names) listed.push(await listedOf(name));
    return paged(listed, page);
  },
  // With one CV the step names it; with several the caller picks one.
  next: ({ items: [only, ...more] }) =>
    only !== undefined && more.length === 0
      ? [show.step({ cv: only.name })]
      : [show.step().needs('cv')],
});

/**
 * @param name - the name of a stored CV
 * @returns the CV with its language and person and the pages it fills, or the codes that keep
 *   it from fitting
 */
async function listedOf(name: string) {
  const read = await $try(storedJson(cvFile(name)));
  if (read.error instanceof Refused) return unfit(name, read.error.issues);
  if (read.error !== null) throw read.error;
  const checked = check(read.data);
  if (checked.error !== null) return unfit(name, checked.error.issues);
  const placed = pagePlan(checked.data);
  if (placed.error !== null) return unfit(name, placed.error.issues);
  const { language, person } = checked.data;
  const pages = placed.data.pages.length;
  return { name, language, person: `${person.firstName} ${person.lastName}`, fits: true, pages };
}

const unfit = (name: string, issues: readonly { code: string }[]) => ({
  name,
  fits: false,
  issues: issues.map(found => found.code),
});
