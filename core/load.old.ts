/**
 * The CV and the profile a command names, read, and checked when the command needs them whole.
 *
 * checked: the checked CV, with the named profile applied when there is one.
 * profileOf: the unchecked value of a named profile.
 * cvOf, profileCv: the CV a profile names, and the CV a named profile names.
 *
 * @example const cv = await checked(call.home, call.values.cv, call.values.profile);
 */
import { done } from './errors.ts';
import { check } from './check.ts';
import { Profile } from './cv.schema.ts';
import { readJson } from './files.ts';
import { chosenCv, profilePath } from './home.old.ts';

// The CV the named profile names, so a list follows the CV the command itself would use.
export async function profileCv(home: string, profileName: string | undefined) {
  if (profileName === undefined) return undefined;
  const profile = await profileOf(home, profileName);
  return cvOf(profile.data);
}

// The checked CV, with the profile applied when one is named.
export async function checked(
  home: string,
  cvName: string | undefined,
  profileName: string | undefined,
) {
  const profile = profileName === undefined ? done(undefined) : await profileOf(home, profileName);
  if (profile.error !== null) return profile;
  const cv = await chosenCv(home, cvName, cvOf(profile.data));
  if (cv.error !== null) return cv;
  const master = await readJson(cv.data.path, 'cv');
  if (master.error !== null) return master;
  return check(master.data, profile.data);
}

export async function profileOf(home: string, name: string) {
  const path = await profilePath(home, name);
  if (path.error !== null) return path;
  return readJson(path.data, 'profile');
}

// The CV a profile names; check() reports a profile that fails its schema, so this one only reads.
export const cvOf = (profile: unknown) => {
  const parsed = Profile.safeParse(profile);
  return parsed.success ? parsed.data.cv : undefined;
};
