import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { run as runOnAdx } from '@honeyglass/adx/test';
import { z } from 'zod';
import { oriko } from '../../cli/oriko.ts';
import { run } from '../../cli/run.ts';
import { NEW_CV, call, workspace } from '../utils/cli.ts';
import type { Space } from '../utils/cli.ts';
import { docx, pdf } from '../utils/documents.ts';
import { libreOffice, sofficePaths } from '../../pdf/convert.ts';
import { fakeSoffice } from '../utils/soffice.ts';
import { fakeWeb } from '../utils/web.ts';
import { FIXTURE_URL, photo } from '../utils/fixture.ts';

const tall = (cwd: string) => {
  const path = join(cwd, 'tall.png');
  writeFileSync(path, PNG.sync.write(new PNG({ width: 10, height: 30 })));
  return path;
};

const Planned = z.object({ pages: z.array(z.unknown()) });

test('plan answers the pages of the only CV, and of a profile by its name', async () => {
  const space = workspace();
  const { exit, answer } = await call(space, ['plan']);
  assert.deepEqual([exit, answer.ok, Planned.parse(answer.result).pages.length], [0, true, 2]);
  const profiled = await call(space, ['plan', '--profile', 'acme']);
  assert.equal(JSON.stringify(profiled.answer.result).includes('freelance'), false);
});

test('cvs lists every CV with its language and whether it fits', async () => {
  const { answer } = await call(workspace(), ['cvs']);
  assert.deepEqual(answer.cvs, [
    { name: 'jane', language: 'en', person: 'Jane Doe', fits: true, pages: 2 },
  ]);
});

test('profiles lists every profile with its CV and whether it can be built', async () => {
  const { answer } = await call(workspace(), ['profiles']);
  assert.deepEqual(answer.profiles, [
    { name: 'acme', cv: 'jane', fits: true, pages: 2 },
    { name: 'broken', cv: 'jane', fits: false, issues: ['UNKNOWN_BLOCK'] },
  ]);
});

test('init creates a new CV that builds, and the edit commands fill it', async () => {
  const space = workspace();
  assert.equal(
    (await call(space, ['init', '--cv', 'erika', '--json', NEW_CV, '--dry-run'])).exit,
    0,
  );
  assert.equal(existsSync(join(space.home, 'cvs', 'erika.json')), false);
  assert.equal((await call(space, ['init', '--cv', 'erika'], NEW_CV)).exit, 0);
  const contact = JSON.stringify({ value: { icon: 'mail', lines: ['erika@example.com'] } });
  assert.equal((await call(space, ['contact', 'add', '--cv', 'erika', '--json', contact])).exit, 0);
  const job = {
    id: 'acme',
    kind: 'job',
    section: 'Berufserfahrung',
    from: '01/2020',
    to: 'heute',
    title: 'Entwicklerin',
    place: 'Köln',
    employer: 'Acme GmbH',
    bullets: [],
  };
  assert.equal(
    (await call(space, ['block', 'add', '--cv', 'erika', '--json', JSON.stringify({ block: job })]))
      .exit,
    0,
  );
  const { answer } = await call(space, ['cvs']);
  assert.deepEqual(Array.isArray(answer.cvs) && answer.cvs.map(cv => cv.name), ['erika', 'jane']);
  assert.equal((await call(space, ['build', '--cv', 'erika', '--out', 'erika.docx'])).exit, 0);
});

test('a CV is chosen by --cv, by the profile, or as the only one', async () => {
  const space = workspace();
  await call(space, ['init', '--cv', 'erika', '--json', NEW_CV]);
  assert.deepEqual((await call(space, ['plan'])).codes, ['CV_REQUIRED']);
  assert.equal((await call(space, ['plan', '--cv', 'erika'])).exit, 0);
  assert.equal((await call(space, ['plan', '--profile', 'acme'])).exit, 0);
  assert.deepEqual((await call(space, ['plan', '--profile', 'acme', '--cv', 'erika'])).codes, [
    'CV_MISMATCH',
  ]);
  assert.deepEqual((await call(space, ['plan', '--cv', 'nobody'])).codes, ['NOT_IN_LIST']);
});

// A command on adx answers its fields in result; the old shell answers them beside ok.
test('the program sends a moved command to adx and every other one to the old shell', () => {
  const { home, cwd } = workspace();
  const picture = tall(cwd);
  const program = fileURLToPath(new URL('../../bin/oriko.ts', import.meta.url));
  const answer = (...argv: string[]) => {
    const ran = spawnSync(process.execPath, [program, ...argv], { encoding: 'utf8', input: '' });
    return z.looseObject({ ok: z.boolean() }).parse(JSON.parse(ran.stdout));
  };
  const code = (...argv: string[]) =>
    z.array(z.object({ code: z.string() })).parse(answer(...argv).issues)[0]?.code;
  assert.equal('result' in answer('plan', '--home', home), true);
  assert.equal('cvs' in answer('cvs', '--home', home), true);
  assert.equal(code('--home', home, 'plan'), 'OPTION_BEFORE_COMMAND');
  // A command of a group moves alone; the group itself still lists its actions on the old shell.
  const photo = ['--file', picture, '--profile', 'acme', '--dry-run'];
  assert.equal('result' in answer('photo', 'set', '--home', home, ...photo), true);
  assert.deepEqual(answer('photo', '--home', home).values, ['photo set']);
  assert.equal(code('--home', home, 'photo', 'set', ...photo), 'OPTION_BEFORE_COMMAND');
});

// The old shell keeps no case for a command on adx, so a call that reaches it there is a bug.
test('the old shell answers a command that runs on adx as a bug', async () => {
  const { home, cwd } = workspace();
  let out = '';
  const exit = await run(['block', 'remove', '--json', '{"id":"awards"}'], {
    home,
    cwd,
    web: fakeWeb({}, {}).web,
    isTTY: false,
    stdin: async () => null,
    write: text => (out += text),
  });
  const { kind } = z.object({ kind: z.string() }).parse(JSON.parse(out));
  assert.deepEqual([exit, kind], [2, 'bug']);
});

// A missing default folder holds no CV; ORIKO_HOME moves the folder as --home does.
test('plan finds the data folder by --home, by ORIKO_HOME, or holds no CV in a missing one', async () => {
  const space = workspace();
  const missing = JSON.parse((await runOnAdx(oriko, ['plan'])).out);
  assert.deepEqual(missing.issues, [
    {
      code: 'NO_CV',
      message: 'The data folder holds no CV',
      hint: 'Check --home, or run the command for the input of a new CV',
    },
  ]);
  const moved = await runOnAdx(oriko, ['plan'], { env: { ORIKO_HOME: space.home } });
  assert.equal(moved.exit, 0);
});

// An issue inside a stored file stands below the field that names the file: cv or profile.
const LONG_ROLE = 'Principal Distributed Systems Engineer and Platform Architect for Logistics';
const TALL = Array.from({ length: 12 }, () => `${'word '.repeat(59)}end`);

// One case per code the check and the page plan raise. An issue the CV alone has stands below
// cv; one the profile brings stands below profile where the profile holds its path.
test('plan refuses what the check and the page plan find, below the file that holds it', async () => {
  const space = workspace();
  const master = JSON.parse(readFileSync(FIXTURE_URL, 'utf8'));
  const [northwind] = master.blocks;
  const blocks = (id: string, change: object) =>
    master.blocks.map((block: { id: string }) =>
      block.id === id ? { ...block, ...change } : block,
    );
  const cvs: Record<string, object> = {
    twice: { ...master, blocks: [northwind, northwind] },
    short: { ...master, pages: 1 },
    bare: { ...master, pages: undefined },
    long: { ...master, person: { ...master.person, role: LONG_ROLE } },
    tall: { ...master, blocks: blocks('northwind', { bullets: TALL }) },
    untitled: { ...master, blocks: blocks('libraries', { title: undefined }) },
  };
  const profiles: Record<string, object> = {
    lines: { blocks: { northwind: { bullets: ['a\nb'] } } },
    role: { person: { role: LONG_ROLE } },
    tall: { blocks: { northwind: { bullets: TALL } } },
    untitled: { blocks: { libraries: { title: null } } },
    added: { blocks: { libraries: { items: ['Gin', 'Nope'] } } },
    raised: { blocks: { 'programming-languages': { items: [{ name: 'Rust', level: 5 }] } } },
    fact: { blocks: { northwind: { employer: 'Elsewhere' } } },
    moved: { order: ['cedar'] },
  };
  for (const [name, cv] of Object.entries(cvs))
    writeFileSync(join(space.home, 'cvs', `${name}.json`), JSON.stringify(cv));
  for (const [name, profile] of Object.entries(profiles))
    writeFileSync(join(space.home, 'profiles', `${name}.json`), JSON.stringify(profile));
  const cases: [string[], string, string, string | undefined][] = [
    [['--cv', 'bare'], 'SCHEMA', 'cv.pages', 'oriko schema master'],
    [
      ['--profile', 'lines'],
      'SCHEMA',
      'profile.blocks.northwind.bullets.0',
      'oriko schema profile',
    ],
    [['--cv', 'twice'], 'DUPLICATE_ID', 'cv.blocks.northwind', undefined],
    [['--profile', 'broken'], 'UNKNOWN_BLOCK', 'profile.blocks.nobody', undefined],
    [['--cv', 'untitled'], 'UNTITLED_NOT_ALONE', 'cv.blocks.libraries', undefined],
    [['--profile', 'untitled'], 'UNTITLED_NOT_ALONE', 'profile.blocks.libraries', undefined],
    [['--profile', 'added'], 'ITEM_NOT_IN_MASTER', 'profile.blocks.libraries.items', undefined],
    [
      ['--profile', 'raised'],
      'LEVEL_RAISED',
      'profile.blocks.programming-languages.items',
      undefined,
    ],
    [['--profile', 'fact'], 'FACT_CHANGED', 'profile.blocks.northwind.employer', undefined],
    [['--profile', 'moved'], 'JOB_MOVED', 'profile.order', undefined],
    [['--cv', 'long'], 'ROLE_TOO_LONG', 'cv.person.role', undefined],
    [['--profile', 'role'], 'ROLE_TOO_LONG', 'profile.person.role', undefined],
    [['--cv', 'tall'], 'BLOCK_TOO_TALL', 'cv.blocks.northwind', undefined],
    [['--profile', 'tall'], 'BLOCK_TOO_TALL', 'profile.blocks.northwind', undefined],
    [['--cv', 'short'], 'PAGE_OVERFLOW', 'cv.pages', undefined],
  ];
  for (const [options, code, path, command] of cases) {
    const { exit, answer } = await call(space, ['plan', ...options, ...cvOf(options)]);
    const [issue] = answer.issues ?? [];
    const named = command === undefined ? [] : [issue?.command];
    const expected = command === undefined ? [] : [command];
    assert.deepEqual(
      [exit, issue?.code, issue?.path, ...named],
      [1, code, path, ...expected],
      options.join(' '),
    );
  }
});

// The profiles of the case above name no CV, and the data folder holds several.
const cvOf = (options: string[]) => (options.includes('--profile') ? ['--cv', 'jane'] : []);

// adx finds a name only among the regular files of the data folder, and reads each with a limit.
test('plan takes only the stored CVs and profiles, and refuses one it cannot read', async () => {
  const space = workspace();
  const outside = join(space.cwd, 'outside.json');
  writeFileSync(outside, readFileSync(join(space.home, 'cvs', 'jane.json')));
  symlinkSync(outside, join(space.home, 'cvs', 'linked.json'));
  symlinkSync(outside, join(space.home, 'profiles', 'linked.json'));
  mkdirSync(join(space.home, 'cvs', 'folder.json'));
  writeFileSync(join(space.home, 'cvs', 'torn.json'), '{"language":');
  writeFileSync(join(space.home, 'profiles', 'big.json'), ' '.repeat(1_000_001));
  const cases: [string[], string, string][] = [
    [['--profile', '../cv'], 'NOT_IN_LIST', 'fix'],
    [['--cv', '../cvs/jane'], 'NOT_IN_LIST', 'fix'],
    [['--cv', 'linked'], 'NOT_IN_LIST', 'fix'],
    [['--profile', 'linked'], 'NOT_IN_LIST', 'fix'],
    [['--cv', 'folder'], 'NOT_IN_LIST', 'fix'],
    [['--cv', 'torn'], 'STORED_INVALID', 'ask'],
    [['--profile', 'big', '--cv', 'jane'], 'STORED_INVALID', 'ask'],
  ];
  for (const [options, code, kind] of cases) {
    const { exit, answer, codes } = await call(space, ['plan', ...options]);
    assert.deepEqual([exit, answer.kind, codes], [1, kind, [code]], options.join(' '));
  }
  // Without any profile, the command of the refusal lists none.
  rmSync(join(space.home, 'profiles'), { recursive: true });
  const [none] = (await call(space, ['plan', '--profile', 'acme'])).answer.issues ?? [];
  const command = `oriko plan --home ${space.home} --profile`;
  assert.deepEqual([none?.code, none?.command], ['NOT_IN_LIST', command]);
  const listed = await call(space, command.split(' ').slice(1));
  assert.deepEqual(listed.answer.result, { option: 'profile', values: [] });
});

const Previewed = z.object({ preview: z.string() });
const Built = z.looseObject({ file: z.string(), bytes: z.number(), style: z.string() });

test('preview answers the pages as text', async () => {
  const { exit, answer } = await call(workspace(), ['preview', '--profile', 'acme']);
  assert.equal(exit, 0);
  assert.equal(Previewed.parse(answer.result).preview.includes('Page 2 of 2'), true);
});

test('preview and the terminal build add the credits with --credits', async () => {
  const space = workspace();
  const { answer } = await call(space, ['preview', '--credits']);
  assert.equal(Previewed.parse(answer.result).preview.includes('MADE WITH'), true);
  const built = await call(space, ['build', '--out', 't.docx', '--style', 'terminal', '--credits']);
  assert.equal(built.exit, 0);
});

// The file is derived, so a build replaces it without --replace; a missing folder is created.
test('build writes the .docx, and with --dry-run it writes nothing', async () => {
  const space = workspace();
  assert.equal((await call(space, ['build', '--out', 'out.docx', '--dry-run'])).exit, 0);
  assert.equal(existsSync(join(space.cwd, 'out.docx')), false);
  assert.equal((await call(space, ['build', '--out', 'out.docx'])).exit, 0);
  assert.equal(readFileSync(join(space.cwd, 'out.docx')).subarray(0, 2).toString(), 'PK');
  const terminal = await call(space, ['build', '--out', 'out.docx', '--style', 'terminal']);
  const { replaces, style } = Built.parse(terminal.answer.result);
  assert.deepEqual([terminal.exit, replaces, style], [0, true, 'terminal']);
  assert.equal(statSync(join(space.cwd, 'out.docx')).mode & 0o777, 0o644);
  assert.equal((await call(space, ['build', '--out', 'sub/x.docx'])).exit, 0);
  assert.equal(existsSync(join(space.cwd, 'sub', 'x.docx')), true);
});

// adx writes through a link at --out to a file inside the working directory: the link stays,
// and its target takes the new bytes and the mode of the build.
test('build writes through a link at --out to a file of the working directory', async () => {
  const space = workspace();
  writeFileSync(join(space.cwd, 'real.docx'), 'original', { mode: 0o600 });
  symlinkSync('real.docx', join(space.cwd, 'link.docx'));
  const built = await call(space, ['build', '--style', 'terminal', '--out', 'link.docx']);
  const { file, replaces } = Built.parse(built.answer.result);
  assert.deepEqual([built.exit, file, replaces], [0, 'link.docx', true]);
  assert.equal(lstatSync(join(space.cwd, 'link.docx')).isSymbolicLink(), true);
  const real = join(space.cwd, 'real.docx');
  assert.equal(readFileSync(real).subarray(0, 2).toString(), 'PK');
  assert.equal(statSync(real).mode & 0o777, 0o644);
});

// LibreOffice is found in one place, which the test replaces with a script that answers as it does.
test('build writes a .pdf through LibreOffice, and asks the person when it is missing', async t => {
  const space = workspace();
  const scripts = mkdtempSync(join(tmpdir(), 'oriko-soffice-'));
  const program = t.mock.method(libreOffice, 'program', async () => undefined);
  const missing = await call(space, ['build', '--out', 'cv.pdf']);
  assert.deepEqual(
    [missing.exit, missing.answer.kind, missing.codes, missing.answer.issues?.[0]?.path],
    [1, 'ask', ['NOT_INSTALLED'], 'out'],
  );
  program.mock.mockImplementation(async () => fakeSoffice(scripts, 'fails'));
  const failed = await call(space, ['build', '--out', 'cv.pdf']);
  assert.deepEqual([failed.answer.kind, failed.codes], ['ask', ['CONVERSION_FAILED']]);
  assert.equal(existsSync(join(space.cwd, 'cv.pdf')), false);
  program.mock.mockImplementation(async () => fakeSoffice(scripts, 'writes'));
  const dry = await call(space, ['build', '--out', 'cv.pdf', '--style', 'terminal', '--dry-run']);
  assert.equal(Built.parse(dry.answer.result).bytes, 13);
  const built = await call(space, ['build', '--out', 'cv.pdf', '--style', 'terminal']);
  assert.deepEqual(
    [built.exit, Built.parse(built.answer.result).bytes, built.answer.next],
    [0, 13, undefined],
  );
  assert.equal(readFileSync(join(space.cwd, 'cv.pdf'), 'utf8'), '%PDF-1.7 fake');
  const word = await call(space, ['build', '--out', 'cv.docx']);
  assert.equal(Array.isArray(word.answer.next) && word.answer.next.length, 1);
  program.mock.restore();
  assert.equal(
    sofficePaths().every(path => /soffice|libreoffice/.test(path)),
    true,
  );
});

// The photo is read through the data folder with its byte limit, and only the classic look reads it.
test('build refuses a photo it cannot read or that is no picture', async () => {
  const space = workspace();
  writeFileSync(join(space.home, 'cvs', 'bad.png'), 'not a picture');
  writeFileSync(join(space.home, 'cvs', 'huge.png'), Buffer.alloc(20_000_001));
  const photos = { gone: 'cvs/gone.png', bad: 'cvs/bad.png', huge: 'cvs/huge.png' };
  for (const [name, photo] of Object.entries(photos))
    writeFileSync(
      join(space.home, 'profiles', `${name}.json`),
      JSON.stringify({ cv: 'jane', person: { photo } }),
    );
  const cases: [string, string, string | undefined][] = [
    ['gone', 'FILE_NOT_FOUND', undefined],
    ['bad', 'PHOTO_UNREADABLE', 'profile.person.photo'],
    ['huge', 'STORED_INVALID', undefined],
  ];
  for (const [profile, code, path] of cases) {
    const argv = ['build', '--profile', profile, '--out', 'p.docx', '--dry-run'];
    const [issue] = (await call(space, argv)).answer.issues ?? [];
    assert.deepEqual([issue?.code, issue?.path], [code, path], profile);
  }
  const terminal = ['build', '--profile', 'gone', '--out', 'p.docx', '--style', 'terminal'];
  assert.equal((await call(space, terminal)).exit, 0);
  writeFileSync(join(space.home, 'cvs', 'jane.png'), 'not a picture');
  const [own] = (await call(space, ['build', '--out', 'p.docx'])).answer.issues ?? [];
  assert.deepEqual([own?.code, own?.path], ['PHOTO_UNREADABLE', 'cv.person.photo']);
});

// A photo is kept data: the seed holds cvs/jane.png, so a new one for jane needs --replace.
test('photo set stores the picture as a square PNG for a CV, or for one profile', async () => {
  const space = workspace();
  const source = tall(space.cwd);
  const taken = await call(space, ['photo', 'set', '--file', source]);
  assert.deepEqual([taken.exit, taken.codes], [1, ['ALREADY_EXISTS']]);
  const replace = ['photo', 'set', '--file', source, '--replace'];
  assert.equal((await call(space, [...replace, '--dry-run'])).exit, 0);
  assert.deepEqual(readFileSync(join(space.home, 'cvs', 'jane.png')), photo());
  assert.equal((await call(space, replace)).exit, 0);
  assert.equal(PNG.sync.read(readFileSync(join(space.home, 'cvs', 'jane.png'))).height, 10);
  const first = await call(space, ['photo', 'set', '--file', source, '--profile', 'acme']);
  assert.deepEqual(first.answer.result, {
    photo: { file: 'profiles/acme.png', bytes: 70, replaces: false },
    owner: {
      file: 'profiles/acme.json',
      bytes: 136,
      replaces: true,
      changes: { added: ['person'], changed: [], removed: [], more: 0 },
    },
  });
  assert.equal(PNG.sync.read(readFileSync(join(space.home, 'profiles', 'acme.png'))).width, 10);
  assert.equal(
    readFileSync(join(space.home, 'profiles', 'acme.json'), 'utf8').includes('profiles/acme.png'),
    true,
  );
  assert.equal((await call(space, ['build', '--profile', 'acme', '--out', 'acme.docx'])).exit, 0);
  // A relative path starts at the working directory of the process, and a link is read through.
  const acme = ['photo', 'set', '--profile', 'acme', '--replace', '--file'];
  assert.equal((await call(space, [...acme, 'assets/placeholder.png'])).exit, 0);
  assert.equal(PNG.sync.read(readFileSync(join(space.home, 'profiles', 'acme.png'))).width, 300);
  symlinkSync(source, join(space.cwd, 'linked.png'));
  assert.equal((await call(space, [...acme, join(space.cwd, 'linked.png')])).exit, 0);
  assert.equal(PNG.sync.read(readFileSync(join(space.home, 'profiles', 'acme.png'))).width, 10);
});

// adx writes through a link at the photo that stays inside the data folder, into whatever file it
// names; a link that leads out of it is replaced with --replace, and its target stays as it was.
test('photo set writes through a link inside the data folder and never out of it', async () => {
  const space = workspace();
  const source = tall(space.cwd);
  mkdirSync(join(space.home, 'store'));
  writeFileSync(join(space.home, 'store', 'jane.png'), photo());
  rmSync(join(space.home, 'cvs', 'jane.png'));
  symlinkSync(join(space.home, 'store', 'jane.png'), join(space.home, 'cvs', 'jane.png'));
  assert.equal((await call(space, ['photo', 'set', '--file', source, '--replace'])).exit, 0);
  assert.deepEqual(
    [
      lstatSync(join(space.home, 'cvs', 'jane.png')).isSymbolicLink(),
      PNG.sync.read(readFileSync(join(space.home, 'store', 'jane.png'))).width,
    ],
    [true, 10],
  );
  const victim = join(space.cwd, 'victim.png');
  writeFileSync(victim, 'untouched');
  symlinkSync(victim, join(space.home, 'profiles', 'acme.png'));
  const out = await call(space, ['photo', 'set', '--file', source, '--profile', 'acme']);
  assert.deepEqual([out.exit, out.codes], [1, ['ALREADY_EXISTS']]);
  const replaced = ['photo', 'set', '--file', source, '--profile', 'acme', '--replace'];
  assert.equal((await call(space, replaced)).exit, 0);
  assert.deepEqual(
    [
      lstatSync(join(space.home, 'profiles', 'acme.png')).isSymbolicLink(),
      readFileSync(victim, 'utf8'),
    ],
    [false, 'untouched'],
  );
  // A link to a stored file that is no photo leads the replace into that file.
  rmSync(join(space.home, 'cvs', 'jane.png'));
  symlinkSync('../profiles/acme.json', join(space.home, 'cvs', 'jane.png'));
  const into = await call(space, ['photo', 'set', '--file', source, '--cv', 'jane', '--replace']);
  const { photo: written } = z
    .object({ photo: z.looseObject({ file: z.string(), replaces: z.boolean() }) })
    .parse(into.answer.result);
  assert.deepEqual([into.exit, written.file, written.replaces], [0, 'cvs/jane.png', true]);
  assert.equal(PNG.sync.read(readFileSync(join(space.home, 'profiles', 'acme.json'))).width, 10);
});

// A part of the plan that adx refuses leaves the photo and the file that names it as they were.
test('photo set writes nothing when one of its two files is refused', async () => {
  const space = workspace();
  const before = readFileSync(join(space.home, 'profiles', 'acme.json'), 'utf8');
  writeFileSync(join(space.home, 'profiles', 'acme.png'), 'a photo the profile does not name');
  const argv = ['photo', 'set', '--file', tall(space.cwd), '--profile', 'acme'];
  assert.deepEqual((await call(space, argv)).codes, ['ALREADY_EXISTS']);
  assert.equal(readFileSync(join(space.home, 'profiles', 'acme.json'), 'utf8'), before);
});

const Edited = z.object({
  file: z.string(),
  replaces: z.boolean(),
  unchanged: z.literal(true).optional(),
  changes: z.unknown().optional(),
  fits: z.boolean(),
  layout: z.array(z.unknown()),
});

// A dry run answers what the real run writes; an edit that leaves the CV as it is writes nothing.
test('an edit command changes the CV file, and with --dry-run it does not', async () => {
  const space = workspace();
  const master = join(space.home, 'cvs', 'jane.json');
  const before = readFileSync(master, 'utf8');
  const input = JSON.stringify({ id: 'awards' });
  const dry = await call(space, ['block', 'remove', '--json', input, '--dry-run']);
  assert.deepEqual([dry.exit, dry.answer.applied], [0, false]);
  assert.equal(readFileSync(master, 'utf8'), before);
  const real = await call(space, ['block', 'remove', '--json', '-'], input);
  assert.deepEqual([real.exit, real.answer.applied], [0, true]);
  assert.deepEqual(Edited.parse(real.answer.result), Edited.parse(dry.answer.result));
  assert.equal(readFileSync(master, 'utf8').includes('"awards"'), false);
  assert.equal(
    (await call(space, ['cv', 'update', '--json', JSON.stringify({ language: 'de' })])).exit,
    0,
  );
  const edited = readFileSync(master, 'utf8');
  assert.equal(edited.includes('"language": "de"'), true);
  assert.equal(edited, `${JSON.stringify(JSON.parse(edited), null, 2)}\n`);
  const again = await call(space, ['cv', 'update', '--json', JSON.stringify({ language: 'de' })]);
  const { file, replaces, unchanged } = Edited.parse(again.answer.result);
  assert.deepEqual([file, replaces, unchanged], ['cvs/jane.json', false, true]);
  assert.equal(readFileSync(master, 'utf8'), edited);
});

// An edit may make the CV too long: it still stands, and the answer says what no longer fits.
test('an edit that overfills the pages is written, and names no step to build', async () => {
  const space = workspace();
  const { exit, answer } = await call(space, ['cv', 'update', '--json', '{"pages":1}']);
  const { fits, layout } = Edited.parse(answer.result);
  assert.deepEqual([exit, fits, answer.next], [0, false, undefined]);
  assert.deepEqual(
    z.array(z.looseObject({ code: z.string(), path: z.string() })).parse(layout)[0],
    {
      code: 'PAGE_OVERFLOW',
      path: 'pages',
      message: 'These blocks of the left column land after page 1: campus, freelance, cedar',
      hint: 'Hide or shorten blocks of the left column, remove a page pin, or raise "pages"',
    },
  );
  assert.equal(
    readFileSync(join(space.home, 'cvs', 'jane.json'), 'utf8').includes('"pages": 1'),
    true,
  );
});

const Changes = z.object({
  added: z.array(z.string()),
  changed: z.array(z.string()),
  removed: z.array(z.string()),
  more: z.number(),
});
const Master = z.looseObject({
  language: z.string(),
  contact: z.object({ items: z.array(z.looseObject({ lines: z.array(z.string()) })) }),
  blocks: z.array(z.looseObject({ id: z.string() })),
});
type Stored = z.output<typeof Master>;
const blockOf = (cv: Stored, id: string) => cv.blocks.find(block => block.id === id);

// Each edit writes its change into the stored CV and answers the JSON paths it changed.
test('each edit stores its change, and answers what it changed', async () => {
  const cases: [string, object, z.output<typeof Changes>, (cv: Stored) => unknown, unknown][] = [
    [
      'block add',
      { block: { id: 'tools', kind: 'list', section: 'Tools', items: ['Vim'] } },
      { added: ['blocks.15'], changed: [], removed: [], more: 0 },
      cv => blockOf(cv, 'tools')?.items,
      ['Vim'],
    ],
    [
      'block update',
      { id: 'libraries', set: { title: 'Frameworks' } },
      { added: [], changed: ['blocks.9.title'], removed: [], more: 0 },
      cv => blockOf(cv, 'libraries')?.title,
      'Frameworks',
    ],
    [
      'block remove',
      { id: 'awards' },
      { added: [], changed: [], removed: ['blocks.14'], more: 0 },
      cv => blockOf(cv, 'awards'),
      undefined,
    ],
    [
      'block move',
      { id: 'awards', page: 2 },
      { added: ['blocks.14.page'], changed: [], removed: [], more: 0 },
      cv => blockOf(cv, 'awards')?.page,
      2,
    ],
    [
      'item add',
      { block: 'libraries', value: 'Vitest' },
      { added: ['blocks.9.items.5'], changed: [], removed: [], more: 0 },
      cv => blockOf(cv, 'libraries')?.items,
      ['Gin', 'gRPC', 'React', 'Kafka Streams', 'Playwright', 'Vitest'],
    ],
    [
      'item update',
      { block: 'libraries', index: 0, value: 'Echo' },
      { added: [], changed: ['blocks.9.items.0'], removed: [], more: 0 },
      cv => blockOf(cv, 'libraries')?.items,
      ['Echo', 'gRPC', 'React', 'Kafka Streams', 'Playwright'],
    ],
    [
      'item remove',
      { block: 'libraries', index: 4 },
      { added: [], changed: [], removed: ['blocks.9.items.4'], more: 0 },
      cv => blockOf(cv, 'libraries')?.items,
      ['Gin', 'gRPC', 'React', 'Kafka Streams'],
    ],
    [
      'item move',
      { block: 'libraries', index: 1, to: 0 },
      { added: [], changed: ['blocks.9.items.0', 'blocks.9.items.1'], removed: [], more: 0 },
      cv => blockOf(cv, 'libraries')?.items,
      ['gRPC', 'Gin', 'React', 'Kafka Streams', 'Playwright'],
    ],
    [
      'cv update',
      { language: 'de' },
      { added: [], changed: ['language'], removed: [], more: 0 },
      cv => cv.language,
      'de',
    ],
    [
      'contact add',
      { value: { icon: 'mail', lines: ['jane@example.org'] } },
      { added: ['contact.items.5'], changed: [], removed: [], more: 0 },
      cv => cv.contact.items[5]?.lines,
      ['jane@example.org'],
    ],
    [
      'contact update',
      { index: 0, value: { lines: ['Berlin'] } },
      { added: [], changed: ['contact.items.0.lines.0'], removed: [], more: 0 },
      cv => cv.contact.items[0]?.lines,
      ['Berlin'],
    ],
    [
      'contact remove',
      { index: 4 },
      { added: [], changed: [], removed: ['contact.items.4'], more: 0 },
      cv => cv.contact.items.length,
      4,
    ],
    [
      'contact move',
      { index: 1, to: 0 },
      {
        added: ['contact.items.0.lines.1'],
        changed: [
          'contact.items.0.icon',
          'contact.items.0.lines.0',
          'contact.items.1.icon',
          'contact.items.1.lines.0',
        ],
        removed: ['contact.items.1.lines.1'],
        more: 0,
      },
      cv => cv.contact.items.map(item => item.lines[0]),
      [
        'Example Street 1',
        'Germany, Berlin',
        '+49 (0) 30 000 000',
        'jane.doe@example.com',
        'Profile »',
      ],
    ],
  ];
  for (const [command, input, changes, read, expected] of cases) {
    const space = workspace();
    const argv = [...command.split(' '), '--json', JSON.stringify(input)];
    const { exit, answer } = await call(space, argv);
    const { result } = z.object({ result: z.object({ changes: Changes }) }).parse(answer);
    const stored = Master.parse(
      JSON.parse(readFileSync(join(space.home, 'cvs', 'jane.json'), 'utf8')),
    );
    assert.deepEqual(
      [exit, answer.applied, result.changes, read(stored)],
      [0, true, changes, expected],
      command,
    );
  }
});

// Every check of an edit keeps its code and message; each issue stands at a field of the call.
test('an edit refuses what it cannot do, at the field of the call that names it', async () => {
  const space = workspace();
  const edit = (command: string, input: object) => [
    ...command.split(' '),
    '--json',
    JSON.stringify(input),
  ];
  const job = { id: 'northwind', kind: 'list', section: 'Skills', title: 'X', items: ['a'] };
  const cases: [string[], [string, string | undefined, string][]][] = [
    [
      edit('block add', { block: job }),
      [['DUPLICATE_ID', 'block.id', 'Two blocks have the id northwind']],
    ],
    [
      edit('block add', { block: { ...job, id: 'more', title: undefined, section: 'Awards' } }),
      [
        [
          'UNTITLED_NOT_ALONE',
          'block',
          'The block awards has no title but shares its section with a block next to it',
        ],
        [
          'UNTITLED_NOT_ALONE',
          'block',
          'The block more has no title but shares its section with a block next to it',
        ],
      ],
    ],
    [
      edit('block add', { block: { ...job, id: 'more' }, before: 'nobody' }),
      [['UNKNOWN_BLOCK', 'before', 'No block has the id nobody']],
    ],
    [
      edit('block update', { id: 'libraries', set: { title: 5 } }),
      [['SCHEMA', 'set.title', 'Invalid input: expected string, received number']],
    ],
    [
      edit('block update', { id: 'interests', set: { section: 'Awards' } }),
      [
        [
          'UNTITLED_NOT_ALONE',
          'set',
          'The block interests has no title but shares its section with a block next to it',
        ],
        [
          'UNTITLED_NOT_ALONE',
          'set',
          'The block awards has no title but shares its section with a block next to it',
        ],
      ],
    ],
    [
      edit('block remove', { id: 'nobody' }),
      [['UNKNOWN_BLOCK', 'id', 'No block has the id nobody']],
    ],
    [
      edit('block move', { id: 'awards' }),
      [['NOTHING_TO_DO', undefined, 'The input names no new place for the block']],
    ],
    [
      edit('block move', { id: 'awards', before: 'interests', after: 'interests' }),
      [['BOTH_ANCHORS', 'after', 'The input names two anchors']],
    ],
    [
      edit('block move', { id: 'awards', before: 'northwind' }),
      [
        [
          'OTHER_COLUMN',
          'before',
          'The block awards stands in the right column, the anchor northwind does not; the anchors of the right column: programming-languages, expertise, libraries, strengths, additional-skills, languages, interests',
        ],
      ],
    ],
    [
      edit('item add', { block: 'nobody', value: 'Rust' }),
      [['UNKNOWN_BLOCK', 'block', 'No block has the id nobody']],
    ],
    [
      edit('block add', { block: { ...job, id: 'more' }, before: 'awards', after: 'awards' }),
      [['BOTH_ANCHORS', 'after', 'The input names two anchors']],
    ],
    [
      edit('block add', { block: { ...job, id: 'more' }, after: 'cedar' }),
      [
        [
          'OTHER_COLUMN',
          'after',
          'The block more stands in the right column, the anchor cedar does not; the anchors of the right column: programming-languages, expertise, libraries, strengths, additional-skills, languages, interests, awards',
        ],
      ],
    ],
    [
      edit('block update', { id: 'nobody', set: { title: 'X' } }),
      [['UNKNOWN_BLOCK', 'id', 'No block has the id nobody']],
    ],
    [
      edit('block move', { id: 'nobody', page: 2 }),
      [['UNKNOWN_BLOCK', 'id', 'No block has the id nobody']],
    ],
    [
      edit('item update', { block: 'nobody', index: 0, value: 'Rust' }),
      [['UNKNOWN_BLOCK', 'block', 'No block has the id nobody']],
    ],
    [
      edit('item remove', { block: 'nobody', index: 0 }),
      [['UNKNOWN_BLOCK', 'block', 'No block has the id nobody']],
    ],
    [
      edit('item move', { block: 'nobody', index: 0, to: 1 }),
      [['UNKNOWN_BLOCK', 'block', 'No block has the id nobody']],
    ],
    // An add takes the place after the last item too, which appends.
    [
      edit('item add', { block: 'libraries', value: 'Rust', index: 9 }),
      [
        [
          'INDEX_OUT_OF_RANGE',
          'index',
          'There is no place 9 for this edit; the edit takes the places 0 to 5',
        ],
      ],
    ],
    [
      edit('item update', { block: 'awards', index: 2, value: { note: 'x' } }),
      [
        [
          'INDEX_OUT_OF_RANGE',
          'index',
          'There is no place 2 for this edit; the edit takes the places 0 to 1',
        ],
      ],
    ],
    [
      edit('item update', { block: 'languages', index: 0, value: { level: 9 } }),
      [['SCHEMA', 'value.level', 'Too big: expected number to be <=5']],
    ],
    [
      edit('item move', { block: 'awards', index: 0, to: 2 }),
      [
        [
          'INDEX_OUT_OF_RANGE',
          'to',
          'There is no place 2 for this edit; the edit takes the places 0 to 1',
        ],
      ],
    ],
    [
      edit('item remove', { block: 'awards', index: 2 }),
      [
        [
          'INDEX_OUT_OF_RANGE',
          'index',
          'There is no place 2 for this edit; the edit takes the places 0 to 1',
        ],
      ],
    ],
    [
      edit('cv update', { person: { photo: 'cvs/other.png' } }),
      [['SCHEMA', 'person.photo', 'the input has no field photo']],
    ],
    [
      edit('cv update', { language: 'english' }),
      [['SCHEMA', 'language', 'Expected a two-letter language code, such as en or de']],
    ],
    [
      edit('contact add', { value: { icon: 'mail', lines: ['x'] }, index: 9 }),
      [
        [
          'INDEX_OUT_OF_RANGE',
          'index',
          'There is no place 9 for this edit; the edit takes the places 0 to 5',
        ],
      ],
    ],
    [
      edit('contact update', { index: 0, value: { icon: 'fax' } }),
      [
        [
          'SCHEMA',
          'value.icon',
          'Invalid option: expected one of "pin"|"home"|"phone"|"mail"|"globe"',
        ],
      ],
    ],
    [
      edit('contact update', { index: 5, value: { lines: ['x'] } }),
      [
        [
          'INDEX_OUT_OF_RANGE',
          'index',
          'There is no place 5 for this edit; the edit takes the places 0 to 4',
        ],
      ],
    ],
    [
      edit('contact remove', { index: 5 }),
      [
        [
          'INDEX_OUT_OF_RANGE',
          'index',
          'There is no place 5 for this edit; the edit takes the places 0 to 4',
        ],
      ],
    ],
    [
      edit('contact move', { index: 0, to: 5 }),
      [
        [
          'INDEX_OUT_OF_RANGE',
          'to',
          'There is no place 5 for this edit; the edit takes the places 0 to 4',
        ],
      ],
    ],
  ];
  for (const [argv, expected] of cases) {
    const { exit, answer } = await call(space, argv);
    const issues = z
      .array(z.looseObject({ code: z.string(), path: z.string().optional(), message: z.string() }))
      .parse(answer.issues);
    assert.deepEqual(
      [exit, issues.map(issue => [issue.code, issue.path, issue.message])],
      [1, expected],
      argv.join(' '),
    );
  }
});

// What lies in the CV stands below `cv`: a list the edit fills past its limit, a CV that fails
// its own shape, and an issue the CV held before the edit, which an edit may also fix.
test('an edit refuses an issue that lies in the CV below cv', async () => {
  const space = workspace();
  const shapeOf = async (argv: string[]) => {
    const [issue] = (await call(space, argv)).answer.issues ?? [];
    return [issue?.code, issue?.path, issue?.command];
  };
  // A CV holds at most 8 contact lines and 40 items per block.
  const path = join(space.home, 'cvs', 'jane.json');
  const master = JSON.parse(readFileSync(path, 'utf8'));
  const line = { icon: 'mail', lines: ['x'] };
  const libraries = { ...master.blocks[9], items: Array.from({ length: 40 }, (_, at) => `L${at}`) };
  const full = {
    ...master,
    contact: { ...master.contact, items: Array.from({ length: 8 }, () => line) },
    blocks: master.blocks.map((block: { id: string }) =>
      block.id === 'libraries' ? libraries : block,
    ),
  };
  writeFileSync(path, JSON.stringify(full));
  assert.deepEqual(await shapeOf(['contact', 'add', '--json', JSON.stringify({ value: line })]), [
    'SCHEMA',
    'cv.contact.items',
    'oriko schema master',
  ]);
  assert.deepEqual(
    await shapeOf(['item', 'add', '--json', '{"block":"libraries","value":"One more"}']),
    ['SCHEMA', 'cv.blocks.libraries.items', 'oriko schema block'],
  );
  writeFileSync(path, JSON.stringify({ ...master, pages: 0 }));
  assert.deepEqual(await shapeOf(['block', 'remove', '--json', '{"id":"awards"}']), [
    'SCHEMA',
    'cv.pages',
    'oriko schema master',
  ]);
  const twice = [...master.blocks, { ...master.blocks.at(-1), section: 'Elsewhere' }];
  writeFileSync(path, JSON.stringify({ ...master, blocks: twice }));
  // adx fills the command of an issue below `cv` from the source of `cv`, a list of CVs.
  assert.deepEqual(await shapeOf(['cv', 'update', '--json', '{"pages":3}']), [
    'DUPLICATE_ID',
    'cv.blocks.awards',
    `oriko cv update --pages 3 --home ${space.home} --cv`,
  ]);
  // Removing the id removes both blocks, so the edit fixes the CV and passes.
  assert.equal((await call(space, ['block', 'remove', '--json', '{"id":"awards"}'])).exit, 0);
});

test('show lists the blocks, and one block in full by its id', async () => {
  const space = workspace();
  const all = await call(space, ['show']);
  assert.equal(Array.isArray(all.answer.blocks) && all.answer.blocks.length, 15);
  const one = await call(space, ['show', '--block', 'awards']);
  assert.equal(JSON.stringify(one.answer.block).includes('Team Award'), true);
  assert.deepEqual((await call(space, ['show', '--block', 'nobody'])).codes, ['UNKNOWN_BLOCK']);
});

test('schema answers the accepted input of a command', async () => {
  const { exit, answer } = await call(workspace(), ['schema', 'block move']);
  assert.equal(exit, 0);
  assert.equal(JSON.stringify(answer.input).includes('"after"'), true);
});

test('every packaged example CV and profile fits and builds', async () => {
  const space = { ...workspace(), home: fileURLToPath(new URL('../../examples', import.meta.url)) };
  const cvs = (await call(space, ['cvs'])).answer.cvs;
  const profiles = (await call(space, ['profiles'])).answer.profiles;
  const List = z.array(z.looseObject({ name: z.string(), fits: z.boolean() }));
  const listed = [...List.parse(cvs), ...List.parse(profiles)];
  assert.deepEqual(
    listed.filter(entry => entry.fits === false),
    [],
  );
  for (const { name } of List.parse(cvs)) {
    assert.equal(
      (await call(space, ['build', '--cv', name, '--out', `${name}.docx`])).exit,
      0,
      name,
    );
  }
  for (const { name } of List.parse(profiles)) {
    for (const file of [`${name}.docx`, `${name}-terminal.docx`]) {
      const style = file.endsWith('-terminal.docx') ? 'terminal' : 'classic';
      const built = await call(space, [
        'build',
        '--profile',
        name,
        '--style',
        style,
        '--out',
        file,
      ]);
      assert.equal(built.exit, 0, file);
      // The showcase PDFs come from Google Docs, which set these very files; the PDF through
      // LibreOffice is measured against them.
      const showcase = new URL(`../../examples/showcase/${name}/${file}`, import.meta.url);
      assert.deepEqual(readFileSync(join(space.cwd, file)), readFileSync(showcase), file);
    }
  }
});

test('refuses bad input with exit code 1 and the code of the reason', async () => {
  const space = workspace();
  const notes = join(space.cwd, 'notes.txt');
  writeFileSync(notes, 'not a picture');
  const { pages, ...withoutPages } = JSON.parse(readFileSync(FIXTURE_URL, 'utf8'));
  mkdirSync(join(space.cwd, 'broken-home', 'cvs'), { recursive: true });
  writeFileSync(join(space.cwd, 'broken-home', 'cvs', 'broken.json'), JSON.stringify(withoutPages));
  for (const [name, photo] of [
    ['nul', 'cvs/x\u0000.png'],
    ['split', 'cvs/a\nb.png'],
    ['absolute', join(space.home, 'cvs', 'jane.png')],
  ])
    writeFileSync(
      join(space.home, 'profiles', `${name}.json`),
      JSON.stringify({ cv: 'jane', person: { photo } }),
    );
  const cases: [string[], string][] = [
    [['plan', '--profile', 'nul'], 'SCHEMA'],
    [['plan', '--profile', 'split'], 'SCHEMA'],
    [['plan', '--profile', 'absolute'], 'SCHEMA'],
    [['build', '--out', '../out.docx'], 'PATH_OUTSIDE'],
    [['build', '--out', join(space.cwd, 'out.docx')], 'PATH_OUTSIDE'],
    [['build', '--out', 'out.txt'], 'WRONG_EXTENSION'],
    [['build'], 'SCHEMA'],
    [['build', '--out', 'out.docx', '--style', 'neon'], 'NOT_IN_LIST'],
    [['build', '--out', 'out.docx', '--credits'], 'CREDITS_NEED_TERMINAL'],
    [['init', '--cv', 'erika', '--json', '{broken'], 'INVALID_JSON'],
    [['init', '--cv', 'erika'], 'MISSING_INPUT'],
    [['block', 'remove', '--json', '{broken'], 'INVALID_JSON'],
    [['block', 'remove'], 'SCHEMA'],
    [['block', 'remove', '--cv', 'nobody', '--json', '{"id":"awards"}'], 'NOT_IN_LIST'],
    [
      ['block', 'remove', '--json', '{"id":"awards"}', '--home', join(space.cwd, 'empty-home')],
      'NO_CV',
    ],
    [
      ['block', 'remove', '--json', '{"id":"awards"}', '--home', join(space.cwd, 'broken-home')],
      'SCHEMA',
    ],
    [
      ['item', 'add', '--json', '{"block":"interests","value":"Chess"}', '--home', 'relative'],
      'ROOT_NOT_FOUND',
    ],
    [
      ['block', 'remove', '--json', '{"id":"awards"}', '--home', join(space.cwd, 'badjson-home')],
      'STORED_INVALID',
    ],
    [['paint'], 'UNKNOWN_COMMAND'],
    [['plan', '--color'], 'UNKNOWN_OPTION'],
    [['cvs', '--output', 'pdf'], 'UNKNOWN_OUTPUT'],
    [['preview', '--output', 'pdf'], 'NOT_IN_LIST'],
    [['plan', '--home', join(space.cwd, 'missing')], 'ROOT_NOT_FOUND'],
    [['profiles', '--home', 'missing'], 'NO_CV'],
    [['plan', '--home', join(space.cwd, 'broken-home')], 'SCHEMA'],
    [['plan', '--profile', 'nobody'], 'NOT_IN_LIST'],
    [['preview', '--profile', 'nobody'], 'NOT_IN_LIST'],
    [['photo', 'set', '--file', notes, '--profile', '../cv'], 'NOT_IN_LIST'],
    [['init', '--json', NEW_CV], 'MISSING_OPTION'],
    [['init', '--cv', '../evil', '--json', NEW_CV], 'SCHEMA'],
    [['init', '--cv', 'jane', '--json', NEW_CV], 'CV_EXISTS'],
    [['init', '--cv', 'erika', '--json', '{"language":"german"}'], 'SCHEMA'],
    [['photo', 'set'], 'SCHEMA'],
    [['photo', 'set', '--file', join(space.cwd, 'missing.png')], 'NO_PICTURE'],
    [['photo', 'set', '--file', notes], 'PHOTO_UNREADABLE'],
    [['photo', 'set', '--file', notes, '--profile', 'nobody'], 'NOT_IN_LIST'],
    [['photo', 'set', '--file', notes, '--home', join(space.cwd, 'broken-home')], 'SCHEMA'],
    [['photo', 'set', '--file', notes, '--home', join(space.cwd, 'empty-home')], 'NO_CV'],
    [['photo', 'set', '--file', notes, '--profile', 'badjson'], 'STORED_INVALID'],
  ];
  mkdirSync(join(space.cwd, 'empty-home'));
  writeFileSync(join(space.home, 'profiles', 'badjson.json'), '{');
  mkdirSync(join(space.cwd, 'badjson-home', 'cvs'), { recursive: true });
  writeFileSync(join(space.cwd, 'badjson-home', 'cvs', 'bad.json'), '{');
  for (const [argv, code] of cases) {
    const { exit, codes } = await call(space, argv);
    assert.deepEqual([exit, codes.slice(0, 1)], [1, [code]], argv.join(' '));
  }
  // photo set checks the stored file before it changes it, and the issue stands below its field.
  const nul = await call(space, ['photo', 'set', '--file', notes, '--profile', 'nul']);
  const [stored] = nul.answer.issues ?? [];
  assert.deepEqual([stored?.code, stored?.path], ['SCHEMA', 'profile.person.photo']);
});

test('an option without a value answers the values it accepts', async () => {
  const space = workspace();
  await call(space, ['init', '--cv', 'erika', '--json', NEW_CV]);
  const values = async (argv: string[]) => (await call(space, argv)).answer;
  assert.deepEqual(await values(['show', '--cv']), {
    ok: true,
    option: 'cv',
    values: ['erika', 'jane'],
  });
  assert.deepEqual(await values(['show', '--profile']), {
    ok: true,
    option: 'profile',
    values: ['acme', 'broken'],
  });
  assert.deepEqual(await values(['plan', '--cv']), {
    ok: true,
    result: { option: 'cv', values: [{ value: 'erika' }, { value: 'jane' }] },
  });
  assert.deepEqual(await values(['plan', '--profile']), {
    ok: true,
    result: { option: 'profile', values: [{ value: 'acme' }, { value: 'broken' }] },
  });
  assert.deepEqual(await values(['build', '--style']), {
    ok: true,
    result: { option: 'style', values: [{ value: 'classic' }, { value: 'terminal' }] },
  });
  assert.deepEqual(await values(['item', 'add', '--cv']), {
    ok: true,
    result: { option: 'cv', values: [{ value: 'erika' }, { value: 'jane' }] },
  });
  assert.deepEqual(await values(['cvs', '--output']), {
    ok: true,
    option: 'output',
    values: ['json', 'text'],
  });
  const blocks = await values(['show', '--cv', 'jane', '--block']);
  assert.deepEqual(
    [blocks.option, blocks.cv, Array.isArray(blocks.values) && blocks.values.length],
    ['block', 'jane', 15],
  );
  assert.equal((await values(['show', '--profile', 'acme', '--block'])).cv, 'jane');
});

// A free value, such as a path or a JSON input, has no list; the refusal names the option.
test('an option without a value and without a list is refused by its name', async () => {
  const space = workspace();
  const cases: [string[], string][] = [
    [['build', '--out'], 'out'],
    [['plan', '--home'], 'home'],
    [['block', 'add', '--json'], 'json'],
    [['profile', 'set', '--profile', 'globex', '--json'], 'json'],
  ];
  for (const [argv, path] of cases) {
    const { exit, answer } = await call(space, argv);
    assert.deepEqual(
      [exit, answer.issues?.map(issue => [issue.code, issue.path])],
      [1, [['MISSING_VALUE', path]]],
      argv.join(' '),
    );
  }
  // An empty --home opens no folder, not even the default one.
  const file = join(space.cwd, 'not-a-folder');
  writeFileSync(file, '');
  const { answer } = await call({ ...space, home: file }, ['plan', '--home']);
  assert.deepEqual(
    answer.issues?.map(issue => issue.code),
    ['MISSING_VALUE'],
  );
});

// The command of a refusal answers the values that fix it, so the agent runs it and picks one.
test('a refusal names a command that lists the fitting values, and that command runs', async () => {
  const space = workspace();
  await call(space, ['init', '--cv', 'erika', '--json', NEW_CV]);
  const picture = tall(space.cwd);
  const cases: [string[], string, string][] = [
    [['show'], 'CV_REQUIRED', 'oriko show --cv'],
    [['show', '--cv', 'nobody'], 'UNKNOWN_CV', 'oriko show --cv'],
    [
      ['show', '--cv', 'jane', '--block', 'nobody'],
      'UNKNOWN_BLOCK',
      'oriko show --cv jane --block',
    ],
    [
      ['profile', 'set', '--profile', 'globex', '--json', '{"cv":"jane","order":["nobody"]}'],
      'UNKNOWN_BLOCK',
      'oriko show --cv jane --block',
    ],
    [['cvs', '--output', 'pdf'], 'UNKNOWN_OUTPUT', 'oriko --output'],
    [['profile', 'set', '--profile', 'globex'], 'MISSING_INPUT', 'oriko schema profile set'],
    [
      ['profile', 'set', '--profile', 'globex', '--json'],
      'MISSING_VALUE',
      'oriko schema profile set',
    ],
    [['paint'], 'UNKNOWN_COMMAND', 'oriko schema'],
    [['cvs', '--color'], 'UNKNOWN_OPTION', 'oriko schema'],
    [['init', '--json', NEW_CV], 'MISSING_OPTION', 'oriko show --cv'],
    [
      ['profile', 'set', '--json', '{"cv":"jane"}'],
      'MISSING_OPTION',
      'oriko profile set --profile',
    ],
    [['profile', 'show'], 'MISSING_OPTION', 'oriko profile show --profile'],
    [['read', '--posting', 'job.pdf'], 'MISSING_OPTION', 'oriko read --profile'],
  ];
  // The command keeps the --home of the call, or it would list the CVs of another data folder.
  for (const [argv, code, command] of cases) {
    const home = ` --home ${space.home}`;
    const [issue] = (await call(space, [...argv, '--home', space.home])).answer.issues ?? [];
    assert.deepEqual([issue?.code, issue?.command], [code, `${command}${home}`], argv.join(' '));
    const listed = await call(space, `${command}${home}`.split(' ').slice(1));
    assert.equal(listed.answer.ok, true, command);
  }
  // On adx the command lists the values of the field, with the --home of the call in it.
  const listing: [string[], string, string][] = [
    [['plan'], 'CV_REQUIRED', `oriko plan --home ${space.home} --cv`],
    [['plan', '--cv', 'nobody'], 'NOT_IN_LIST', `oriko plan --home ${space.home} --cv`],
    [['plan', '--profile', 'nobody'], 'NOT_IN_LIST', `oriko plan --home ${space.home} --profile`],
    [['preview'], 'CV_REQUIRED', `oriko preview --home ${space.home} --cv`],
    [
      ['block', 'remove', '--json', '{"id":"awards"}', '--dry-run'],
      'CV_REQUIRED',
      `oriko block remove --id awards --home ${space.home} --cv`,
    ],
    [
      ['build', '--cv', 'jane', '--out', 'x.docx', '--style', 'neon'],
      'NOT_IN_LIST',
      `oriko build --cv jane --out x.docx --home ${space.home} --style`,
    ],
    [['build'], 'SCHEMA', 'oriko schema build'],
    [
      ['photo', 'set', '--file', picture, '--profile', 'nobody', '--dry-run'],
      'NOT_IN_LIST',
      `oriko photo set --file ${picture} --home ${space.home} --profile`,
    ],
    [
      ['photo', 'set', '--file', picture],
      'CV_REQUIRED',
      `oriko photo set --file ${picture} --home ${space.home} --cv`,
    ],
  ];
  for (const [argv, code, command] of listing) {
    const [issue] = (await call(space, [...argv, '--home', space.home])).answer.issues ?? [];
    assert.deepEqual([issue?.code, issue?.command], [code, command], argv.join(' '));
    assert.equal((await call(space, command.split(' ').slice(1))).answer.ok, true, command);
  }
  // Without any profile the command of NOT_IN_LIST lists no name.
  rmSync(join(space.home, 'profiles'), { recursive: true });
  const unknown = ['photo', 'set', '--file', picture, '--profile', 'acme'];
  const [none] = (await call(space, unknown)).answer.issues ?? [];
  const command = `oriko photo set --file ${picture} --home ${space.home} --profile`;
  assert.deepEqual([none?.code, none?.command], ['NOT_IN_LIST', command]);
  const listed = await call(space, command.split(' ').slice(1));
  assert.deepEqual(listed.answer.result, { option: 'profile', values: [] });
});

// stdin can be read only once, so the CV of a piped input is found from the text read before.
test('a refusal of a piped input finds the CV the input names', async () => {
  const space = workspace();
  await call(space, ['init', '--cv', 'erika', '--json', NEW_CV]);
  const piped = [JSON.stringify({ cv: 'jane', order: ['nobody'] })];
  let out = '';
  await run(['profile', 'set', '--profile', 'globex'], {
    home: space.home,
    cwd: space.cwd,
    web: fakeWeb({}, {}).web,
    isTTY: false,
    stdin: async () => piped.shift() ?? null,
    write: text => (out += text),
  });
  const Refused = z.object({
    issues: z.array(z.looseObject({ code: z.string(), command: z.string() })),
  });
  const [issue] = Refused.parse(JSON.parse(out)).issues;
  assert.deepEqual(
    [issue?.code, issue?.command],
    ['UNKNOWN_BLOCK', 'oriko show --cv jane --block'],
  );
});

test('schema answers every command and every shape it lists', async () => {
  const space = workspace();
  const { commands, schemas } = (await call(space, ['schema'])).answer;
  const names = [...z.array(z.string()).parse(commands), ...z.array(z.string()).parse(schemas)];
  for (const name of names)
    assert.equal((await call(space, ['schema', ...name.split(' ')])).answer.ok, true, name);
  const plan = (await call(space, ['schema', 'plan'])).answer;
  assert.deepEqual(
    [
      plan.name,
      plan.input,
      plan.required,
      Object.keys(z.record(z.string(), z.unknown()).parse(plan.options)),
    ],
    ['plan', null, [], ['cv', 'profile', 'home', 'output']],
  );
  const required = async (name: string[]) => {
    const { answer } = await call(space, ['schema', ...name]);
    return [answer.required, answer.requiredWith];
  };
  assert.deepEqual(
    [
      await required(['plan']),
      await required(['build']),
      await required(['init']),
      await required(['profile', 'set']),
      await required(['profile', 'show']),
      await required(['read']),
    ],
    [
      [[], {}],
      [['out'], {}],
      [['cv'], {}],
      [['profile'], {}],
      [['profile'], {}],
      [[], { posting: ['profile'] }],
    ],
  );
});

// A wrong input names the schema that shows the accepted shape, and that schema exists.
test('a refusal for a wrong shape names the schema command, and it runs', async () => {
  const space = workspace();
  const cases: [string[], string][] = [
    // A missing block lies inside the shape block, so the command shows that shape.
    [['block', 'add', '--json', '{}'], 'oriko schema block'],
    // The kind of the stored block picks the shape, and the command shows the one for all kinds.
    [['block', 'update', '--json', '{"id":"awards","set":{"items":[]}}'], 'oriko schema block'],
    [['item', 'add', '--json', '{"block":"languages","value":"Dutch"}'], 'oriko schema item'],
    [['contact', 'update', '--json', '{"index":0,"value":{"icon":"fax"}}'], 'oriko schema contact'],
    [['item', 'add', '--json', '{"block":"awards","value":5}'], 'oriko schema item'],
    [['contact', 'add', '--json', '{"value":5}'], 'oriko schema contact'],
    [['init', '--cv', 'erika', '--json', '{}'], 'oriko schema init'],
  ];
  for (const [argv, command] of cases) {
    const [issue] = (await call(space, argv)).answer.issues ?? [];
    assert.deepEqual([issue?.code, issue?.command], ['SCHEMA', command], argv.join(' '));
    assert.equal((await call(space, command.split(' ').slice(1))).answer.ok, true, command);
  }
});

// Nothing a command does not take passes silently, and one answer names every mistake.
test('checks the call against its command and names every mistake at once', async () => {
  const space = workspace();
  const cases: [string[], [string, string][]][] = [
    [['init'], [['MISSING_OPTION', 'cv']]],
    [
      ['profile', 'set', '--out', 'x.docx', '--json', '{}'],
      [
        ['OPTION_NOT_ALLOWED', 'out'],
        ['MISSING_OPTION', 'profile'],
      ],
    ],
    [
      ['read', '--posting', 'job.pdf', '--out', 'x.docx'],
      [
        ['OPTION_NOT_ALLOWED', 'out'],
        ['MISSING_OPTION', 'profile'],
      ],
    ],
    [['cvs', 'extra'], [['UNEXPECTED_ARGUMENT', 'extra']]],
    [['photo', 'set', '--file', 'a.png', 'b.png'], [['UNEXPECTED_ARGUMENT', 'b.png']]],
    [['cvs', '--out', 'x.docx'], [['OPTION_NOT_ALLOWED', 'out']]],
    [['plan', '--out', 'x.docx'], [['UNKNOWN_OPTION', 'out']]],
    [['show', '--cv', 'jane', '--cv', 'jane'], [['REPEATED_OPTION', 'cv']]],
    [['plan', '--cv', 'jane', '--cv', 'jane'], [['REPEATED_OPTION', 'cv']]],
    [['init', '--cv', 'erika', '--dry-run=true'], [['UNEXPECTED_VALUE', 'dry-run']]],
    [['build', '--out', 'x.docx', '--dry-run=true'], [['UNEXPECTED_VALUE', 'dry-run']]],
    // A value outside its list stops the call before the checks of the command run.
    [['build', '--out', 'x.txt', '--style', 'neon', '--credits'], [['NOT_IN_LIST', 'style']]],
    [
      ['build', '--out', 'x.txt', '--credits', '--dry-run'],
      [
        ['WRONG_EXTENSION', 'out'],
        ['CREDITS_NEED_TERMINAL', 'credits'],
      ],
    ],
    [
      ['plan', '--color', '--size'],
      [
        ['UNKNOWN_OPTION', 'color'],
        ['UNKNOWN_OPTION', 'size'],
      ],
    ],
    [['init', '--cv'], [['MISSING_VALUE', 'cv']]],
    [
      ['show', '--cv', '--profile'],
      [
        ['MISSING_VALUE', 'cv'],
        ['MISSING_VALUE', 'profile'],
      ],
    ],
    [
      ['init', '--cv', 'erika', '--json', NEW_CV, '--home', '--dry-run'],
      [['MISSING_VALUE', 'home']],
    ],
    [['bogus', '--cv='], [['UNKNOWN_COMMAND', 'command']]],
    [['photo set', 'a.png'], [['UNKNOWN_COMMAND', 'command']]],
    [['block', '--json', '{}'], [['OPTION_NOT_ALLOWED', 'json']]],
    [['block', '--bogus'], [['UNKNOWN_OPTION', 'bogus']]],
    [['--profile'], [['OPTION_NOT_ALLOWED', 'profile']]],
    [['photo', 'set'], [['SCHEMA', 'file']]],
    [['photo', 'set', '--file', join(space.cwd, 'missing.png')], [['NO_PICTURE', 'file']]],
  ];
  for (const [argv, expected] of cases) {
    const { exit, answer } = await call(space, argv);
    assert.deepEqual(
      [exit, answer.issues?.map(issue => [issue.code, issue.path])],
      [1, expected],
      argv.join(' '),
    );
  }
  const notAllowed = (await call(space, ['cvs', '--out', 'x.docx'])).answer.issues?.[0];
  assert.equal(notAllowed?.command, 'oriko schema cvs');
  const newName = (await call(space, ['init', '--cv'])).answer.issues?.[0];
  assert.equal(newName?.command, 'oriko show --cv');
});

test('names the same next step for --cv of init, whether it is missing or empty', async () => {
  const space = workspace();
  const hint = async (argv: string[]) =>
    z.looseObject({ hint: z.string() }).parse((await call(space, argv)).answer.issues?.[0]).hint;
  assert.equal(await hint(['init']), await hint(['init', '--cv']));
});

test('oriko alone answers where to start: the CVs and the profiles of the data folder', async () => {
  const space = workspace();
  assert.deepEqual(
    [(await call(space, [])).answer.cvs, (await call(space, [])).answer.profiles],
    [['jane'], ['acme', 'broken']],
  );
  const empty = mkdtempSync(join(tmpdir(), 'oriko-empty-'));
  const start = (await call(space, ['--home', empty])).answer;
  assert.deepEqual([start.ok, start.cvs, start.profiles], [true, [], []]);
});

test('a group of commands without its action lists the actions', async () => {
  const space = workspace();
  const cases: [string, string[]][] = [
    ['block', ['block add', 'block update', 'block remove', 'block move']],
    ['item', ['item add', 'item update', 'item remove', 'item move']],
    ['contact', ['contact add', 'contact update', 'contact remove', 'contact move']],
    ['cv', ['cv update']],
    ['photo', ['photo set']],
    ['profile', ['profile set', 'profile show']],
  ];
  for (const [group, actions] of cases)
    assert.deepEqual((await call(space, [group])).answer, {
      ok: true,
      command: group,
      values: actions,
    });
  const [issue] = (await call(space, ['block', 'frobnicate'])).answer.issues ?? [];
  assert.deepEqual([issue?.code, issue?.command], ['UNKNOWN_COMMAND', 'oriko block']);
});

// A wrong folder or file is the caller's to fix, so it is refused with exit 1, never a bug.
test('refuses a folder where a file belongs, and a file where a folder belongs', async () => {
  const space = workspace();
  writeFileSync(join(space.cwd, 'notes.txt'), 'not a folder');
  writeFileSync(join(space.home, 'profiles', 'ghost.json'), JSON.stringify({ cv: 'ghost' }));
  writeFileSync(join(space.cwd, 'huge.png'), Buffer.alloc(20_000_001));
  writeFileSync(join(space.cwd, 'locked.png'), 'no one may read this', { mode: 0o000 });
  mkdirSync(join(space.cwd, 'flat'));
  writeFileSync(join(space.cwd, 'flat', 'cvs'), 'a file where the folder of CVs belongs');
  mkdirSync(join(space.cwd, 'nested', 'cvs', 'jane.json'), { recursive: true });
  mkdirSync(join(space.cwd, 'd.docx'));
  symlinkSync(join(space.cwd, 'd.docx'), join(space.cwd, 'dirlink.docx'));
  symlinkSync('loop.docx', join(space.cwd, 'loop.docx'));
  mkdirSync(join(space.cwd, 'sealed'), { mode: 0o555 });
  mkdirSync(join(space.cwd, 'sealed-home'), { mode: 0o555 });
  execFileSync('mkfifo', [join(space.cwd, 'pipe.png')]);
  mkdirSync(join(space.cwd, 'piped', 'cvs'), { recursive: true });
  execFileSync('mkfifo', [join(space.cwd, 'piped', 'cvs', 'pipe.json')]);
  execFileSync('mkfifo', [join(space.home, 'cvs', 'pipe.png')]);
  const piped = { cv: 'jane', person: { photo: 'cvs/pipe.png' } };
  writeFileSync(join(space.home, 'profiles', 'piped.json'), JSON.stringify(piped));
  const cases: [string[], string, string | undefined][] = [
    [['show', '--home', 'notes.txt'], 'NOT_A_FOLDER', 'home'],
    [['show', '--home', 'notes.txt/x'], 'PATH_REFUSED', 'home'],
    [['cvs', '--home', 'flat'], 'PATH_REFUSED', 'home'],
    [['show', '--home', 'nested'], 'NOT_A_FILE', 'cv'],
    [['photo', 'set', '--file', space.cwd], 'PICTURE_NOT_A_FILE', 'file'],
    [['photo', 'set', '--file', join(space.cwd, 'huge.png')], 'PICTURE_TOO_LARGE', 'file'],
    [['photo', 'set', '--file', join(space.cwd, 'pipe.png')], 'PICTURE_NOT_A_FILE', 'file'],
    [['show', '--home', 'piped'], 'NOT_A_FILE', 'cv'],
    [['build', '--profile', 'piped', '--out', 'p.docx', '--dry-run'], 'NOT_A_FILE', undefined],
    [['photo', 'set', '--file', join(space.cwd, 'locked.png')], 'PATH_REFUSED', 'file'],
    [['photo', 'set', '--file', join(space.cwd, 'notes.txt', 'x.png')], 'PATH_REFUSED', 'file'],
    [['photo', 'set', '--file', join(space.cwd, `${'a'.repeat(300)}.png`)], 'PATH_REFUSED', 'file'],
    [['show', '--profile', 'acme', '--home', 'nowhere'], 'NO_CV', 'home'],
    [['show', '--profile', 'ghost'], 'UNKNOWN_CV', 'profile.cv'],
    [['plan', '--home', join(space.cwd, 'notes.txt')], 'ROOT_NOT_FOUND', undefined],
    [['plan', '--profile', 'ghost'], 'UNKNOWN_CV', 'profile.cv'],
    [['build', '--out', 'notes.txt/x.docx', '--dry-run'], 'NOT_A_FOLDER', 'out'],
    [['build', '--out', 'd.docx', '--dry-run'], 'NOT_A_FILE', 'out'],
    [['build', '--out', 'sealed/x.docx'], 'SYSTEM_REFUSED', undefined],
    [['build', '--out', 'loop.docx', '--dry-run'], 'SYSTEM_REFUSED', undefined],
    [['init', '--cv', 'erika', '--json', NEW_CV, '--home', 'sealed-home'], 'PATH_REFUSED', 'home'],
  ];
  for (const [argv, code, path] of cases) {
    const { exit, answer } = await call(space, argv);
    const [issue] = answer.issues ?? [];
    assert.deepEqual([exit, issue?.code, issue?.path], [1, code, path], argv.join(' '));
  }
  assert.deepEqual(readdirSync(join(space.cwd, 'sealed')), []);
  // A link to a folder at --out is replaced by the write, never followed.
  assert.equal((await call(space, ['build', '--out', 'dirlink.docx', '--dry-run'])).exit, 0);
  // A link to a folder inside the working directory leads the write there; the answer names
  // the path as the call gave it.
  mkdirSync(join(space.cwd, 'reports'));
  symlinkSync(join(space.cwd, 'reports'), join(space.cwd, 'latest'));
  const built = (await call(space, ['build', '--out', 'latest/cv.docx'])).answer;
  assert.deepEqual(
    [Built.parse(built.result).file, existsSync(join(space.cwd, 'reports', 'cv.docx'))],
    ['latest/cv.docx', true],
  );
  // adx answers a folder the caller may not write to as the person's to solve, at no field.
  chmodSync(join(space.home, 'cvs'), 0o555);
  const edit = await call(space, ['block', 'remove', '--json', JSON.stringify({ id: 'awards' })]);
  const [refused] = edit.answer.issues ?? [];
  assert.deepEqual(
    [edit.exit, edit.answer.kind, refused?.code, refused?.path],
    [1, 'ask', 'SYSTEM_REFUSED', undefined],
  );
});

test('a profile decides the CV for show and for the list of CVs', async () => {
  const space = workspace();
  await call(space, ['init', '--cv', 'erika', '--json', NEW_CV]);
  assert.equal((await call(space, ['show', '--profile', 'acme'])).answer.cv, 'jane');
  assert.deepEqual((await call(space, ['show', '--profile', 'acme', '--cv'])).answer.values, [
    'jane',
  ]);
});

test('names the unknown option in the path of the refusal', async () => {
  const [issue] = (await call(workspace(), ['plan', '--color'])).answer.issues ?? [];
  assert.equal(issue?.path, 'color');
});

// The shape of the path is refused where the data enters; a link out of the folder where it opens.
test('refuses a photo path that leaves the data folder', async () => {
  const space = workspace();
  const path = join(space.home, 'cvs', 'jane.json');
  const master = readFileSync(path, 'utf8');
  writeFileSync(path, master.replace('"cvs/jane.png"', '"cvs/../../photo.png"'));
  const shape = await call(space, ['build', '--out', 'out.docx']);
  assert.deepEqual([shape.exit, shape.codes], [1, ['SCHEMA']]);
  writeFileSync(join(space.cwd, 'outside.png'), photo());
  symlinkSync(join(space.cwd, 'outside.png'), join(space.home, 'cvs', 'linked.png'));
  writeFileSync(path, master.replace('"cvs/jane.png"', '"cvs/linked.png"'));
  const linked = await call(space, ['build', '--out', 'out.docx']);
  assert.deepEqual([linked.exit, linked.codes], [1, ['PATH_OUTSIDE']]);
});

// A link in the data folder never redirects a write: the write replaces the link, not its target.
test('writes never follow a link out of the data folder', async () => {
  const space = workspace();
  const victim = join(space.cwd, 'victim.txt');
  writeFileSync(victim, 'untouched');
  symlinkSync(victim, join(space.home, 'cvs', 'erika.png'));
  symlinkSync(victim, join(space.home, 'cvs', `erika.json.${process.pid}.tmp`));
  assert.equal((await call(space, ['init', '--cv', 'erika', '--json', NEW_CV])).exit, 0);
  assert.equal(readFileSync(victim, 'utf8'), 'untouched');
  // An edit runs on adx, which stages under a name of its own beside the CV and leaves no
  // file behind; a CV that is a link out of the data folder is no CV adx lists, so the edit
  // never reaches the link's target.
  const cvs = join(space.home, 'cvs');
  const input = JSON.stringify({ id: 'awards' });
  assert.equal((await call(space, ['block', 'remove', '--cv', 'jane', '--json', input])).exit, 0);
  assert.deepEqual(readdirSync(cvs).sort(), ['erika.json', 'erika.png', 'jane.json', 'jane.png']);
  const outside = join(space.cwd, 'jane.json');
  renameSync(join(cvs, 'jane.json'), outside);
  symlinkSync(outside, join(cvs, 'jane.json'));
  const before = readFileSync(outside, 'utf8');
  const linked = await call(space, [
    'block',
    'remove',
    '--cv',
    'jane',
    '--json',
    '{"id":"campus"}',
  ]);
  assert.deepEqual([linked.codes, readFileSync(outside, 'utf8')], [['NOT_IN_LIST'], before]);
});

// A command that writes several files writes all of them or none: here the CV file cannot be
// written, so its photo is not left behind either.
test('a refused write leaves none of the files of the command', async () => {
  const space = workspace();
  mkdirSync(join(space.home, 'cvs', `erika.json.${process.pid}.tmp`, 'blocker'), {
    recursive: true,
  });
  const { exit } = await call(space, ['init', '--cv', 'erika', '--json', NEW_CV]);
  assert.deepEqual([exit, existsSync(join(space.home, 'cvs', 'erika.png'))], [1, false]);
});

const PAGE = '<!doctype html><html><body><h1>Senior Go Engineer</h1><p>Berlin</p></body></html>';

const reading = () => {
  const space = workspace();
  const { web } = fakeWeb(
    { 'jobs.example': ['93.184.216.34'] },
    { 'https://jobs.example/1': { status: 200, body: PAGE } },
  );
  return { ...space, web };
};

const stored = (space: Space, ...path: string[]) => {
  const file = join(space.home, ...path);
  return existsSync(file) ? readFileSync(file, 'utf8') : null;
};

test('read stores a posting from a file or an https address beside its profile', async () => {
  const space = reading();
  writeFileSync(join(space.cwd, 'job.pdf'), pdf('Senior Go Engineer'));
  const fromFile = await call(space, ['read', '--profile', 'acme', '--posting', 'job.pdf']);
  assert.deepEqual(
    [fromFile.exit, fromFile.answer.read],
    [
      0,
      [
        {
          role: 'posting',
          source: 'job.pdf',
          kind: 'pdf',
          chars: 18,
          replaced: 0,
          stored: 'profiles/acme.posting.md',
          text: 'Senior Go Engineer',
        },
      ],
    ],
  );
  assert.equal(
    stored(space, 'profiles', 'acme.posting.md'),
    '---\nsource: "job.pdf"\nkind: pdf\n---\n\nSenior Go Engineer\n',
  );
  const link = 'https://jobs.example/1';
  const fromWeb = await call(space, ['read', '--profile', 'globex', '--posting', link]);
  assert.deepEqual(
    [fromWeb.exit, stored(space, 'profiles', 'globex.posting.md')],
    [0, `---\nsource: "${link}"\nkind: html\n---\n\n# Senior Go Engineer\n\nBerlin\n`],
  );
});

test('read appends notes beside the CV, and answers an old CV without storing it', async () => {
  const space = reading();
  writeFileSync(join(space.cwd, 'a.md'), 'Led the move to Go');
  writeFileSync(join(space.cwd, 'b.txt'), 'Mentored four engineers');
  writeFileSync(join(space.cwd, 'old.docx'), await docx(['Jane Doe', 'Engineer']));
  assert.equal((await call(space, ['read', '--notes', 'a.md', '--notes', 'b.txt'])).exit, 0);
  assert.equal((await call(space, ['read', '--notes', 'a.md'])).exit, 0);
  assert.equal(
    stored(space, 'cvs', 'jane.notes.md'),
    '## a.md\n\nLed the move to Go\n\n## b.txt\n\nMentored four engineers\n\n## a.md\n\nLed the move to Go\n',
  );
  const before = [readdirSync(join(space.home, 'cvs')), readdirSync(join(space.home, 'profiles'))];
  const resume = await call(space, ['read', '--resume', 'old.docx']);
  assert.deepEqual(resume.answer.read, [
    {
      role: 'resume',
      source: 'old.docx',
      kind: 'docx',
      chars: 17,
      replaced: 0,
      text: 'Jane Doe\nEngineer',
    },
  ]);
  assert.deepEqual(
    [readdirSync(join(space.home, 'cvs')), readdirSync(join(space.home, 'profiles'))],
    before,
  );
});

// One answer names every issue of every input, and a refused call stores nothing at all.
test('read refuses with every issue of every input, and then stores nothing', async () => {
  const space = reading();
  writeFileSync(join(space.cwd, 'job.pdf'), pdf('Senior Go Engineer'));
  writeFileSync(join(space.cwd, 'scan.pdf'), pdf());
  writeFileSync(join(space.cwd, 'image.png'), photo());
  writeFileSync(join(space.cwd, 'a.md'), 'Led the move to Go');
  mkdirSync(join(space.cwd, 'empty'));
  const cases: [string[], string[]][] = [
    [['read'], ['MISSING_INPUT']],
    [['read', '--posting', 'job.pdf'], ['MISSING_OPTION']],
    [['read', '--profile', '../acme', '--posting', 'job.pdf'], ['SCHEMA']],
    [
      [
        'read',
        '--profile',
        'acme',
        '--posting',
        'scan.pdf',
        '--notes',
        'a.md',
        '--notes',
        'image.png',
      ],
      ['NO_TEXT', 'UNSUPPORTED_KIND'],
    ],
    [['read', '--profile', 'acme', '--posting', 'http://jobs.example/1'], ['URL_NOT_ALLOWED']],
    [['read', '--profile', 'acme', '--posting', 'missing.pdf'], ['FILE_NOT_FOUND']],
    [['read', '--notes', 'a.md', '--home', 'empty'], ['NO_CV']],
  ];
  for (const [argv, expected] of cases) {
    const { exit, codes } = await call(space, argv);
    assert.deepEqual([exit, codes], [1, expected], argv.join(' '));
  }
  assert.deepEqual(
    [stored(space, 'profiles', 'acme.posting.md'), stored(space, 'cvs', 'jane.notes.md')],
    [null, null],
  );
  const [missing] = (await call(space, ['read'])).answer.issues ?? [];
  assert.equal(missing?.command, 'oriko schema read');
});

// A posting is replaced only on request; the same text again is no change, and a dry run writes nothing.
test('read keeps a stored posting unless --replace is given', async () => {
  const space = reading();
  writeFileSync(join(space.cwd, 'job.pdf'), pdf('Senior Go Engineer'));
  writeFileSync(join(space.cwd, 'new.txt'), 'Staff Go Engineer');
  const posting = ['read', '--profile', 'acme', '--posting'];
  assert.equal((await call(space, [...posting, 'job.pdf'])).exit, 0);
  assert.equal((await call(space, [...posting, 'job.pdf'])).exit, 0);
  assert.deepEqual((await call(space, [...posting, 'new.txt'])).codes, ['POSTING_EXISTS']);
  assert.equal((await call(space, [...posting, 'new.txt', '--replace', '--dry-run'])).exit, 0);
  assert.match(stored(space, 'profiles', 'acme.posting.md') ?? '', /Senior Go Engineer/);
  assert.equal((await call(space, [...posting, 'new.txt', '--replace'])).exit, 0);
  assert.match(stored(space, 'profiles', 'acme.posting.md') ?? '', /Staff Go Engineer/);
});

const profileSet = (name: string, profile: unknown, ...flags: string[]) => [
  'profile',
  'set',
  '--profile',
  name,
  '--json',
  JSON.stringify(profile),
  ...flags,
];

// The whole profile is replaced, so the answer names what it adds, changes and removes; an
// existing profile is replaced only on request, and a dry run shows the same without writing.
test('profile set stores a checked profile and names what it adds, changes and removes', async () => {
  const space = workspace();
  const acme = stored(space, 'profiles', 'acme.json');
  const fresh = { cv: 'jane', blocks: { campus: { hidden: true } } };
  const created = await call(space, profileSet('globex', fresh));
  assert.deepEqual(
    [created.exit, created.answer.added, created.answer.changed, created.answer.removed],
    [0, ['blocks.campus', 'cv'], [], []],
  );
  assert.equal(stored(space, 'profiles', 'globex.json'), `${JSON.stringify(fresh, null, 2)}\n`);
  const [exists] = (await call(space, profileSet('acme', fresh))).answer.issues ?? [];
  assert.deepEqual(
    [exists?.code, exists?.command],
    ['PROFILE_EXISTS', 'oriko profile show --profile acme'],
  );
  const preview = await call(space, profileSet('acme', fresh, '--replace', '--dry-run'));
  assert.deepEqual(
    [preview.answer.written, preview.answer.added, preview.answer.removed],
    [false, ['blocks.campus'], ['blocks.freelance']],
  );
  assert.equal(stored(space, 'profiles', 'acme.json'), acme);
  assert.equal((await call(space, profileSet('acme', fresh, '--replace'))).exit, 0);
  assert.equal(stored(space, 'profiles', 'acme.json'), `${JSON.stringify(fresh, null, 2)}\n`);
});

// The same checks plan runs, before anything is written: a refused profile is never stored.
test('profile set refuses a profile that does not fit its CV, and stores nothing', async () => {
  const space = workspace();
  const cases: [string[], [string, string][]][] = [
    [
      profileSet('globex', { cv: 'jane', blocks: { nobody: { hidden: true } } }),
      [['UNKNOWN_BLOCK', 'blocks.nobody']],
    ],
    [
      profileSet('globex', { cv: 'jane', blocks: { northwind: { bullets: ['a\nb'] } } }),
      [['SCHEMA', 'blocks.northwind.bullets.0']],
    ],
    [profileSet('globex', { cv: 'jane', colour: 'red' }), [['SCHEMA', '']]],
    [profileSet('globex', { cv: 'nobody' }), [['UNKNOWN_CV', 'profile.cv']]],
    [profileSet('../globex', { cv: 'jane' }), [['SCHEMA', 'profile']]],
    [['profile', 'set', '--json', '{"cv":"jane"}'], [['MISSING_OPTION', 'profile']]],
    [['profile', 'set', '--profile', 'globex'], [['MISSING_INPUT', 'json']]],
  ];
  for (const [argv, expected] of cases) {
    const { exit, answer } = await call(space, argv);
    assert.deepEqual(
      [exit, answer.issues?.map(issue => [issue.code, issue.path])],
      [1, expected],
      argv.join(' '),
    );
  }
  assert.equal(stored(space, 'profiles', 'globex.json'), null);
});

test('profile show answers a stored profile and its posting', async () => {
  const space = workspace();
  writeFileSync(join(space.cwd, 'job.txt'), 'Senior Go Engineer');
  writeFileSync(join(space.home, 'profiles', 'odd.json'), JSON.stringify({ colour: 'red' }));
  assert.deepEqual((await call(space, ['profile', 'show', '--profile', 'acme'])).answer, {
    ok: true,
    name: 'acme',
    profile: { cv: 'jane', blocks: { freelance: { hidden: true } } },
    posting: null,
    next: [
      {
        does: 'places every block on the pages',
        command: 'oriko plan --profile acme',
      },
    ],
  });
  await call(space, ['read', '--profile', 'globex', '--posting', 'job.txt']);
  const posting = (await call(space, ['profile', 'show', '--profile', 'globex'])).answer;
  assert.deepEqual(
    [posting.profile, posting.posting],
    [null, '---\nsource: "job.txt"\nkind: text\n---\n\nSenior Go Engineer\n'],
  );
  const refused = [
    await call(space, ['profile', 'show', '--profile', 'nobody']),
    await call(space, ['profile', 'show', '--profile', 'odd']),
  ];
  assert.deepEqual(
    refused.map(({ codes }) => codes),
    [['UNKNOWN_PROFILE'], ['SCHEMA']],
  );
});
