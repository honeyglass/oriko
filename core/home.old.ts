/**
 * The data folder: every CV in cvs/, and one profile per job posting in profiles/.
 *
 * cvNames, profileNames: the CVs and the profiles of a data folder, by name.
 * heldCvs: the CVs of a data folder, or the refusal that it holds none.
 * chosenCv: the CV a command works on, from --cv, the profile, or the only CV there is.
 * profilePath: the file of one profile.
 *
 * A CV or a profile is found by its name among the files that exist, never by a path built from
 * the name alone, so a name cannot lead out of the folder.
 *
 * @example const cv = await chosenCv(home, values.cv, profile.cv);
 */
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { $try } from '@honeyglass/utils/ts';
import { done, rejected } from './errors.ts';
import type { Issue, Result } from './errors.ts';
import { isMissing, pathIssue } from './files.ts';
import * as issue from './issues.old.ts';

const SUFFIX = '.json';
const NO_FILES: string[] = [];

export type CvFile = { name: string; path: string };

/**
 * @param home - the data folder
 * @param folder - 'cvs' or 'profiles'
 * @returns the names of the JSON files in that folder, in alphabetical order; none when it is missing
 */
async function namesIn(home: string, folder: 'cvs' | 'profiles') {
  const files = await $try(readdir(join(home, folder)), { or: NO_FILES, expected: isMissing });
  return files
    .filter(file => file.endsWith(SUFFIX))
    .map(file => file.slice(0, -SUFFIX.length))
    .sort();
}

export const cvNames = (home: string) => namesIn(home, 'cvs');
export const profileNames = (home: string) => namesIn(home, 'profiles');

/**
 * @param home - the data folder
 * @param explicit - the name the caller passed with --cv, if any
 * @param fromProfile - the name the profile names in its field cv, if any
 * @returns the name and the path of the CV
 */
export async function chosenCv(
  home: string,
  explicit?: string,
  fromProfile?: string,
): Promise<Result<CvFile>> {
  const isMismatch =
    explicit !== undefined && fromProfile !== undefined && explicit !== fromProfile;
  if (isMismatch) return rejected('home', [issue.cvMismatch(explicit, fromProfile)]);
  const cvs = await heldCvs(home);
  if (cvs.error !== null) return cvs;
  const names = cvs.data;
  const name = explicit ?? fromProfile ?? (names.length === 1 ? names[0] : undefined);
  if (name === undefined) return rejected('home', [issue.cvRequired()]);
  if (names.includes(name)) return done({ name, path: join(home, 'cvs', `${name}${SUFFIX}`) });
  return rejected('home', [
    explicit === undefined ? issue.unknownCvOfProfile(name) : issue.unknownCv(name),
  ]);
}

/**
 * @param home - the data folder
 * @param name - the name of a profile, as profileNames() lists it
 * @returns the path of its file
 */
export async function profilePath(home: string, name: string): Promise<Result<string>> {
  const cvs = await heldCvs(home);
  if (cvs.error !== null) return cvs;
  const names = await profileNames(home);
  if (names.includes(name) === false) return rejected('home', [issue.unknownProfile(name, names)]);
  return done(join(home, 'profiles', `${name}${SUFFIX}`));
}

/**
 * The one place that decides a data folder holds no CV, so every command answers it alike.
 *
 * @param home - the data folder
 * @returns the names of its CVs; NO_CV when it holds none
 */
export async function heldCvs(home: string): Promise<Result<string[]>> {
  const names = await cvNames(home);
  return names.length === 0 ? rejected('home', [await noCv(home)]) : done(names);
}

async function noCv(home: string) {
  const exists = (await $try(stat(home), { or: null, expected: isMissing })) !== null;
  return issue.noCv(home, exists);
}

/**
 * The data folder is checked once where a call enters, so every later list of it reads folders
 * that open; a missing folder is no issue, it holds no CV.
 *
 * @param home - the data folder of a call
 * @returns an issue when the folder, cvs/ or profiles/ is no folder or the system refuses it
 */
export async function homeIssues(home: string): Promise<Issue[]> {
  const info = await $try(stat(home));
  if (info.error !== null)
    return isMissing(info.error) ? [] : [pathIssue(info.error, home, 'home')];
  if (info.data.isDirectory() === false) return [issue.notAFolder(home, 'home')];
  return [...(await listIssues(join(home, 'cvs'))), ...(await listIssues(join(home, 'profiles')))];
}

async function listIssues(folder: string) {
  const listed = await $try(readdir(folder));
  if (listed.error === null || isMissing(listed.error)) return [];
  return [pathIssue(listed.error, folder, 'home')];
}
