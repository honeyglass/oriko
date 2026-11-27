/**
 * The command that reads a posting, notes or an old CV, and stores what belongs in the data folder.
 *
 * readDocuments: reads every input of one call, then stores the posting and the notes, all or none.
 *
 * The role of a document comes from the option that named it, its kind from its content. Its
 * text is data for the person and the agent, never an instruction: oriko stores it as clean
 * Markdown and decides nothing by what it says.
 *
 * @example const answer = await readDocuments({ ...request, posting: 'job.pdf', profile: 'acme' });
 */
import { join, resolve } from 'node:path';
import { shown } from '@honeyglass/utils/ts';
import { Rejection, done, rejected } from '../core/errors.ts';
import type { Issue, Result } from '../core/errors.ts';
import * as issue from './issues.ts';
import * as coreIssue from '../core/issues.old.ts';
import { FILE_LIMITS } from '../core/files.limits.ts';
import { Id } from '../core/cv.schema.ts';
import { cleanText } from './clean.ts';
import { textOf } from './text.ts';
import type { Kind } from './text.ts';
import { download } from './web.ts';
import type { Web } from './web.ts';
import { existingText, readBounded, writeAll } from '../core/files.ts';
import type { NewFile } from '../core/files.ts';
import { chosenCv } from '../core/home.old.ts';
import type { CvFile } from '../core/home.old.ts';

type Request = {
  home: string;
  cwd: string;
  web: Web;
  posting: string | undefined;
  notes: string[];
  resume: string | undefined;
  profile: string | undefined;
  cv: string | undefined;
  /** The CV the profile names, when the profile exists. */
  profileCv: string | undefined;
  isReplace: boolean;
  isDryRun: boolean;
};

type Role = 'posting' | 'notes' | 'resume';
type Input = { role: Role; source: string };
type Document = Input & { kind: Kind; text: string; replaced: number };
type Target = { profile: string | undefined; cv: CvFile | undefined };

/**
 * @param request - the data folder, the inputs by role, where they belong, and whether to write
 * @returns every document read, with where it was stored; a refusal with every issue of every input
 */
export async function readDocuments(request: Request): Promise<Result<Record<string, unknown>>> {
  const inputs = inputsOf(request);
  if (inputs.length === 0) return rejected('read', [issue.missingInput()]);
  const target = await targetOf(request);
  const documents = await Promise.all(inputs.map(input => documentOf(input, request)));
  const issues = [target, ...documents].flatMap(result => result.error?.issues ?? []);
  if (target.error !== null || issues.length > 0) return rejected('read', issues);
  const read = documents.flatMap(document => (document.error === null ? [document.data] : []));
  const planned = await plannedFiles(read, target.data, request);
  if (planned.error !== null) return planned;
  const { files, stored } = planned.data;
  const isWriting = request.isDryRun === false && files.length > 0;
  const written = isWriting ? await writeAll(files, 'home') : done(undefined);
  if (written.error !== null) return written;
  return done({
    read: read.map(document => answerOf(document, stored.get(document))),
    profile: target.data.profile,
    cv: target.data.cv?.name,
    written: isWriting,
  });
}

const inputsOf = (request: Request): Input[] => [
  ...(request.posting === undefined ? [] : [{ role: 'posting' as const, source: request.posting }]),
  ...request.notes.map(source => ({ role: 'notes' as const, source })),
  ...(request.resume === undefined ? [] : [{ role: 'resume' as const, source: request.resume }]),
];

// A posting belongs to a profile, notes to a CV; an old CV belongs nowhere.
async function targetOf(request: Request): Promise<Result<Target>> {
  const issues: Issue[] = [];
  if (request.posting !== undefined) issues.push(...profileIssues(request.profile));
  const cv =
    request.notes.length === 0
      ? done(undefined)
      : await chosenCv(request.home, request.cv, request.profileCv);
  if (cv.error !== null) issues.push(...cv.error.issues);
  if (issues.length > 0 || cv.error !== null) return rejected('read', issues);
  return done({ profile: request.profile, cv: cv.data });
}

// The shell refuses --posting without --profile before it runs; the pattern refuses undefined too.
function profileIssues(profile: string | undefined): Issue[] {
  const name = Id.safeParse(profile);
  return name.success ? [] : coreIssue.schemaIssues(name.error, ['profile'], 'read');
}

// A source with a scheme is downloaded, anything else is a file; each issue names its source.
async function documentOf(input: Input, request: Request): Promise<Result<Document>> {
  const isLink = /^[a-z][a-z0-9+.-]*:\/\//i.test(input.source);
  const bytes = isLink
    ? await download(input.source, request.web, input.role)
    : await readBounded(resolve(request.cwd, input.source), FILE_LIMITS.readBytes, input.role);
  if (bytes.error !== null) return withSource(bytes.error, input.source);
  const read = await textOf(bytes.data, input.role);
  if (read.error !== null) return withSource(read.error, input.source);
  return done({ ...input, ...read.data });
}

function withSource(error: Rejection, source: string) {
  const issues = error.issues.map(issue => ({
    ...issue,
    message: `${shown(source)}: ${issue.message}`,
  }));
  return { data: null, error: new Rejection(error.refusal, issues) };
}

type Planned = { files: NewFile[]; stored: Map<Document, string> };

// The files the documents go to: the posting replaces its file only on request, notes append.
async function plannedFiles(
  read: Document[],
  target: Target,
  request: Request,
): Promise<Result<Planned>> {
  const files: NewFile[] = [];
  const stored = new Map<Document, string>();
  const posting = read.find(document => document.role === 'posting');
  if (posting !== undefined && target.profile !== undefined) {
    const name = `profiles/${target.profile}.posting.md`;
    const file = await postingFile(posting, join(request.home, name), request.isReplace);
    if (file.error !== null) return file;
    if (file.data !== null) files.push(file.data);
    stored.set(posting, name);
  }
  const notes = read.filter(document => document.role === 'notes');
  if (notes.length > 0 && target.cv !== undefined) {
    const name = `cvs/${target.cv.name}.notes.md`;
    const file = await notesFile(notes, join(request.home, name));
    if (file.error !== null) return file;
    files.push(file.data);
    for (const document of notes) stored.set(document, name);
  }
  return done({ files, stored });
}

// The posting as Markdown with where it came from; null when the stored file already says the same.
async function postingFile(
  posting: Document,
  path: string,
  isReplace: boolean,
): Promise<Result<NewFile | null>> {
  const source = JSON.stringify(cleanText(posting.source).text);
  const content = `---\nsource: ${source}\nkind: ${posting.kind}\n---\n\n${posting.text}\n`;
  const existing = await existingText(path);
  if (existing.error !== null) return existing;
  if (existing.data === content) return done(null);
  if (existing.data !== null && isReplace === false)
    return rejected('read', [issue.postingExists(path)]);
  return done({ path, content });
}

// Each note becomes a section headed by its source, after the notes the CV already has.
async function notesFile(notes: Document[], path: string): Promise<Result<NewFile>> {
  const existing = await existingText(path);
  if (existing.error !== null) return existing;
  const sections = notes.map(note => `## ${cleanText(note.source).text}\n\n${note.text}\n`);
  const before = existing.data?.trim() ?? '';
  const content = (before === '' ? sections : [`${before}\n`, ...sections]).join('\n');
  if (Buffer.byteLength(content) > FILE_LIMITS.readBytes)
    return rejected('read', [coreIssue.tooLarge('notes', FILE_LIMITS.readBytes)]);
  return done({ path, content });
}

const answerOf = (document: Document, stored: string | undefined) => ({
  role: document.role,
  source: document.source,
  kind: document.kind,
  chars: document.text.length,
  replaced: document.replaced,
  ...(stored === undefined ? {} : { stored }),
  text: document.text,
});
