/**
 * The command `oriko profiles` on adx: every profile of the data folder, and whether it builds.
 *
 * profiles: the list, which the tool lists under the word profiles.
 *
 * A profile is applied to its CV and placed, and the list answers what keeps it from building
 * instead of refusing: a refusal of adx for the read of one stored file, such as a file that
 * holds no JSON or may not be read, becomes the codes of that profile. Any other error is a bug
 * and ends the call. The key is the name, and the outline holds every field, so no command shows
 * one.
 *
 * @example const { exit, out } = await run(oriko, ['profiles']);
 */
import { Refused, list, paged } from '@honeyglass/adx';
import { $try } from '@honeyglass/utils/ts';
import { z } from 'zod';
import { cvNames, profileNames } from '../core/home.ts';
import { checked, noStoredCv, profileCvOf } from '../core/load.ts';
import { place } from '../core/place.ts';

const Listed = z.object({
  name: z.string().describe('the name of the profile'),
  cv: z.string().optional().describe('the CV it belongs to'),
  fits: z.boolean().describe('whether the CV fits its pages with it'),
  pages: z.number().optional().describe('the pages it fills, when it fits'),
  issues: z.array(z.string()).optional().describe('the codes of what keeps it from building'),
});

// The step after it, plan, lies in cli/ and stands in cli/next.ts.
export const profiles = list({
  does: 'lists the profiles and whether each fits its pages',
  item: Listed,
  key: 'name',
  outline: ['cv', 'fits', 'pages', 'issues'],
  run: async (_, { page, refuse }) => {
    const cvs = await cvNames();
    if (cvs.length === 0) return refuse(noStoredCv());
    const only = cvs.length === 1 ? cvs[0] : undefined;
    const listed = [];
    for (const name of await profileNames()) listed.push(await listedOf(name, only));
    return paged(listed, page);
  },
});

/**
 * @param name - the name of a stored profile
 * @param only - the one CV of the data folder, which a profile without a field cv belongs to
 * @returns the profile with its CV, and the pages it fills or the codes that keep it from building
 */
async function listedOf(name: string, only: string | undefined) {
  const cv = (await profileCvOf(name)) ?? only;
  const built = await $try(builtOf(name));
  if (built.error === null)
    return typeof built.data === 'number'
      ? { name, cv, fits: true, pages: built.data }
      : { name, cv, fits: false, issues: built.data };
  if (built.error instanceof Refused) {
    const issues = built.error.issues.map(found => found.code);
    return { name, cv, fits: false, issues };
  }
  throw built.error;
}

// The pages the profile fills, or the codes of the check and of the page plan.
async function builtOf(name: string) {
  const loaded = await checked(undefined, name);
  const placed = Array.isArray(loaded) ? loaded : place(loaded);
  return Array.isArray(placed) ? placed.map(found => found.code) : placed.pages.length;
}
