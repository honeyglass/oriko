/**
 * The command cvs: every CV of the data folder, and whether each fits its pages.
 *
 * listCvs: every CV with its language, its person, and whether it fits, or why not.
 *
 * @example const answer = await listCvs(home);
 */
import { done } from '../core/errors.ts';
import type { Result } from '../core/errors.ts';
import { place } from '../core/place.old.ts';
import { heldCvs } from '../core/home.old.ts';
import { checked } from '../core/load.old.ts';

type Fields = Record<string, unknown>;

// Every CV with what a caller needs to pick one: its language, its person, and whether it fits.
export async function listCvs(home: string): Promise<Result<Fields>> {
  const names = await heldCvs(home);
  if (names.error !== null) return names;
  const listed = [];
  for (const name of names.data) {
    const cv = await checked(home, name);
    const placed = cv.error === null ? place(cv.data) : cv;
    if (cv.error !== null || placed.error !== null) {
      listed.push({
        name,
        fits: false,
        issues: (placed.error ?? cv.error)?.issues.map(issue => issue.code),
      });
      continue;
    }
    const { language, person } = cv.data;
    listed.push({
      name,
      language,
      person: `${person.firstName} ${person.lastName}`,
      fits: true,
      pages: placed.data.pages.length,
    });
  }
  return done({ cvs: listed });
}
