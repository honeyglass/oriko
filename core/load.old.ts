/**
 * The CV a named profile names, for the commands on the old shell.
 *
 * profileCv: the CV a named profile names.
 *
 * @example const cv = await profileCv(home, 'acme');
 */
import { readJson } from './files.ts';
import { profilePath } from './home.old.ts';
import { cvOf } from './load.ts';

// The CV the named profile names, so a list follows the CV the command itself would use.
export async function profileCv(home: string, profileName: string | undefined) {
  if (profileName === undefined) return undefined;
  const profile = await profileOf(home, profileName);
  return cvOf(profile.data);
}

async function profileOf(home: string, name: string) {
  const path = await profilePath(home, name);
  if (path.error !== null) return path;
  return readJson(path.data, 'profile');
}
