/**
 * The plan every edit command shares: one edit applied to the stored CV, then staged on adx.
 *
 * saved: what the edit stages, and whether the CV still fits its pages, or every issue.
 *
 * The CV is read through the root `home`, with the byte limit of the JSON input, and checked
 * against its shape before the edit, so a broken CV is never written. An edit exists to change
 * the CV file, so it updates it with files.update and takes no --replace (adx decision 70).
 *
 * @example const done = await saved(input.cv, files, master => apply(master, 'block add', input));
 */
import type { Files, Written } from '@honeyglass/adx';
import type { Master } from '../core/cv.schema.ts';
import { FILE_LIMITS } from '../core/files.limits.ts';
import { cvFile, cvNames } from '../core/home.ts';
import type { Issues } from '../core/issues.ts';
import { cvName, noStoredCv, storedShape } from '../core/load.ts';
import { fit } from '../core/place.ts';
import type { Fit } from '../core/place.ts';

/**
 * @param cv - the name `--cv` gives, which adx found among the stored CVs
 * @param files - the files of the plan
 * @param edit - the edit, which answers the changed CV or its issues
 * @returns the staged CV file and whether the CV still fits its pages; NO_CV, CV_REQUIRED,
 *   SCHEMA below `cv`, or the issues of the edit
 */
export async function saved<F extends string>(
  cv: string | undefined,
  files: Files,
  edit: (master: Master) => Master | Issues<F>,
): Promise<(Written & Fit) | Issues<F | 'cv'>> {
  const names = await cvNames();
  if (names.length === 0) return [noStoredCv()];
  const name = cvName(names, cv);
  if (typeof name !== 'string') return name;
  const master = await storedShape('cv', cvFile(name));
  if (Array.isArray(master)) return master;
  const edited = edit(master);
  if (Array.isArray(edited)) return edited;
  const text = `${JSON.stringify(edited, null, 2)}\n`;
  const written = await files.update(cvFile(name), FILE_LIMITS.inputBytes, () => text);
  // An edit may make the CV too long. The edit still stands; the answer says so.
  return { ...written, ...fit(edited) };
}
