/**
 * The command profile show: the stored profile of one job posting and the posting read for it.
 *
 * showProfile: the stored profile and the posting, each null when there is none.
 *
 * @example const answer = await showProfile(home, 'acme');
 */
import { join } from 'node:path';
import { shown, trySync$ } from '@honeyglass/utils/ts';
import { done, rejected } from '../core/errors.ts';
import type { Result } from '../core/errors.ts';
import * as issue from './issues.ts';
import * as coreIssue from '../core/issues.old.ts';
import { Profile } from '../core/cv.schema.ts';
import { existingText } from '../core/files.ts';
import { profileName } from './name.ts';

type Fields = Record<string, unknown>;

/**
 * @param home - the data folder
 * @param name - the profile's name
 * @returns the stored profile and the posting read for it, each null when there is none
 */
export async function showProfile(home: string, name: string | undefined): Promise<Result<Fields>> {
  const checkedName = profileName(name, 'profile show');
  if (checkedName.error !== null) return checkedName;
  const profile = await storedProfile(join(home, 'profiles', `${checkedName.data}.json`));
  if (profile.error !== null) return profile;
  const posting = await existingText(join(home, 'profiles', `${checkedName.data}.posting.md`));
  if (posting.error !== null) return posting;
  if (profile.data === null && posting.data === null)
    return rejected('profile show', [issue.unknownProfile(checkedName.data)]);
  return done({ name: checkedName.data, profile: profile.data, posting: posting.data });
}

async function storedProfile(path: string): Promise<Result<Profile | null>> {
  const text = await existingText(path);
  if (text.error !== null) return text;
  if (text.data === null) return done(null);
  const raw = text.data;
  const value = trySync$((): unknown => JSON.parse(raw));
  if (value.error !== null)
    return rejected(
      'profile show',
      [coreIssue.invalidJson(`The file ${shown(path)}`)],
      value.error,
    );
  const profile = Profile.safeParse(value.data);
  if (profile.success === false)
    return rejected('profile show', coreIssue.schemaIssues(profile.error, [], 'profile'));
  return done(profile.data);
}
