/**
 * The lists of values the fields `--cv`, `--profile` and `--block` take, read from the data folder.
 *
 * cvChoices, profileChoices: the stored CVs and the stored profiles, by name.
 * profileOfCvChoices: the stored profiles that may go with the `--cv` of a call.
 * blockChoices: the blocks of the CV a call names, as its file holds them.
 *
 * adx lists them for an option given without a value, and refuses a value outside them.
 *
 * @example values: { cv: cvChoices, profile: profileChoices, block: blockChoices }
 */
import { Refused } from '@honeyglass/adx';
import type { Issue, Source } from '@honeyglass/adx';
import { cvNames, profileNames } from './home.ts';
import { profileCvOf, shownCv } from './load.ts';

export const cvChoices = async () => (await cvNames()).map(value => ({ value }));

export const profileChoices = async () => (await profileNames()).map(value => ({ value }));

/**
 * adx checks each value a step carries alone against its source, beside the other fields of the
 * refused call, so the profile of a call that names another CV must fall out of the list here:
 * the hint of an unknown block then lists the blocks of the CV the call named, and never names a
 * command that refuses with CV_MISMATCH.
 *
 * @param input - the field `--cv` of the call, as far as adx found it
 * @returns every profile without `--cv`; with it, the profiles of that CV and those that name none
 */
export const profileOfCvChoices: Source<{ cv: string }> = async ({ cv }) => {
  const names = await profileNames();
  const fitting = [];
  for (const name of names) if (await isOfCv(name, cv)) fitting.push({ value: name });
  return fitting;
};

async function isOfCv(profile: string, cv: string | undefined) {
  if (cv === undefined) return true;
  const named = await profileCvOf(profile);
  return named === undefined || named === cv;
}

/**
 * Every block of the stored CV, hidden ones too, with no profile applied, so the hint of an
 * unknown block lists the ids a profile or an edit may name. A source answers choices only, so
 * what keeps the CV from being read, such as NO_CV or CV_REQUIRED, is thrown as the refusal of
 * the call.
 *
 * @param input - the fields `--cv` and `--profile` of the call, as far as adx found them
 * @returns one choice per block, its id with its kind, section and title
 * @throws the refusal of the call when no CV can be shown
 */
export const blockChoices: Source<{ cv: string; profile: string }> = async ({ cv, profile }) => {
  const shown = await shownCv(cv, profile);
  if (Array.isArray(shown)) throw unlisted(shown);
  return shown.master.blocks.map(block => ({
    value: block.id,
    does: `${block.kind} in ${block.section}${block.title === undefined ? '' : `: ${block.title}`}`,
  }));
};

const unlisted = (issues: Issue[]) =>
  new Refused(
    {
      kind: 'fix',
      step: 'block',
      reason: 'the blocks of a CV cannot be listed before the CV is found',
      next: 'fix every listed issue and call again',
      state: 'Nothing was changed.',
    },
    issues,
  );
