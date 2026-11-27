/**
 * The command that swaps the photo: any PNG or JPEG becomes the square PNG the CV uses.
 *
 * setPhoto: stores a picture as the photo of a CV, or of one profile.
 *
 * The picture is copied into the data folder, so the CV never depends on a file elsewhere.
 * Only bytes that decode as a picture are stored, whatever the file is called.
 *
 * @example const answer = await setPhoto({ home, cwd, source: 'portrait.jpg', profile: 'acme', isDryRun: false });
 */
import { join, resolve } from 'node:path';
import { trySync$ } from '@honeyglass/utils/ts';
import { done, rejected } from '../core/errors.ts';
import type { Result } from '../core/errors.ts';
import * as issue from './issues.old.ts';
import * as coreIssue from '../core/issues.old.ts';
import { FILE_LIMITS } from '../core/files.limits.ts';
import { Master, Profile } from '../core/cv.schema.ts';
import { squarePhoto } from './images.ts';
import { readBounded, readJson, writeAll } from '../core/files.ts';
import { chosenCv, profilePath } from '../core/home.old.ts';

type Request = {
  home: string;
  cwd: string;
  source: string | undefined;
  cv: string | undefined;
  profile: string | undefined;
  isDryRun: boolean;
};
type Owner = { path: string; photo: string; content: unknown };

/**
 * @param request - the data folder, the picture to store and the profile it is for, if any
 * @returns where the photo was stored, relative to the data folder
 */
export async function setPhoto(request: Request): Promise<Result<Record<string, unknown>>> {
  const { home, cwd, source, cv, profile, isDryRun } = request;
  if (source === undefined) return rejected('photo set', [issue.missingPicture()]);
  const owner = profile === undefined ? await cvOwner(home, cv) : await profileOwner(home, profile);
  if (owner.error !== null) return owner;
  const picture = await squared(resolve(cwd, source));
  if (picture.error !== null) return picture;
  const { path, photo, content } = owner.data;
  if (isDryRun) return done({ command: 'photo set', photo, written: false });
  const written = await writeAll(
    [
      { path: join(home, photo), content: picture.data },
      { path, content: `${JSON.stringify(content, null, 2)}\n` },
    ],
    'home',
  );
  if (written.error !== null) return written;
  return done({ command: 'photo set', photo, written: true });
}

// The CV with its photo set to cvs/NAME.png, the photo its profiles share.
async function cvOwner(home: string, explicit: string | undefined): Promise<Result<Owner>> {
  const cv = await chosenCv(home, explicit);
  if (cv.error !== null) return cv;
  const raw = await readJson(cv.data.path, 'cv');
  if (raw.error !== null) return raw;
  const master = Master.safeParse(raw.data);
  if (master.success === false)
    return rejected('photo set', coreIssue.schemaIssues(master.error, [], 'master'));
  const photo = `cvs/${cv.data.name}.png`;
  return done({
    path: cv.data.path,
    photo,
    content: { ...master.data, person: { ...master.data.person, photo } },
  });
}

// A profile with its own photo; the name is one profilePath() found among the existing files.
async function profileOwner(home: string, name: string): Promise<Result<Owner>> {
  const path = await profilePath(home, name);
  if (path.error !== null) return path;
  const raw = await readJson(path.data, 'profile');
  if (raw.error !== null) return raw;
  const profile = Profile.safeParse(raw.data);
  if (profile.success === false)
    return rejected('photo set', coreIssue.schemaIssues(profile.error, [], 'profile'));
  const photo = `profiles/${name}.png`;
  return done({
    path: path.data,
    photo,
    content: { ...profile.data, person: { ...profile.data.person, photo } },
  });
}

async function squared(path: string): Promise<Result<Uint8Array>> {
  const bytes = await readBounded(path, FILE_LIMITS.photoBytes, 'file');
  if (bytes.error !== null) return bytes;
  const square = trySync$(() => squarePhoto(bytes.data));
  if (square.error !== null)
    return rejected('photo set', [{ ...issue.photoUnreadable(), path: 'file' }], square.error);
  return done(square.data);
}
