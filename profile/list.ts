/**
 * The command profiles: every profile of the data folder, and whether each fits its pages.
 *
 * listProfiles: every profile with its CV, whether it builds, and on how many pages.
 *
 * @example const answer = await listProfiles(home, undefined);
 */
import { done } from '../core/errors.ts';
import type { Result } from '../core/errors.ts';
import { place } from '../core/place.old.ts';
import { heldCvs, profileNames } from '../core/home.old.ts';
import { checked, cvOf, profileOf } from '../core/load.old.ts';

type Fields = Record<string, unknown>;

// Every profile with what a caller needs to pick one: its CV, whether it builds, and on how many pages.
export async function listProfiles(
  home: string,
  cvName: string | undefined,
): Promise<Result<Fields>> {
  const cvs = await heldCvs(home);
  if (cvs.error !== null) return cvs;
  const only = cvs.data.length === 1 ? cvs.data[0] : undefined;
  const listed = [];
  for (const name of await profileNames(home)) {
    const profile = await profileOf(home, name);
    const cv = cvOf(profile.data) ?? only;
    const built = await checked(home, cvName, name);
    const placed = built.error === null ? place(built.data) : built;
    const issues = placed.error?.issues.map(issue => issue.code);
    listed.push(
      placed.error === null
        ? { name, cv, fits: true, pages: placed.data.pages.length }
        : { name, cv, fits: false, issues },
    );
  }
  return done({ profiles: listed });
}
