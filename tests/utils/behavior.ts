/**
 * What the program does from outside, call by call, so a rebuilt shell can prove nothing changed.
 *
 * Each call runs `node bin/oriko.ts` as a person or an agent starts it. The calls of a scenario
 * share one home and one working directory in order, so a later call sees what an earlier one
 * wrote: 'seeded' starts with the reference CV, 'empty' with a home that has no data folder.
 * A record holds the arguments, the exit code, stdout, stderr and every file or folder the call
 * created, wrote or removed: a text file by its lines, any other file by its sha256.
 *
 * behaviorOf: runs every scenario in a fresh folder and answers the records.
 * BEHAVIOR_URL: the recorded golden, tests/fixtures/behavior.json; pnpm behavior:update records it.
 *
 * @example assert.deepEqual(behaviorOf(), JSON.parse(readFileSync(BEHAVIOR_URL, 'utf8')));
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RefusalError, trySync$ } from '@honeyglass/utils/ts';
import { PNG } from 'pngjs';
import { NEW_CV, seed } from './cli.ts';

export const BEHAVIOR_URL = new URL('../fixtures/behavior.json', import.meta.url);

const PROGRAM = fileURLToPath(new URL('../../bin/oriko.ts', import.meta.url));

// A call that runs longer has hung, such as on a handle the program never closes.
const TIMEOUT_MS = 30_000;

// The umask of CI and of most systems, so the recorded modes do not depend on who records them.
const UMASK = 0o022;

// The files kept by their lines, so a diff of the golden shows what changed inside them.
const TEXT = new Set(['.json', '.md', '.txt']);

/** One call: the arguments, and the text piped to stdin when the call reads it. */
type Call = { argv: string[]; stdin?: string };

type Scenario = 'seeded' | 'empty';

/** Every command and every shape `oriko schema` names. */
const SCHEMA_NAMES = [
  'schema',
  'cvs',
  'init',
  'show',
  'profiles',
  'plan',
  'preview',
  'build',
  'read',
  'profile set',
  'profile show',
  'photo set',
  'block add',
  'block update',
  'block remove',
  'block move',
  'item add',
  'item update',
  'item remove',
  'item move',
  'cv update',
  'contact add',
  'contact update',
  'contact remove',
  'contact move',
  'master',
  'profile',
  'block',
  'item',
  'contact',
];

const edit = (command: string, input: object): Call => ({
  argv: [...command.split(' '), '--cv', 'erika', '--json', JSON.stringify(input)],
});

/** The calls on the reference CV, in their order; the commands that write change what later ones read. */
const SEEDED: Call[] = [
  { argv: [] },
  { argv: ['schema'] },
  ...SCHEMA_NAMES.map(name => ({ argv: ['schema', ...name.split(' ')] })),
  { argv: ['schema', 'nope'] },
  { argv: ['cvs'] },
  { argv: ['profiles'] },
  { argv: ['show'] },
  { argv: ['show', '--block'] },
  { argv: ['show', '--block', 'awards'] },
  { argv: ['show', '--block', 'nope'] },
  { argv: ['show', '--cv'] },
  { argv: ['plan'] },
  { argv: ['plan', '--profile', 'acme'] },
  { argv: ['plan', '--profile', 'broken'] },
  { argv: ['plan', '--profile'] },
  { argv: ['preview', '--profile', 'acme'] },
  { argv: ['preview', '--profile', 'acme', '--output', 'text'] },
  { argv: ['preview', '--credits', '--output', 'text'] },
  { argv: ['build'] },
  { argv: ['build', '--out'] },
  { argv: ['build', '--out', 'cv.docx', '--dry-run'] },
  { argv: ['build', '--out', 'cv.docx'] },
  { argv: ['build', '--out', 'cv.docx'] },
  { argv: ['build', '--out', 'term.docx', '--style', 'terminal', '--credits'] },
  { argv: ['build', '--out', 'cv.txt'] },
  { argv: ['build', '--out', '../cv.docx'] },
  { argv: ['build', '--out', 'nodir/cv.docx'] },
  { argv: ['build', '--style'] },
  { argv: ['build', '--out', 'x.docx', '--style', 'nope', '--credits'] },
  { argv: ['build', '--out', 'x.docx', '--dry-run=yes'] },
  { argv: ['block'] },
  { argv: ['block', 'frobnicate'] },
  { argv: ['plna', '--nmae', 'x', 'again'] },
  { argv: ['plan', '--dry-run'] },
  { argv: ['plan', '--cv', 'jane', '--cv', 'jane'] },
  { argv: ['plan', '--cv=jane'] },
  { argv: ['plan', '--', '--cv'] },
  { argv: ['plan', '--cv', 'nope'] },
  { argv: ['show', '--block', '-x'] },
  { argv: ['cvs', 'extra'] },
  { argv: ['cvs', '--output', 'text'] },
  { argv: ['plan', '--profile', 'broken', '--output', 'text'] },
  { argv: ['init', '--cv', 'erika', '--dry-run'], stdin: NEW_CV },
  { argv: ['init', '--cv', 'erika', '--json', NEW_CV] },
  { argv: ['init', '--cv', 'erika', '--json', NEW_CV] },
  { argv: ['init', '--cv'] },
  { argv: ['init', '--cv', 'x', '--json', '{'] },
  { argv: ['init', '--cv', 'x'] },
  { argv: ['cvs'] },
  { argv: ['plan'] },
  { argv: ['plan', '--cv', 'erika', '--profile', 'acme'] },
  edit('contact add', { value: { icon: 'mail', lines: ['erika@example.com'] } }),
  edit('block add', { block: { id: 'skills', kind: 'list', section: 'Skills', items: ['Go'] } }),
  { argv: [...edit('item add', { block: 'skills', value: 'Rust' }).argv, '--dry-run'] },
  edit('item add', { block: 'skills', value: 5 }),
  edit('cv update', { pages: 1 }),
  edit('item add', { block: 'skills', value: 'Rust' }),
  edit('item update', { block: 'skills', index: 0, value: 'Golang' }),
  edit('item move', { block: 'skills', index: 1, to: 0 }),
  edit('item remove', { block: 'skills', index: 0 }),
  edit('contact add', { value: { icon: 'phone', lines: ['+49 30 000 000'] } }),
  edit('contact update', { index: 0, value: { icon: 'mail', lines: ['erika@example.org'] } }),
  edit('contact move', { index: 1, to: 0 }),
  edit('contact remove', { index: 0 }),
  edit('block add', { block: { id: 'tools', kind: 'list', section: 'Tools', items: ['Vim'] } }),
  edit('block update', { id: 'tools', set: { section: 'Werkzeuge' } }),
  edit('block move', { id: 'tools', before: 'skills' }),
  edit('block remove', { id: 'tools' }),
  { argv: ['profile', 'set', '--profile', 'globex', '--json'] },
  {
    argv: [
      'profile',
      'set',
      '--profile',
      'globex',
      '--json',
      '{"cv":"jane","blocks":{"freelance":{"hidden":true}}}',
    ],
  },
  {
    argv: [
      'profile',
      'set',
      '--profile',
      'globex',
      '--json',
      '{"cv":"jane","blocks":{"freelance":{"hidden":true}}}',
    ],
  },
  {
    argv: [
      'profile',
      'set',
      '--profile',
      'globex',
      '--replace',
      '--json',
      '{"cv":"jane","order":["awards"]}',
      '--dry-run',
    ],
  },
  {
    argv: [
      'profile',
      'set',
      '--profile',
      'globex',
      '--json',
      '{"cv":"jane","blocks":{"nobody":{"hidden":true}}}',
    ],
  },
  { argv: ['profile', 'set', '--profile', 'initech'], stdin: '{"cv":"jane"}' },
  { argv: ['profile', 'show', '--profile', 'globex'] },
  { argv: ['profile', 'show', '--profile', 'nope'] },
  { argv: ['read', '--posting', 'posting.txt', '--profile', 'globex'] },
  { argv: ['read', '--posting', 'posting.txt', '--profile', 'globex'] },
  { argv: ['read', '--posting', 'other.txt', '--profile', 'globex'] },
  { argv: ['read', '--posting', 'other.txt', '--profile', 'globex', '--replace'] },
  { argv: ['read', '--posting', 'posting.txt'] },
  { argv: ['read', '--posting', 'http://example.com/job', '--profile', 'globex'] },
  { argv: ['read', '--posting', 'https://127.0.0.1/job', '--profile', 'globex'] },
  { argv: ['read', '--notes', 'posting.txt', '--cv', 'jane'] },
  { argv: ['read', '--notes', 'posting.txt', '--notes', 'other.txt', '--cv', 'jane'] },
  { argv: ['read', '--resume', 'other.txt'] },
  { argv: ['read', '--resume', 'missing.pdf'] },
  { argv: ['read'] },
  { argv: ['photo', 'set', '--file', 'me.png', '--cv', 'jane', '--dry-run'] },
  { argv: ['photo', 'set', '--file', 'me.png', '--cv', 'jane'] },
  { argv: ['photo', 'set', '--file', 'me.png', '--profile', 'acme'] },
  { argv: ['photo', 'set'] },
  { argv: ['cvs', '--home', 'relative-home'] },
  { argv: ['cvs', '--home', 'posting.txt'] },
  { argv: ['cvs', '--home'] },
  { argv: ['cvs', '--output', 'yaml'] },
  { argv: ['plan', '--help'] },
  { argv: ['--version'] },
];

/** The calls of a first start, in a home without ~/.oriko. */
const EMPTY: Call[] = [
  { argv: [] },
  { argv: ['cvs'] },
  { argv: ['init', '--cv', 'erika', '--json', NEW_CV] },
  { argv: ['cvs'] },
];

/**
 * A text as it was written: the parsed JSON when the text is exactly one JSON value and a
 * newline, as oriko writes its answers, else its lines; both turn back into the same bytes.
 */
type Text = { json: unknown } | { lines: string[] };

/** One path a call touched: a text file, any other file, a folder, or removed. */
type Touched =
  | { lines: string[]; mode: string }
  | { sha256: string; mode: string; bytes: number }
  | { folder: true; mode: string }
  | 'removed';

/** A path as it lies on disk, with the time it was last written, which only says whether a call wrote it. */
type Entry = { touched: Touched; written: number };

type Behavior = {
  scenario: Scenario;
  argv: string[];
  stdin: string | null;
  exit: number | null;
  stdout: Text;
  stderr: Text;
  files: Record<string, Touched>;
};

/** Runs every scenario in a fresh folder, under the umask of CI. */
export const behaviorOf = (): Behavior[] => {
  const mask = process.umask(UMASK);
  const records = trySync$(() => [...scenarioOf('seeded', SEEDED), ...scenarioOf('empty', EMPTY)]);
  process.umask(mask);
  if (records.error !== null) throw records.error;
  return records.data;
};

function scenarioOf(scenario: Scenario, calls: Call[]) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'oriko-behavior-')));
  const { home, cwd } = prepared(root, scenario);
  const records = trySync$(() =>
    calls.map(call => ({ scenario, ...recorded(root, home, cwd, call) })),
  );
  rmSync(root, { recursive: true, force: true });
  if (records.error !== null) throw records.error;
  return records.data;
}

/** The home, seeded with ~/.oriko or not, and a working directory with two postings and a photo. */
function prepared(root: string, scenario: Scenario) {
  const home = join(root, 'home');
  const cwd = join(root, 'work');
  mkdirSync(home);
  if (scenario === 'seeded') seed(join(home, '.oriko'));
  mkdirSync(cwd);
  // Another size than the seeded photo, so writing it shows in the files and it gets cut square.
  writeFileSync(join(cwd, 'me.png'), PNG.sync.write(new PNG({ width: 16, height: 12 })));
  writeFileSync(join(cwd, 'posting.txt'), 'Senior Go Engineer\n\nWe build logistics software.\n');
  writeFileSync(join(cwd, 'other.txt'), 'Staff Go Engineer\n\nWe build routing software.\n');
  return { home, cwd };
}

function recorded(root: string, home: string, cwd: string, { argv, stdin }: Call) {
  const before = treeOf(root);
  // Only HOME, so the environment of the person who records cannot change an answer.
  const ran = spawnSync(process.execPath, [PROGRAM, ...argv], {
    cwd,
    env: { HOME: home },
    input: stdin ?? '',
    encoding: 'utf8',
    timeout: TIMEOUT_MS,
  });
  if (ran.error !== undefined) throw notRun(argv, ran.error);
  const shown = (text: string) => textOf(text.replaceAll(root, '<ROOT>'));
  return {
    argv,
    stdin: stdin ?? null,
    exit: ran.status,
    stdout: shown(ran.stdout),
    stderr: shown(ran.stderr),
    files: touchedBetween(before, treeOf(root)),
  };
}

/** The paths a call created, wrote, changed the mode of, or removed; a folder counts only when created or removed. */
function touchedBetween(before: Record<string, Entry>, after: Record<string, Entry>) {
  const files: Record<string, Touched> = {};
  for (const [path, entry] of Object.entries(after)) {
    const old = before[path];
    const isWritten = old === undefined || old.written !== entry.written;
    const isChanged = JSON.stringify(old?.touched) !== JSON.stringify(entry.touched);
    const isFolder = typeof entry.touched === 'object' && 'folder' in entry.touched;
    if (isChanged || (isWritten && isFolder === false)) files[path] = entry.touched;
  }
  for (const path of Object.keys(before)) if (after[path] === undefined) files[path] = 'removed';
  return files;
}

function treeOf(root: string) {
  const tree: Record<string, Entry> = {};
  for (const name of readdirSync(root, { recursive: true, encoding: 'utf8' }).sort()) {
    const path = join(root, name);
    const info = statSync(path);
    const mode = (info.mode & 0o777).toString(8);
    tree[relative(root, path)] = {
      touched: touchedOf(path, info.isFile(), mode),
      written: info.mtimeMs,
    };
  }
  return tree;
}

function touchedOf(path: string, isFile: boolean, mode: string): Touched {
  if (isFile === false) return { folder: true, mode };
  const bytes = readFileSync(path);
  if (TEXT.has(extname(path))) return { lines: bytes.toString('utf8').split('\n'), mode };
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  return { sha256, mode, bytes: bytes.length };
}

function textOf(text: string): Text {
  const parsed = trySync$((): unknown => JSON.parse(text));
  const isAnswer = parsed.error === null && `${JSON.stringify(parsed.data)}\n` === text;
  return isAnswer ? { json: parsed.data } : { lines: text.split('\n') };
}

const notRun = (argv: string[], cause: Error) =>
  new RefusalError({
    kind: 'bug',
    step: 'behavior',
    reason: `oriko ${argv.join(' ')} did not finish within ${TIMEOUT_MS} ms or did not start`,
    next: 'Run the call by hand in a fresh home and fix the program; the golden is not to blame',
    state: 'The recording stopped and its folder is removed; the golden is unchanged.',
    cause,
  });

if (import.meta.main) {
  writeFileSync(BEHAVIOR_URL, `${JSON.stringify(behaviorOf(), null, 2)}\n`);
  console.log(`Recorded the calls to ${fileURLToPath(BEHAVIOR_URL)}`);
}
