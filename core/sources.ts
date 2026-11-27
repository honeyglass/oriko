/**
 * The lists of values the fields `--cv` and `--profile` take, read from the data folder.
 *
 * cvChoices, profileChoices: the stored CVs and the stored profiles, by name.
 *
 * adx lists them for an option given without a value, and refuses a value outside them.
 *
 * @example values: { cv: cvChoices, profile: profileChoices }
 */
import { cvNames, profileNames } from './home.ts';

export const cvChoices = async () => (await cvNames()).map(value => ({ value }));

export const profileChoices = async () => (await profileNames()).map(value => ({ value }));
