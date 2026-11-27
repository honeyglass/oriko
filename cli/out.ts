/**
 * The file a build writes with --out, checked to stay inside the working directory.
 *
 * outputPath: the path of the .docx or .pdf to write, inside the working directory only.
 *
 * Only the shell writes the --out file, so its checks live beside the shell.
 *
 * @example const out = await outputPath(call.io.cwd, call.values.out);
 */
import { lstat, realpath, stat } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { $try } from '@honeyglass/utils/ts';
import { done, rejected } from '../core/errors.ts';
import type { Result } from '../core/errors.ts';
import * as issue from './issues.old.ts';
import * as coreIssue from '../core/issues.old.ts';
import { isMissing, leaves, pathIssue } from '../core/files.ts';

/**
 * @param cwd - the working directory
 * @param out - the path the caller named
 * @returns the file to write, in the folder the check resolved, and its path from the working directory
 */
export async function outputPath(
  cwd: string,
  out: string,
): Promise<Result<{ path: string; name: string }>> {
  if (OUTPUTS.some(extension => out.endsWith(extension)) === false)
    return rejected('build', [issue.wrongExtension(out)]);
  const path = resolve(cwd, out);
  const parent = await $try(realpath(dirname(path)));
  if (parent.error !== null)
    return rejected('build', [folderIssue(parent.error, dirname(path))], parent.error);
  const real = await realpath(cwd);
  const isInside = parent.data === real || leaves(real, parent.data) === false;
  if (isInside === false) return rejected('build', [coreIssue.pathOutside('out', out, cwd)]);
  // The write goes into the folder the check resolved, never again through the path as given.
  const target = join(parent.data, basename(path));
  const kinds = await outputKinds(parent.data, target);
  if (kinds.error !== null) return kinds;
  return done({ path: target, name: relative(real, target) });
}

const folderIssue = (error: Error, folder: string) =>
  isMissing(error) ? issue.folderNotFound(folder, 'out') : pathIssue(error, folder, 'out');

// Checked before the write, so --dry-run answers what the write would meet: a folder to write
// into, and no folder in the place of the file. lstat reads the path as the rename does, which
// replaces a link and never follows it.
async function outputKinds(parent: string, path: string): Promise<Result<undefined>> {
  const folder = await $try(stat(parent));
  if (folder.error !== null) return rejected('build', [pathIssue(folder.error, parent, 'out')]);
  if (folder.data.isDirectory() === false)
    return rejected('build', [coreIssue.notAFolder(parent, 'out')]);
  const file = await $try(lstat(path));
  if (file.error === null)
    return file.data.isDirectory()
      ? rejected('build', [coreIssue.notAFile(path, 'out')])
      : done(undefined);
  return isMissing(file.error)
    ? done(undefined)
    : rejected('build', [pathIssue(file.error, path, 'out')]);
}

const OUTPUTS = ['.docx', '.pdf'];
