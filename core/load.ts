/**
 * The CV and the profile a command on adx names, found, read and checked.
 *
 * Checked, checked: the checked CV, with the named profile applied, and the two files as read.
 * fileOf: the file an issue of the check or of the page plan lies in.
 *
 * Both files are read through the root `home`, which keeps them inside the data folder, with the
 * byte limit of the JSON input. adx refuses a file that is too large or holds no JSON.
 *
 * @example const loaded = await checked(cv, profile);
 */
import type { File } from '@honeyglass/adx';
import { shown } from '@honeyglass/utils/ts';
import { z } from 'zod';
import { check } from './check.ts';
import { Profile } from './cv.schema.ts';
import type { Master } from './cv.schema.ts';
import type { Issue } from './errors.ts';
import { FILE_LIMITS } from './files.limits.ts';
import { cvFile, cvNames, profileFile } from './home.ts';
import { cvMismatch, cvRequired, noCv, raised, unknownCv } from './issues.ts';
import type { Issues, Stored } from './issues.ts';
import { place } from './place.old.ts';

/** The checked CV, and the CV and the profile as their files hold them. */
export type Checked = { master: Master; cv: unknown; profile: unknown };

/**
 * An issue inside a stored file stands below the field of the call that names the file (adx
 * decision 69): the unknown block of the profile `broken` stands at `profile.blocks.nobody`.
 *
 * @param cv - the name `--cv` gives, which adx found among the stored CVs
 * @param profile - the name `--profile` gives, which adx found among the stored profiles
 * @returns the checked CV; NO_CV, CV_REQUIRED, CV_MISMATCH, UNKNOWN_CV, or what the check finds
 */
export async function checked(
  cv: string | undefined,
  profile: string | undefined,
): Promise<Checked | Issues<Stored>> {
  const names = await cvNames();
  if (names.length === 0) return [noCv.issue('The data folder holds no CV')];
  const applied = profile === undefined ? undefined : await storedJson(profileFile(profile));
  const name = chosenName(names, cv, cvOf(applied));
  if (typeof name !== 'string') return name;
  const master = await storedJson(cvFile(name));
  const result = check(master, applied);
  if (result.error !== null) return raised(fileOf(master, applied), result.error);
  return { master: result.data, cv: master, profile: applied };
}

/**
 * An issue the CV alone raises lies in the CV. Any other lies in the profile when the profile
 * holds a value at its path, and in the CV otherwise, so a path always leads to a value in the
 * file its first part names: a long role the profile sets is `profile.person.role`, and a page
 * overflow the profile causes stays `cv.pages`, since a profile holds no `pages`.
 *
 * @param cv - the CV as its file holds it
 * @param profile - the profile as its file holds it, or nothing
 * @returns the file of each issue of the check, of the page plan or of the photo, with the
 *   profile applied
 */
export function fileOf(cv: unknown, profile: unknown): (found: Found) => Stored {
  if (profile === undefined) return () => 'cv';
  const own = new Set(aloneIssues(cv).map(keyOf));
  return found =>
    own.has(keyOf(found)) === false && holds(profile, found.path) ? 'profile' : 'cv';
}

// What the check and the page plan find in the CV without the profile.
function aloneIssues(cv: unknown): Issue[] {
  const alone = check(cv);
  if (alone.error !== null) return alone.error.issues;
  return place(alone.data).error?.issues ?? [];
}

/** What fileOf reads of an issue: its code, and its path in the CV with the profile applied. */
type Found = Pick<Issue, 'code' | 'path'>;

const keyOf = (found: Found) => `${found.code} ${found.path}`;

// Whether the value holds a key at each part of the path; the empty path is the value itself.
function holds(value: unknown, path: string) {
  let at = value;
  for (const part of path === '' ? [] : path.split('.')) {
    const keys = new Map<string, unknown>(
      typeof at === 'object' && at !== null ? Object.entries(at) : [],
    );
    if (keys.has(part) === false) return false;
    at = keys.get(part);
  }
  return true;
}

const storedJson = (file: File) => file.json(FILE_LIMITS.inputBytes, z.unknown());

// The CV a profile names; check() reports a profile that fails its schema, so this one only reads.
const cvOf = (profile: unknown) => {
  const parsed = Profile.safeParse(profile);
  return parsed.success ? parsed.data.cv : undefined;
};

// --cv, the CV of the profile, or the only CV there is. adx found --cv in the list already, so
// only the name a profile holds can be unknown.
function chosenName(
  names: string[],
  explicit: string | undefined,
  fromProfile: string | undefined,
): string | Issues<Stored> {
  const isMismatch =
    explicit !== undefined && fromProfile !== undefined && explicit !== fromProfile;
  if (isMismatch) {
    const message = `--cv names ${shown(explicit)}, but the profile belongs to ${shown(fromProfile)}`;
    return [cvMismatch.at('cv', message)];
  }
  const name = explicit ?? fromProfile ?? (names.length === 1 ? names[0] : undefined);
  if (name === undefined)
    return [cvRequired.at('cv', 'The data folder holds several CVs and the call names none')];
  if (names.includes(name)) return name;
  const message = `The profile names the CV ${shown(name)}, which the data folder does not hold`;
  return [unknownCv.at(['profile', 'cv'], message)];
}
