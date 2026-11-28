/**
 * The CV and the profile a command on adx names, found, read and checked.
 *
 * Checked, checked: the checked CV, with the named profile applied, and the two files as read.
 * noStoredCv, chosenName, cvName: the issue of a data folder without a CV, and the CV a call works
 * on, with a profile or without one.
 * storedShape, storedCv: a stored CV or profile checked against its shape, and the CV a call names.
 * shownCv: the CV `--cv` or a profile names, past its shape, with the profile not applied.
 * cvOf, profileCvOf, storedJson: the CV a profile names in its field cv, the CV a stored profile
 * names, and a stored file as it holds it.
 *
 * Both files are read through the root `home`, which keeps them inside the data folder, with the
 * byte limit of the JSON input. adx refuses a file that is too large or holds no JSON.
 *
 * @example const loaded = await checked(cv, profile);
 */
import { Refused } from '@honeyglass/adx';
import type { File } from '@honeyglass/adx';
import { $try, shown } from '@honeyglass/utils/ts';
import { z } from 'zod';
import { check } from './check.ts';
import { Profile } from './cv.schema.ts';
import type { Master } from './cv.schema.ts';
import { rejected } from './errors.ts';
import { FILE_LIMITS } from './files.limits.ts';
import { cvFile, cvNames, profileFile } from './home.ts';
import { SHAPE, cvMismatch, cvRequired, noCv, raised, unknownCv } from './issues.ts';
import type { Issues, Stored } from './issues.ts';
import { schemaIssues } from './issues.data.ts';
import { fileOf } from './place.ts';

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

/** A stored CV or profile as its file holds it, read with the byte limit of the JSON input. */
export const storedJson = (file: File) => file.json(FILE_LIMITS.inputBytes, z.unknown());

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
  field: 'profile',
  file: File,
): Promise<Profile | Issues<'profile'>>;
export async function storedShape(
  field: Stored,
  file: File,
): Promise<Master | Profile | Issues<Stored>>;
export async function storedShape(field: Stored, file: File) {
  const parsed = SHAPE[field].safeParse(await storedJson(file));
  if (parsed.success) return parsed.data;
  // raised() keeps the code, the path and the message; the command comes from the shape.
  return raised(() => field, rejected(schemaIssues(parsed.error, [])).error);
}

/** The CV a profile names; check() reports a profile that fails its schema, so this one only reads. */
export const cvOf = (profile: unknown) => {
  const parsed = Profile.safeParse(profile);
  return parsed.success ? parsed.data.cv : undefined;
};

/**
 * The CV a command changes, or checks a profile against, read and past its shape.
 *
 * @param cv - the name `--cv` or the profile gives, which adx found among the stored CVs
 * @returns its name and its value; NO_CV, CV_REQUIRED, or SCHEMA below `cv`
 */
export async function storedCv(
  cv: string | undefined,
): Promise<{ name: string; master: Master } | Issues<'cv'>> {
  const names = await cvNames();
  if (names.length === 0) return [noStoredCv()];
  const name = cvName(names, cv);
  if (typeof name !== 'string') return name;
  const master = await storedShape('cv', cvFile(name));
  return Array.isArray(master) ? master : { name, master };
}

/**
 * The CV a command shows, read and past its shape. A profile only names the CV here and is not
 * applied, so a profile that holds no JSON names none, as before.
 *
 * @param cv - the name `--cv` gives, which adx found among the stored CVs
 * @param profile - the name `--profile` gives, which adx found among the stored profiles
 * @returns its name and its value; NO_CV, CV_REQUIRED, CV_MISMATCH, UNKNOWN_CV, or SCHEMA below
 *   `cv`
 */
export async function shownCv(
  cv: string | undefined,
  profile: string | undefined,
): Promise<{ name: string; master: Master } | Issues<Stored>> {
  const names = await cvNames();
  if (names.length === 0) return [noStoredCv()];
  const name = chosenName(names, cv, await profileCvOf(profile));
  if (typeof name !== 'string') return name;
  const master = await storedShape('cv', cvFile(name));
  return Array.isArray(master) ? master : { name, master };
}

/** The CV a stored profile names; a refusal of adx for its read, such as no JSON, names none. */
export async function profileCvOf(profile: string | undefined) {
  if (profile === undefined) return undefined;
  const read = storedJson(profileFile(profile));
  return cvOf(await $try(read, { or: undefined, expected: error => error instanceof Refused }));
}

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
