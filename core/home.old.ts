/**
 * The data folder of the old shell: every CV in cvs/, and one profile per job posting in profiles/.
 *
 * cvNames, profileNames: the CVs and the profiles of a data folder, by name.
 * homeIssues: what keeps a data folder from being read.
 *
 * A CV or a profile is found by its name among the files that exist, never by a path built from
 * the name alone, so a name cannot lead out of the folder.
 *
 * @example const names = await cvNames(home);
 */
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { $try } from '@honeyglass/utils/ts';
import type { Issue } from './errors.ts';
import { isMissing, pathIssue } from './files.ts';
import * as issue from './issues.old.ts';

const SUFFIX = '.json';
const NO_FILES: string[] = [];

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
