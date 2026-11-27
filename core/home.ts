/**
 * The two folders oriko may use on adx, and the files a command finds in them.
 *
 * home, work: the data folder `~/.oriko`, and the working directory of the call.
 * cvFile, profileFile: the file of one CV and of one profile in the data folder.
 * cvNames, profileNames: the CVs and the profiles of the data folder, by name.
 * isListed, targetIssue: whether a regular file stands at a place, and the refusal of a write
 * whose target is a link to a file inside its root.
 *
 * `--home` and the variable ORIKO_HOME move the data folder; adx keeps every path inside it and
 * follows no link out of it. A missing default folder holds no CV and no profile.
 *
 * @example const names = await cvNames();
 */
import { dirname, extname } from 'node:path';
import { Refused, cwd, envDir, root } from '@honeyglass/adx';
import type { File, Issue, Root } from '@honeyglass/adx';
import { $try, shown } from '@honeyglass/utils/ts';
import { targetNotAFile } from './issues.ts';

export const home = root('home', envDir('ORIKO_HOME'));
export const work = root('work', cwd);

export const cvFile = (name: string) => home.file(`cvs/${name}.json`);
export const profileFile = (name: string) => home.file(`profiles/${name}.json`);

export const cvNames = async () => (await home.list('cvs', '.json')).map(file => file.stem);
export const profileNames = async () =>
  (await home.list('profiles', '.json')).map(file => file.stem);

/**
 * A list of a root answers regular files only and follows no link, so it tells a file apart
 * from a link to one.
 *
 * @param from - the root of the file
 * @param file - the place to look at
 * @returns whether a regular file stands there
 */
export async function isListed(from: Root, file: File) {
  const listed = await from.list(dirname(file.rel), extname(file.rel));
  return listed.some(other => other.rel === file.rel);
}

/**
 * A write of adx follows a link at its target to a file inside the root and changes that file,
 * so a command that writes a place the call names asks here first. The target must
 * be free or a regular file. A link that leads nowhere or out of the root passes: adx replaces
 * such a link. An edit needs no such check, since it writes only a file the list of its folder
 * found.
 *
 * @param field - the field of the call that names the target
 * @param from - the root of the target
 * @param file - the target of the write
 * @returns TARGET_NOT_A_FILE at the field for a link to a file inside the root, else nothing
 */
export async function targetIssue<F extends string>(
  field: F,
  from: Root,
  file: File,
): Promise<Issue<F> | undefined> {
  const isFile = await $try(async () => file.exists, { or: false, expected: leadsOut });
  if (isFile === false || (await isListed(from, file))) return undefined;
  const message = `${shown(file.rel)} is a link to another file, which the write would change`;
  return targetNotAFile.at(field, message);
}

// adx answers a link that leads out of its root with its own PATH_OUTSIDE, before any write.
const leadsOut = (error: Error) =>
  error instanceof Refused && error.issues.every(found => found.code === 'PATH_OUTSIDE');
