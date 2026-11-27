/**
 * Every file the cli reads or writes, and the checks that keep a path where it belongs.
 *
 * readJson: the value of a JSON file.
 * readBounded, pipedBytes, pipedText: a file or a pipe, never more than a limit.
 * existingText: the text a stored file holds, or null when there is none yet.
 * pathIssue: any refusal of the system on a path, as an issue for the caller.
 * isMissing: whether an error says that a path does not exist.
 * photoBytes: the photo a master file or a profile names, from the data folder only.
 * leaves: whether a path leaves its folder.
 * writeAll, NewFile: the files of one command, all written whole or none, never through a link.
 *
 * A master file or a profile may come from an agent that read a job posting. A path inside it
 * therefore opens nothing outside the data folder, also not through a link.
 *
 * @example const master = await readJson(masterPath(home), 'home');
 */
import { constants } from 'node:fs';
import { mkdir, open, realpath, rename, rm, writeFile } from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { $try, anyError, shown, trySync$ } from '@honeyglass/utils/ts';
import { done, rejected } from './errors.ts';
import type { Issue, Result } from './errors.ts';
import * as issue from './issues.old.ts';
import { FILE_LIMITS } from './files.limits.ts';

export const isMissing = (error: Error) => 'code' in error && error.code === 'ENOENT';

// Node marks an error of the operating system with the call that failed.
const isSystemError = (error: Error): error is Error & { code: string } =>
  'syscall' in error && 'code' in error && typeof error.code === 'string';

/**
 * A path the caller gave, and every file in the data folder, is the caller's to fix, whatever the
 * system answers; any other error is a bug of this program and flies on.
 *
 * @param error - the error of a call on the path
 * @param path - the path
 * @param option - the cli option that named it, or that names the data folder
 * @returns the issue for the caller
 */
export function pathIssue(error: Error, path: string, option: string): Issue {
  if (isSystemError(error) === false) throw error;
  if (isMissing(error)) return issue.fileNotFound(path, option);
  if (PATH_CODES.has(error.code)) return issue.pathRefused(path, option, error.code);
  return issue.systemRefused(path, option, error.code);
}

// A definition from POSIX's error numbers: the codes another path or its access rights fix. Any
// other code, one nobody planned for too, goes to the person.
const PATH_CODES = new Set([
  'ENOTDIR',
  'EISDIR',
  'EACCES',
  'EPERM',
  'ELOOP',
  'ENAMETOOLONG',
  'EEXIST',
  'EROFS',
]);

/**
 * @param path - the absolute path of the file
 * @param option - the cli option that named the file, for the hint
 * @returns the parsed value, unchecked
 */
export async function readJson(path: string, option: string): Promise<Result<unknown>> {
  const bytes = await readBounded(path, FILE_LIMITS.inputBytes, option);
  if (bytes.error !== null) return bytes;
  const value = trySync$((): unknown => JSON.parse(bytes.data.toString('utf8')));
  if (value.error !== null)
    return rejected('file', [issue.invalidJson(`The file ${shown(path)}`)], value.error);
  return done(value.data);
}

/**
 * Every file the cli reads comes through here: the kind and the size come from the opened file,
 * so a file swapped after a check cannot slip through, and the open never waits on a pipe.
 *
 * @param path - the absolute path of the file
 * @param limit - the most bytes the file may hold
 * @param option - the cli option that named the file, or the field of the data that did
 * @returns the bytes; a refusal for no regular file, more than limit bytes, or a refusal of the system
 */
export async function readBounded(
  path: string,
  limit: number,
  option: string,
): Promise<Result<Buffer>> {
  const opened = await $try(open(path, constants.O_RDONLY | constants.O_NONBLOCK));
  if (opened.error !== null)
    return rejected('file', [pathIssue(opened.error, path, option)], opened.error);
  const read = await $try(regularBytes(opened.data, { path, limit, option }));
  await opened.data.close();
  if (read.error !== null)
    return rejected('file', [pathIssue(read.error, path, option)], read.error);
  return read.data;
}

type Bound = { path: string; limit: number; option: string };

async function regularBytes(handle: FileHandle, bound: Bound): Promise<Result<Buffer>> {
  const info = await handle.stat();
  if (info.isFile() === false) return rejected('file', [issue.notAFile(bound.path, bound.option)]);
  const bytes = await readAtMost(handle, bound.limit + 1);
  if (bytes.length > bound.limit)
    return rejected('file', [issue.tooLarge(bound.option, bound.limit)]);
  return done(bytes);
}

// The size a stat reports can change before the read, so the read itself stops at the limit.
async function readAtMost(handle: FileHandle, size: number) {
  const chunks: Buffer[] = [];
  let total = 0;
  while (total < size) {
    const chunk = Buffer.alloc(Math.min(CHUNK_BYTES, size - total));
    const { bytesRead } = await handle.read(chunk, 0, chunk.length, null);
    if (bytesRead === 0) break;
    chunks.push(chunk.subarray(0, bytesRead));
    total += bytesRead;
  }
  return Buffer.concat(chunks);
}

const CHUNK_BYTES = 65_536;

/**
 * @param stream - the piped input, such as stdin or the body of a download
 * @param limit - the most bytes the input may hold
 * @returns the bytes, cut one byte past the limit, so the caller refuses them without holding them whole
 */
export async function pipedBytes(stream: AsyncIterable<unknown>, limit: number) {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of stream) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(`${chunk}`);
    chunks.push(bytes);
    total += bytes.length;
    if (total > limit) break;
  }
  return Buffer.concat(chunks).subarray(0, limit + 1);
}

export const pipedText = async (stream: AsyncIterable<unknown>, limit: number) =>
  (await pipedBytes(stream, limit)).toString('utf8');

// The text a stored file holds; null when there is none yet.
export async function existingText(path: string): Promise<Result<string | null>> {
  const bytes = await readBounded(path, FILE_LIMITS.readBytes, 'home');
  if (bytes.error === null) return done(bytes.data.toString('utf8'));
  const isMissing = bytes.error.issues.every(found => found.code === issue.FILE_NOT_FOUND);
  return isMissing ? done(null) : bytes;
}

/**
 * @param folder - the data folder
 * @param photo - the path the master file or the profile names, relative to that folder
 * @returns the bytes of the photo
 */
export async function photoBytes(folder: string, photo: string): Promise<Result<Uint8Array>> {
  const path = resolve(folder, photo);
  const real = await $try(realpath(path));
  if (real.error !== null)
    return rejected('file', [pathIssue(real.error, path, 'person.photo')], real.error);
  if (leaves(await realpath(folder), real.data))
    return rejected('file', [issue.pathOutside('person.photo', photo, folder)]);
  return readBounded(real.data, FILE_LIMITS.photoBytes, 'person.photo');
}

// True for the folder itself too: the check is for a file in the folder, never for the folder.
export function leaves(folder: string, path: string) {
  const fromFolder = relative(folder, path);
  return fromFolder === '' || fromFolder.startsWith('..') || isAbsolute(fromFolder);
}

export type NewFile = { path: string; content: string | Uint8Array };

/**
 * Every file of one command is first written whole beside its place, and only then moved in, so
 * a refused write leaves none of them.
 *
 * @param files - the files of one command, in the order they are moved in
 * @param option - the cli option that named the files, or that names the data folder
 * @returns nothing; a refusal when the system refuses a write, with no temporary file left
 */
export async function writeAll(files: NewFile[], option: string): Promise<Result<undefined>> {
  for (const file of files) {
    const staged = await $try(stage(file));
    if (staged.error === null) continue;
    await removeTemporaries(files);
    return rejected('file', [pathIssue(staged.error, file.path, option)], staged.error);
  }
  for (const [index, file] of files.entries()) {
    const moved = await $try(rename(temporaryOf(file), file.path));
    if (moved.error === null) continue;
    await removeTemporaries(files);
    const state = writtenState(files.slice(0, index));
    return rejected('file', [pathIssue(moved.error, file.path, option)], moved.error, state);
  }
  return done(undefined);
}

const temporaryOf = (file: NewFile) => `${file.path}.${process.pid}.tmp`;

// 'wx' creates a new file or fails, so a link left at the temporary path is never followed;
// the rename then replaces a link at the path itself, never its target.
async function stage(file: NewFile) {
  await mkdir(dirname(file.path), { recursive: true });
  await rm(temporaryOf(file), { force: true });
  await writeFile(temporaryOf(file), file.content, { flag: 'wx' });
}

async function removeTemporaries(files: NewFile[]) {
  for (const file of files)
    await $try(rm(temporaryOf(file), { force: true }), { or: undefined, expected: anyError });
}

// A rename can fail after an earlier one went through; the answer then names what is written.
const writtenState = (written: NewFile[]) =>
  written.length === 0
    ? 'Nothing was written.'
    : `Written before the failure: ${written.map(file => shown(file.path)).join(', ')}.`;
