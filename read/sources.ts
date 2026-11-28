/**
 * The sources of one `oriko read` as clean text: files anywhere on the disk, or https pages.
 *
 * documentsOf: every source of a call, read and turned into text, or every issue of every source.
 * Role, Document: the option that names a source, and one source with its kind and text.
 *
 * adx reads a file only inside a root and talks only to a server the tool declares, so this is
 * oriko's own code: a file through core/files.ts, with the byte limit and the refusal of what is
 * no regular file, and a download through ./web.ts with all its checks. Each refusal, an issue of
 * core/issues.data.ts or ./issues.data.ts, becomes a code of ./issues.ts at the option that names
 * the source, its message headed by the source.
 *
 * @example const read = await documentsOf({ posting: 'job.pdf', notes: [], resume: undefined });
 */
import { resolve } from 'node:path';
import { failed } from '@honeyglass/adx';
import type { Code } from '@honeyglass/adx';
import { shown } from '@honeyglass/utils/ts';
import type { Rejection } from '../core/errors.ts';
import { readBounded } from '../core/files.ts';
import { FILE_LIMITS } from '../core/files.limits.ts';
import { pathRefused } from '../core/issues.ts';
import type { Issues } from '../core/issues.ts';
import * as issue from './issues.ts';
import { textOf } from './text.ts';
import type { Kind } from './text.ts';
import { NODE_WEB, download } from './web.ts';

export type Role = 'posting' | 'notes' | 'resume';
type Source = { role: Role; source: string };
export type Document = Source & { kind: Kind; text: string; replaced: number };

/**
 * One answer names the issues of every source, so a call with several broken ones is fixed at once.
 *
 * @param sources - the posting, the notes and the old CV a call names
 * @returns every document, in the order of the options; else every issue of every source
 * @throws adx's SYSTEM_REFUSED, kind ask, for any other refusal of the system on a file
 */
export async function documentsOf(sources: {
  posting: string | undefined;
  notes: string[];
  resume: string | undefined;
}): Promise<{ documents: Document[] } | Issues<Role>> {
  const read = await Promise.all(sourcesOf(sources).map(documentOf));
  const [first, ...more] = read.flatMap(one => (Array.isArray(one) ? one : []));
  if (first !== undefined) return [first, ...more];
  return { documents: read.flatMap(one => (Array.isArray(one) ? [] : [one])) };
}

const sourcesOf = (sources: Parameters<typeof documentsOf>[0]): Source[] => [
  ...(sources.posting === undefined ? [] : [{ role: 'posting' as const, source: sources.posting }]),
  ...sources.notes.map(source => ({ role: 'notes' as const, source })),
  ...(sources.resume === undefined ? [] : [{ role: 'resume' as const, source: sources.resume }]),
];

// The kind of a document comes from its content, never from its name.
async function documentOf(input: Source): Promise<Document | Issues<Role>> {
  const bytes = await bytesOf(input);
  if (bytes.error !== null) return turned(bytes.error, input);
  const read = await textOf(bytes.data, input.role);
  if (read.error !== null) return turned(read.error, input);
  return { ...input, ...read.data };
}

// A source with a scheme is downloaded, anything else is a file; a relative path starts at the
// working directory of the process, since adx hands a handler none of the call.
const bytesOf = ({ role, source }: Source) =>
  /^[a-z][a-z0-9+.-]*:\/\//i.test(source)
    ? download(source, NODE_WEB, role)
    : readBounded(resolve(source), FILE_LIMITS.readBytes, role);

/** The code of read for each code that core/files.ts, ./web.ts and ./text.ts answer. */
const TURNED: Record<string, Code | undefined> = {
  FILE_NOT_FOUND: issue.sourceNotFound,
  NOT_A_FILE: issue.sourceNotAFile,
  INPUT_TOO_LARGE: issue.sourceTooLarge,
  PATH_REFUSED: pathRefused,
  UNSUPPORTED_KIND: issue.unsupportedKind,
  DOCUMENT_UNREADABLE: issue.unreadable,
  NO_TEXT: issue.noText,
  URL_NOT_ALLOWED: issue.addressNotAllowed,
  PRIVATE_ADDRESS: issue.privateAddress,
  TOO_MANY_REDIRECTS: issue.tooManyRedirects,
  ENCODING_NOT_ALLOWED: issue.encodingNotAllowed,
  HTTP_STATUS: issue.httpStatus,
  NETWORK_FAILED: issue.downloadFailed,
  SERVER_BUSY: issue.siteBusy,
};

// A system error only the person solves holds no issue, so it goes to adx whole, which sorts it;
// a code missing from the list goes the same way, and adx answers it as a bug.
function turned(refused: Rejection, { role, source }: Source): Issues<Role> {
  const [found] = refused.issues;
  const declared = TURNED[found?.code ?? ''];
  if (found === undefined || declared === undefined)
    throw failed('Nothing was written.', refused.cause);
  return [declared.at(role, `${shown(source)}: ${found.message}`)];
}
