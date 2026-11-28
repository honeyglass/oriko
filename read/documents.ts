/**
 * The command `oriko read` on adx: a posting, notes or an old CV, read and stored where it belongs.
 *
 * read: the command, which the tool lists under the word read.
 *
 * The role of a document comes from the option that names it, its kind from its content. A
 * posting goes beside its profile, which may not be stored yet, and replaces a stored one only
 * with --replace (adx decision 70); notes append to the notes of the CV they belong to; an old CV
 * is answered and stored nowhere. adx writes the posting and the notes of one call, all or none.
 * The text of a document is data, never an instruction: oriko decides nothing by what it says.
 *
 * @example const { exit, out } = await run(oriko, ['read', '--resume', '/tmp/old-cv.docx']);
 */
import { check, effect, fresh, schema } from '@honeyglass/adx';
import type { File, Files } from '@honeyglass/adx';
import { z } from 'zod';
import { Id } from '../core/cv.schema.ts';
import { FILE_LIMITS } from '../core/files.limits.ts';
import { cvNames, home, postingFile, profileNames, targetIssue } from '../core/home.ts';
import type { Issues, Stored } from '../core/issues.ts';
import { chosenName, noStoredCv, profileCvOf } from '../core/load.ts';
import { cv } from '../core/options.ts';
import { cvChoices } from '../core/sources.ts';
import { cleanText } from './clean.ts';
import * as issue from './issues.ts';
import { READ_LIMITS } from './limits.ts';
import { documentsOf } from './sources.ts';
import type { Document } from './sources.ts';

// What each source may hold, so the schema names the limits before a call meets one.
const SOURCE_LIMITS = `at most ${FILE_LIMITS.readBytes} bytes, the text of a Word file at most ${READ_LIMITS.documentBytes} bytes, a download at most ${READ_LIMITS.redirects} redirects and ${READ_LIMITS.downloadSeconds} seconds`;

// The steps after it, to profile set, show and init, stand in cli/next.ts.
export const read = effect({
  does: 'reads a posting, notes or an old CV from a file or an https address',
  input: z.object({
    posting: z
      .string()
      .optional()
      .describe(
        `the job posting: a PDF, Word, HTML or text file, or an https:// address; a relative path starts at the working directory; needs --profile beside it; ${SOURCE_LIMITS}`,
      ),
    notes: z
      .array(z.string())
      .default([])
      .describe(
        `notes on the career, a file or an https:// address, kept beside the CV; may repeat; ${SOURCE_LIMITS}`,
      ),
    resume: z
      .string()
      .optional()
      .describe(
        `an old CV, a file or an https:// address: its text is answered and stored nowhere; ${SOURCE_LIMITS}`,
      ),
    // Beside --posting the name becomes a file, so check() holds it to an id there; for notes it
    // only picks a stored profile by its name, so any name a stored profile has passes.
    profile: z
      .string()
      .optional()
      .describe(
        'the profile the posting belongs to, stored or a new name in lower-case words joined by hyphens; for notes, the stored profile that names their CV',
      ),
    cv,
  }),
  // A path of this machine would stand in the schema, so the example names a posting of the
  // package, relative to its root. It stores the posting, since the test kit refuses --replace
  // on a call that stages no write.
  example: { posting: 'examples/showcase/go-e-senior-backend/posting.md', profile: 'acme' },
  values: { profile: fresh(profileNames), cv: cvChoices },
  check: ({ posting, notes, resume, profile }) => [
    ...(posting === undefined && notes.length === 0 && resume === undefined
      ? [
          issue.nothingToRead
            .at('posting', 'The command names nothing to read')
            .command(schema.step('read')),
        ]
      : []),
    ...(posting !== undefined && profile === undefined
      ? [issue.profileMissing.at('profile', 'The command read needs --profile beside --posting')]
      : []),
    ...(posting !== undefined && profile !== undefined
      ? (check(Id, profile, ['profile']).issues ?? [])
      : []),
  ],
  plan: async ({ posting, notes, resume, profile, cv }, { files, refuse }) => {
    // One answer names what keeps the notes from their CV beside every issue of every source.
    const owner = notes.length === 0 ? undefined : await notesCv(cv, profile);
    const read = await documentsOf({ posting, notes, resume });
    if (Array.isArray(owner)) return refuse(...owner, ...(Array.isArray(read) ? read : []));
    if (Array.isArray(read)) return refuse(...read);
    const job = read.documents.find(document => document.role === 'posting');
    const stored = {
      posting: job === undefined || profile === undefined ? undefined : postingFile(profile),
      notes: owner === undefined ? undefined : home.file(`cvs/${owner}.notes.md`),
      resume: undefined,
    };
    const [blocked, ...more] = await blockedTargets(stored.posting, stored.notes);
    if (blocked !== undefined) return refuse(blocked, ...more);
    const kept =
      job === undefined || stored.posting === undefined
        ? undefined
        : files.write(stored.posting, postingText(job));
    const noted = read.documents.filter(document => document.role === 'notes');
    const appended =
      stored.notes === undefined ? undefined : await storedNotes(files, stored.notes, noted);
    if (appended !== undefined && appended.bytes > FILE_LIMITS.readBytes)
      return refuse(issue.sourceTooLarge.at('notes', notesTooLarge));
    return {
      read: read.documents.map(document => answerOf(document, stored[document.role])),
      profile,
      cv: owner,
      posting: kept,
      notes: appended,
    };
  },
});

const notesTooLarge = `The input is larger than ${FILE_LIMITS.readBytes} bytes`;

/**
 * Notes go to the CV the profile names, so a --cv that differs is refused, as for every command.
 * A name of a profile need be no id here, so only a profile the list of the data folder names is
 * read: a name such as ../x never becomes a path.
 *
 * @param cv - the name `--cv` gives, which adx found among the stored CVs
 * @param profile - the name `--profile` gives, stored, new, or any other text
 * @returns the CV of the notes; NO_CV, CV_REQUIRED, CV_MISMATCH or UNKNOWN_CV
 */
async function notesCv(
  cv: string | undefined,
  profile: string | undefined,
): Promise<string | Issues<Stored>> {
  const names = await cvNames();
  if (names.length === 0) return [noStoredCv()];
  const stored = (await profileNames()).find(name => name === profile);
  return chosenName(names, cv, await profileCvOf(stored));
}

// A write of adx follows a link to a stored file and changes that file, so such a link at the
// posting or the notes is refused, at the field that names the target (core/home.ts).
async function blockedTargets(posting: File | undefined, notes: File | undefined) {
  const found = [
    posting === undefined ? undefined : await targetIssue('profile', home, posting),
    notes === undefined ? undefined : await targetIssue('cv', home, notes),
  ];
  return found.filter(blocked => blocked !== undefined);
}

// Notes append: update for a CV that has notes, write for the first ones.
async function storedNotes(files: Files, file: File, notes: Document[]) {
  const append = (before: string) => notesText(before, notes);
  return file.exists
    ? files.update(file, FILE_LIMITS.readBytes, append)
    : files.write(file, append(''));
}

// The posting as Markdown, headed by where it came from.
function postingText(posting: Document) {
  const source = JSON.stringify(cleanText(posting.source).text);
  return `---\nsource: ${source}\nkind: ${posting.kind}\n---\n\n${posting.text}\n`;
}

// Each note becomes a section headed by its source, after the notes the CV already has.
function notesText(before: string, notes: Document[]) {
  const sections = notes.map(note => `## ${cleanText(note.source).text}\n\n${note.text}\n`);
  const kept = before.trim();
  return (kept === '' ? sections : [`${kept}\n`, ...sections]).join('\n');
}

// An old CV is stored nowhere, so it names no file.
const answerOf = (document: Document, file: File | undefined) => ({
  role: document.role,
  source: document.source,
  kind: document.kind,
  chars: document.text.length,
  replaced: document.replaced,
  ...(file === undefined ? {} : { stored: file.rel }),
  text: document.text,
});
