/**
 * The CV a command on the old shell names, read and checked, and the CV a named profile names.
 *
 * checked: the checked CV of one name.
 * profileCv: the CV a named profile names.
 *
 * @example const cv = await checked(home, 'jane');
 */
import { check } from './check.ts';
import { readJson } from './files.ts';
import { chosenCv, profilePath } from './home.old.ts';
import { cvOf } from './load.ts';

// The CV the named profile names, so a list follows the CV the command itself would use.
export async function profileCv(home: string, profileName: string | undefined) {
  if (profileName === undefined) return undefined;
  const profile = await profileOf(home, profileName);
  return cvOf(profile.data);
}

// The checked CV of the name `oriko cvs` lists.
export async function checked(home: string, cvName: string) {
  const cv = await chosenCv(home, cvName);
  if (cv.error !== null) return cv;
  const master = await readJson(cv.data.path, 'cv');
  if (master.error !== null) return master;
  return check(master.data);
}

async function profileOf(home: string, name: string) {
  const path = await profilePath(home, name);
  if (path.error !== null) return path;
  return readJson(path.data, 'profile');
}
