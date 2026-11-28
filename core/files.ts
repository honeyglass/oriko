/**
 * Every file oriko's own code reads, and the checks that keep a read within its limit.
 *
 * readBounded, pipedBytes, pipedText: a file or a pipe, never more than a limit.
 * pathIssue: any refusal of the system on a path, as an issue for the caller.
 * isMissing: whether an error says that a path does not exist.
 *
 * @example const bytes = await readBounded(path, FILE_LIMITS.readBytes, 'posting');
 */
import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import { $try } from '@honeyglass/utils/ts';
import { done, rejected } from './errors.ts';
import type { Issue, Result } from './errors.ts';
import * as issue from './issues.old.ts';

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
