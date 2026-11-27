/**
 * The CV and the profile a command on adx names, found, read and checked.
 *
 * Checked, checked: the checked CV, with the named profile applied, and the two files as read.
 * fileOf: the file an issue of the check or of the page plan lies in.
 * noStoredCv, chosenName, cvName: the issue of a data folder without a CV, and the CV a call works
 * on, with a profile or without one.
 * storedShape: a stored CV or profile a command changes, checked against its shape.
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
import { rejected } from './errors.ts';
import type { Issue } from './errors.ts';
import { FILE_LIMITS } from './files.limits.ts';
import { cvFile, cvNames, profileFile } from './home.ts';
import { SHAPE, cvMismatch, cvRequired, noCv, raised, unknownCv } from './issues.ts';
import type { Issues, Stored } from './issues.ts';
import { schemaIssues } from './issues.old.ts';
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
  if (names.length === 0) return [noStoredCv()];
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

/**
 * A stored file that a command changes is checked against its shape first, so a broken file is
 * never written back.
 *
 * @param field - the field of the call that names the file: `cv` or `profile`
 * @param file - the stored CV or profile
 * @returns the file's value, past its shape; SCHEMA below the field, with the command of its shape
 */
export async function storedShape(field: 'cv', file: File): Promise<Master | Issues<'cv'>>;
export async function storedShape(
  field: Stored,
  file: File,
): Promise<Master | Profile | Issues<Stored>>;
export async function storedShape(field: Stored, file: File) {
  const parsed = SHAPE[field].safeParse(await storedJson(file));
  if (parsed.success) return parsed.data;
  // raised() keeps the code, the path and the message; the command comes from the shape.
  return raised(() => field, rejected('check', schemaIssues(parsed.error, [], field)).error);
}

// The CV a profile names; check() reports a profile that fails its schema, so this one only reads.
const cvOf = (profile: unknown) => {
  const parsed = Profile.safeParse(profile);
  return parsed.success ? parsed.data.cv : undefined;
};

/** NO_CV, the one issue of a data folder that holds no CV, for every command alike. */
export const noStoredCv = () => noCv.issue('The data folder holds no CV');

/**
 * adx found --cv in the list already, so only the name a profile holds can be unknown.
 *
 * @param names - the stored CVs, at least one
 * @param explicit - the name `--cv` gives
 * @param fromProfile - the CV the profile names, or nothing
 * @returns --cv, the CV of the profile, or the only CV; CV_MISMATCH, CV_REQUIRED or UNKNOWN_CV
 */
export function chosenName(
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
  if (fromProfile === undefined) return cvName(names, explicit);
  if (names.includes(fromProfile)) return fromProfile;
  const message = `The profile names the CV ${shown(fromProfile)}, which the data folder does not hold`;
  return [unknownCv.at(['profile', 'cv'], message)];
}

/**
 * The CV a call without a profile works on.
 *
 * @param names - the stored CVs, at least one
 * @param explicit - the name `--cv` gives, which adx found in the list already
 * @returns --cv, or the only CV; CV_REQUIRED
 */
export function cvName(names: string[], explicit: string | undefined): string | Issues<'cv'> {
  const name = explicit ?? (names.length === 1 ? names[0] : undefined);
  if (name === undefined)
    return [cvRequired.at('cv', 'The data folder holds several CVs and the call names none')];
  return name;
}
