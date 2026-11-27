/**
 * The command `oriko photo set` on adx: any PNG or JPEG becomes the square PNG the CV uses.
 *
 * set: the command, which the tool lists under the words photo set.
 *
 * The picture is copied into the data folder, so the CV never depends on a file elsewhere. The
 * photo goes to `cvs/NAME.png`, or to `profiles/NAME.png` for a profile, and the CV or the profile
 * names it. adx writes nothing when the plan refuses; else it stages both files whole and renames
 * them one after the other, so a failed second rename leaves the photo moved, and the answer's state
 * names it. A photo is kept data, so a stored one is replaced only with --replace (adx decision 70).
 *
 * @example const { exit, out } = await run(oriko, ['photo', 'set', '--file', '/tmp/me.png']);
 */
import { effect } from '@honeyglass/adx';
import type { File } from '@honeyglass/adx';
import { z } from 'zod';
import { FILE_LIMITS } from '../core/files.limits.ts';
import { cvFile, cvNames, home, profileFile } from '../core/home.ts';
import type { Issues, Stored } from '../core/issues.ts';
import { chosenName, noStoredCv, storedShape } from '../core/load.ts';
import { cv, profile } from '../core/options.ts';
import { cvChoices, profileChoices } from '../core/sources.ts';
import { squarePhoto } from './images.ts';

export const set = effect({
  does: 'stores the square photo of a CV, or of one profile',
  input: z.object({
    // The picture may lie anywhere on the disk, so it is a plain path that ./images.ts reads,
    // not a file of a root.
    file: z
      .string()
      .describe(
        'the picture, a PNG or JPEG file anywhere on the disk; a relative path starts at the working directory',
      ),
    cv,
    profile,
  }),
  // A path of this machine would stand in the schema, so the example names the placeholder of the
  // package, relative to its root, for a profile without a photo of its own.
  example: { file: 'assets/placeholder.png', profile: 'acme' },
  values: { cv: cvChoices, profile: profileChoices },
  plan: async ({ file, cv, profile }, { files, refuse }) => {
    const owner = await ownerOf(cv, profile);
    if (Array.isArray(owner)) return refuse(...owner);
    const picture = await squarePhoto(file);
    if (Array.isArray(picture)) return refuse(...picture);
    return {
      photo: files.write(home.file(owner.photo), picture),
      owner: await files.update(owner.file, FILE_LIMITS.inputBytes, () => owner.text),
    };
  },
});

/** The file that names the photo, where the photo goes, and the file's new text. */
type Owner = { file: File; photo: string; text: string };

/**
 * A profile has a photo of its own; without one, the CV of --cv or the only CV gets it.
 *
 * @param cv - the name `--cv` gives, which counts only without a profile
 * @param profile - the name `--profile` gives
 * @returns the owner; NO_CV, CV_REQUIRED, or SCHEMA below the field of the stored file
 */
async function ownerOf(
  cv: string | undefined,
  profile: string | undefined,
): Promise<Owner | Issues<Stored>> {
  const names = await cvNames();
  if (names.length === 0) return [noStoredCv()];
  if (profile !== undefined)
    return withPhoto('profile', profileFile(profile), `profiles/${profile}.png`);
  const name = chosenName(names, cv, undefined);
  if (typeof name !== 'string') return name;
  return withPhoto('cv', cvFile(name), `cvs/${name}.png`);
}

/**
 * The stored file is checked against its shape before it changes, so a broken CV is never written.
 *
 * @param field - the field of the call that names the stored file
 * @param file - the stored CV or profile
 * @param photo - the place of the photo inside the data folder
 * @returns the owner with the file's text, its field person.photo set; SCHEMA below the field
 */
async function withPhoto(
  field: Stored,
  file: File,
  photo: string,
): Promise<Owner | Issues<Stored>> {
  const stored = await storedShape(field, file);
  if (Array.isArray(stored)) return stored;
  const content = { ...stored, person: { ...stored.person, photo } };
  return { file, photo, text: `${JSON.stringify(content, null, 2)}\n` };
}
