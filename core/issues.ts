/**
 * The codes core raises on adx, and the turn of an issue of oriko's pure code into one of adx.
 *
 * Issues: what a helper answers in place of its value, at least one issue at a field of the call.
 * noCv, cvRequired, unknownCv, cvMismatch: what the data folder does not hold for a call.
 * pathRefused: a file the person names that the system refuses to open.
 * targetNotAFile, oversized: a link at the target of a write, and an input past the byte limit.
 * Stored, SHAPE, raised: the field that names a stored file, the shape of each, and an issue of
 * the check of a CV or of the page plan below it.
 * turnedEach: every issue of such a refusal, turned at a place the caller picks.
 * issueAt, unknownBlock: one such issue at a field an edit picks, and a block id no block has.
 *
 * A code of adx has one hint. Where oriko's hint named the field or the column, the message of
 * the issue already names it. The check and the page plan answer the issues of ./issues.data.ts,
 * with code, path, message and hint as data, since `layout` answers them so and an issue of adx
 * shows only its code and path; raised() turns each one.
 *
 * @example return raised(() => 'cv', placed.error);
 */
import { RefusalError } from '@honeyglass/utils/ts';
import { check, code } from '@honeyglass/adx';
import type { Code, Issue } from '@honeyglass/adx';
import { z } from 'zod';
import { Block, Master, Profile } from './cv.schema.ts';
import type { Issue as OldIssue, Rejection } from './errors.ts';
import { FILE_LIMITS } from './files.limits.ts';

export type Issues<F extends string> = [Issue<F>, ...Issue<F>[]];

// What the data folder does not hold.
export const noCv = code(
  'NO_CV',
  'fix',
  'Check --home, or create a CV with the command and the fields it needs',
);
export const cvRequired = code(
  'CV_REQUIRED',
  'fix',
  'Run the command, then pass --cv with one of the CV names it lists',
);
export const unknownCv = code(
  'UNKNOWN_CV',
  'fix',
  'Run the command and set the field cv of the profile to one of the CV names it lists',
);
export const cvMismatch = code(
  'CV_MISMATCH',
  'fix',
  'Leave out --cv, or change the field cv of the profile',
);

// A file the person names anywhere on the disk, which the system refuses to open; photo set and
// read both read one.
export const pathRefused = code(
  'PATH_REFUSED',
  'fix',
  'Check the path and that you may read and write there',
);

// What stands at the target of a write; adx owns NOT_A_FILE, so the name says what it is about.
export const targetNotAFile = code(
  'TARGET_NOT_A_FILE',
  'fix',
  'Remove the link that stands there, or name another target',
);

// The input of a command past the byte limit of a stored file; adx owns INPUT_TOO_LARGE.
const jsonTooLarge = code(
  'JSON_TOO_LARGE',
  'fix',
  `Send at most ${FILE_LIMITS.inputBytes} bytes; a CV is a few thousand`,
);

/**
 * adx reads the input and hands over its value, so the limit counts the value as compact JSON:
 * an input past it is past it in any form the call gave.
 *
 * @param input - the input of a command, past its schema
 * @returns JSON_TOO_LARGE, with no path, when the input is larger than a stored file may be
 */
export const oversized = (input: object) =>
  Buffer.byteLength(JSON.stringify(input)) > FILE_LIMITS.inputBytes
    ? [jsonTooLarge.issue(`The input holds more than ${FILE_LIMITS.inputBytes} bytes of JSON`)]
    : [];

// What the check of a CV and of its profile finds.
const duplicateId = code('DUPLICATE_ID', 'fix', 'Give every block its own id');
export const unknownBlock = code(
  'UNKNOWN_BLOCK',
  'fix',
  'Run the command and use one of the block ids it lists',
);
const untitledNotAlone = code(
  'UNTITLED_NOT_ALONE',
  'fix',
  'Give the block a title, or make it the only block of its section',
);
const itemNotInMaster = code(
  'ITEM_NOT_IN_MASTER',
  'fix',
  'Keep only items of the master, or add the item to the master first',
);
const levelRaised = code('LEVEL_RAISED', 'fix', 'Keep the level of the master, or a lower one');
const factChanged = code(
  'FACT_CHANGED',
  'fix',
  'Leave the field out of the profile, so the job keeps the value of the master',
);
const jobMoved = code(
  'JOB_MOVED',
  'fix',
  'Take the job out of order, and hide an old or unrelated job instead of moving it',
);

// What does not fit the pages.
const roleTooLong = code(
  'ROLE_TOO_LONG',
  'fix',
  'Shorten the role, in the master or with "person.role" in the profile',
);
const blockTooTall = code(
  'BLOCK_TOO_TALL',
  'fix',
  'Shorten the block, for example by removing items',
);
const pageOverflow = code(
  'PAGE_OVERFLOW',
  'fix',
  'Hide or shorten blocks of that column, remove a page pin, or raise "pages"',
);

const RAISED: Record<string, Code | undefined> = {
  DUPLICATE_ID: duplicateId,
  UNKNOWN_BLOCK: unknownBlock,
  UNTITLED_NOT_ALONE: untitledNotAlone,
  ITEM_NOT_IN_MASTER: itemNotInMaster,
  LEVEL_RAISED: levelRaised,
  FACT_CHANGED: factChanged,
  JOB_MOVED: jobMoved,
  ROLE_TOO_LONG: roleTooLong,
  BLOCK_TOO_TALL: blockTooTall,
  PAGE_OVERFLOW: pageOverflow,
};

/** The field of the call that names a stored file: `cv` for the CV, `profile` for the profile. */
export type Stored = 'cv' | 'profile';

/** The shape of each stored file, by the field that names it; the values the tool lists. */
export const SHAPE = { cv: Master, profile: Profile };

/**
 * The path of a stored file starts with the field of the call that names the file (adx decision
 * 69), so `blocks.nobody` of the profile is `profile.blocks.nobody`.
 *
 * @param fileOf - the file an issue lies in
 * @param refused - the refusal of the check or of the page plan
 * @returns its issues with the same codes, messages and paths, below the field of their file
 * @throws a bug refusal for a code this file lacks, or a refusal without an issue
 */
export function raised<F extends Stored>(
  fileOf: (found: OldIssue) => F,
  refused: Rejection,
): Issues<F> {
  return turnedEach(refused, found => turned(fileOf(found), found));
}

/**
 * Every issue of a refusal of the pure code, turned one by one, as the caller places it.
 *
 * @param refused - the refusal of the check or of the page plan
 * @param turn - the issue of adx for one issue of the refusal
 * @returns the turned issues, at least one
 * @throws a bug refusal for a refusal without an issue
 */
export function turnedEach<F extends string>(
  refused: Rejection,
  turn: (found: OldIssue) => Issue<F>,
): Issues<F> {
  const [first, ...rest] = refused.issues.map(turn);
  if (first === undefined) throw notTurned('a refusal of the check holds no issue');
  return [first, ...rest];
}

function turned<F extends Stored>(field: F, found: OldIssue): Issue<F> {
  const path: [F, ...string[]] = [field, ...(found.path === '' ? [] : found.path.split('.'))];
  return issueAt(path, found, shapeAt(path));
}

// A profile takes its patches as values of any shape, so an issue below `blocks.<id>` lies in a
// patch, which the check holds against the block's shape.
function shapeAt([field, first, id]: [Stored, ...string[]]) {
  return field === 'profile' && first === 'blocks' && id !== undefined ? Block : SHAPE[field];
}

/**
 * One issue of the pure code at a place the caller picks, such as a field of an edit.
 *
 * @param path - the field of the call, then the place below it
 * @param found - the issue of the check or of the page plan
 * @param as - the shape a SCHEMA issue names in its command, one the tool lists
 * @returns the issue with the same code and message at that path
 * @throws a bug refusal for a code this file lacks
 */
export function issueAt<F extends string>(
  path: [F, ...string[]],
  found: OldIssue,
  as: z.ZodType,
): Issue<F> {
  if (found.code === 'SCHEMA') return schemaIssue(path, found.message, as);
  const declared = RAISED[found.code];
  if (declared === undefined) throw notTurned(`the code ${found.code} has no code of adx`);
  return declared.at(path, found.message);
}

// adx owns SCHEMA, so only its check() raises it: with a part that always fails with the message.
// `as` names the shape the value lies in, so the command of the issue shows that shape.
function schemaIssue<F extends string>(
  path: [F, ...string[]],
  message: string,
  as: z.ZodType,
): Issue<F> {
  const { issues } = check(z.never(message), undefined, path, { as });
  const [issue] = issues ?? [];
  if (issue === undefined) throw notTurned('the check of adx passed a part that always fails');
  return issue;
}

const notTurned = (reason: string) =>
  new RefusalError({
    kind: 'bug',
    step: 'raised',
    reason,
    next: 'stop and tell the person; the maintainer of oriko fixes core/issues.ts',
    state: 'Nothing was written.',
  });
