/**
 * The issues the profile commands raise, each made by one function.
 *
 * profileExists: a profile set over a stored profile without --replace.
 * unknownProfile: a profile show for a name with neither a profile nor a posting.
 *
 * @example return rejected('profile set', [issue.profileExists(name)]);
 */
import { shown } from '@honeyglass/utils/ts';
import type { Issue } from '../core/errors.ts';
import { optionText } from '../core/options.old.ts';

export const profileExists = (name: string): Issue => ({
  code: 'PROFILE_EXISTS',
  path: 'profile',
  message: `The profile ${shown(name)} is already stored`,
  hint: 'Run the command to see it; add --replace to overwrite it, or pass another --profile',
  command: `oriko profile show${optionText('profile', name)}`,
});

export const unknownProfile = (name: string): Issue => ({
  code: 'UNKNOWN_PROFILE',
  path: 'profile',
  message: `The data folder has no profile ${shown(name)}, nor a posting read for it`,
  hint: 'Run the command and use one of the profile names it lists',
  command: 'oriko plan --profile',
});
