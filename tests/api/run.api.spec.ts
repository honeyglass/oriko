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
import type { TestContext } from 'node:test';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { run as runOnAdx } from '@honeyglass/adx/test';
import { z } from 'zod';
import { oriko } from '../../cli/oriko.ts';
import { run } from '../../cli/run.ts';
import { NODE_WEB } from '../../read/web.ts';
import { NEW_CV, call, terminal, workspace } from '../utils/cli.ts';
import type { Space } from '../utils/cli.ts';
import { docx, pdf } from '../utils/documents.ts';
import { libreOffice, sofficePaths } from '../../pdf/convert.ts';
import { fakeSoffice } from '../utils/soffice.ts';
import { fakeWeb } from '../utils/web.ts';
import type { Page } from '../utils/web.ts';
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

// A CV that does not fit is listed with what keeps it from fitting, never refused; adx answers a
// stored file it cannot read with its own code.
test('cvs lists every CV with its language and whether it fits', async () => {
  const space = workspace();
  const cvs = join(space.home, 'cvs');
  const master = JSON.parse(readFileSync(join(cvs, 'jane.json'), 'utf8'));
  writeFileSync(join(cvs, 'badjson.json'), '{');
  writeFileSync(join(cvs, 'odd.json'), JSON.stringify({ colour: 'red' }));
  writeFileSync(join(cvs, 'sealed.json'), '{}', { mode: 0o000 });
  writeFileSync(join(cvs, 'short.json'), JSON.stringify({ ...master, pages: 1 }));
  writeFileSync(
    join(cvs, 'twice.json'),
    JSON.stringify({ ...master, blocks: [...master.blocks, master.blocks[0]] }),
  );
  // adx lists regular files only, so a folder and a link are left out.
  mkdirSync(join(cvs, 'folder.json'));
  symlinkSync('jane.json', join(cvs, 'link.json'));
  const { answer } = await call(space, ['cvs']);
  assert.deepEqual(answer.result, {
    items: [
      { name: 'badjson', fits: false, issues: ['STORED_INVALID'] },
      { name: 'jane', language: 'en', person: 'Jane Doe', fits: true, pages: 2 },
      {
        name: 'odd',
        fits: false,
        issues: ['SCHEMA', 'SCHEMA', 'SCHEMA', 'SCHEMA', 'SCHEMA', 'SCHEMA'],
      },
      { name: 'sealed', fits: false, issues: ['SYSTEM_REFUSED'] },
      { name: 'short', fits: false, issues: ['PAGE_OVERFLOW', 'PAGE_OVERFLOW'] },
      { name: 'twice', fits: false, issues: ['DUPLICATE_ID'] },
    ],
    total: 6,
  });
});

// A profile that does not build is listed with what keeps it from building, never refused;
// adx answers a stored file it cannot read with its own code.
test('profiles lists every profile with its CV and whether it can be built', async () => {
  const space = workspace();
  writeFileSync(join(space.home, 'profiles', 'badjson.json'), '{');
  writeFileSync(join(space.home, 'profiles', 'odd.json'), JSON.stringify({ colour: 'red' }));
  writeFileSync(join(space.home, 'profiles', 'sealed.json'), '{}', { mode: 0o000 });
  // adx lists regular files only, so a folder and a link are left out.
  mkdirSync(join(space.home, 'profiles', 'folder.json'));
  symlinkSync('acme.json', join(space.home, 'profiles', 'link.json'));
  const { answer } = await call(space, ['profiles']);
  assert.deepEqual(answer.result, {
    items: [
      { name: 'acme', cv: 'jane', fits: true, pages: 2 },
      { name: 'badjson', cv: 'jane', fits: false, issues: ['STORED_INVALID'] },
      { name: 'broken', cv: 'jane', fits: false, issues: ['UNKNOWN_BLOCK'] },
      { name: 'odd', cv: 'jane', fits: false, issues: ['SCHEMA'] },
      { name: 'sealed', cv: 'jane', fits: false, issues: ['SYSTEM_REFUSED'] },
    ],
    total: 5,
  });
  // With a second CV, a profile without its field cv belongs to none of them.
  await call(space, ['init', '--cv', 'erika', '--json', NEW_CV]);
  const listed = z.object({ items: z.array(z.looseObject({ name: z.string() })) });
  const { items } = listed.parse((await call(space, ['profiles'])).answer.result);
  assert.deepEqual(
    items.find(item => item.name === 'broken'),
    { name: 'broken', fits: false, issues: ['CV_REQUIRED'] },
  );
});

test('init creates a new CV that builds, and the edit commands fill it', async () => {
  const space = workspace();
  assert.equal(
    (await call(space, ['init', '--cv', 'erika', '--json', NEW_CV, '--dry-run'])).exit,
    0,
  );
  assert.equal(existsSync(join(space.home, 'cvs', 'erika.json')), false);
  const created = await call(space, ['init', '--cv', 'erika', '--json', '-'], NEW_CV);
  assert.deepEqual(
    [created.exit, created.answer.result],
    [
      0,
      {
        cv: { file: 'cvs/erika.json', bytes: 243, replaces: false },
        photo: 'placeholder.png',
        placeholder: { file: 'placeholder.png', bytes: 1983, replaces: false },
      },
    ],
  );
  const stored = JSON.parse(readFileSync(join(space.home, 'cvs', 'erika.json'), 'utf8'));
  assert.equal(stored.person.photo, 'placeholder.png');
  assert.deepEqual(
    readFileSync(join(space.home, 'placeholder.png')),
    readFileSync(fileURLToPath(new URL('../../assets/placeholder.png', import.meta.url))),
  );
  // The placeholder is written once; a second CV names the same file.
  const second = await call(space, ['init', '--cv', 'eva', '--json', NEW_CV]);
  assert.deepEqual(second.answer.result, {
    cv: { file: 'cvs/eva.json', bytes: 243, replaces: false },
    photo: 'placeholder.png',
  });
  // The first photo of a new CV is a new file, so it needs no --replace.
  const photoSet = ['photo', 'set', '--file', tall(space.cwd), '--cv', 'erika'];
  assert.equal((await call(space, photoSet)).exit, 0);
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
  assert.deepEqual(
    z
      .object({ items: z.array(z.object({ name: z.string() }).loose()) })
      .parse(answer.result)
      .items.map(cv => cv.name),
    ['erika', 'eva', 'jane'],
  );
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
  assert.equal('result' in answer('cvs', '--home', home), true);
  assert.equal('commands' in answer('schema'), true);
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
      hint: 'Check --home, or create a CV with the command and the fields it needs',
      command: 'oriko init',
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
    flat: { blocks: ['northwind'] },
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
    [['--profile', 'lines'], 'SCHEMA', 'profile.blocks.northwind.bullets.0', 'oriko schema block'],
    // Patches that are no record fail the shape of the profile itself.
    [['--profile', 'flat'], 'SCHEMA', 'profile.blocks', 'oriko schema profile'],
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

// adx would write through a link at --out to a file inside the working directory, so build
// refuses it and leaves the link and its file as they were; a link adx replaces is written.
test('build refuses a link at --out to a file of the working directory', async () => {
  const space = workspace();
  writeFileSync(join(space.cwd, 'real.docx'), 'original', { mode: 0o600 });
  symlinkSync('real.docx', join(space.cwd, 'link.docx'));
  const built = await call(space, ['build', '--style', 'terminal', '--out', 'link.docx']);
  assert.deepEqual(
    [built.exit, built.answer.issues?.map(issue => [issue.code, issue.path])],
    [1, [['TARGET_NOT_A_FILE', 'out']]],
  );
  assert.equal(lstatSync(join(space.cwd, 'link.docx')).isSymbolicLink(), true);
  assert.equal(readFileSync(join(space.cwd, 'real.docx'), 'utf8'), 'original');
  const outside = join(mkdtempSync(join(tmpdir(), 'oriko-out-')), 'outside.docx');
  writeFileSync(outside, 'outside');
  symlinkSync(outside, join(space.cwd, 'out.docx'));
  symlinkSync('nowhere.docx', join(space.cwd, 'dangling.docx'));
  for (const name of ['out.docx', 'dangling.docx']) {
    const replaced = await call(space, ['build', '--style', 'terminal', '--out', name]);
    assert.deepEqual(
      [replaced.exit, lstatSync(join(space.cwd, name)).isSymbolicLink()],
      [0, false],
      name,
    );
  }
  assert.deepEqual(
    [readFileSync(outside, 'utf8'), existsSync(join(space.cwd, 'nowhere.docx'))],
    ['outside', false],
  );
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

// adx would write through a link at the photo to a file inside the data folder, so photo set
// refuses it; a link that leads out of it is replaced with --replace, and its target stays.
test('photo set refuses a link inside the data folder and replaces one out of it', async () => {
  const space = workspace();
  const source = tall(space.cwd);
  mkdirSync(join(space.home, 'store'));
  writeFileSync(join(space.home, 'store', 'jane.png'), photo());
  const stored = readFileSync(join(space.home, 'store', 'jane.png'));
  rmSync(join(space.home, 'cvs', 'jane.png'));
  symlinkSync(join(space.home, 'store', 'jane.png'), join(space.home, 'cvs', 'jane.png'));
  const linked = await call(space, ['photo', 'set', '--file', source, '--replace']);
  assert.deepEqual(
    [linked.exit, linked.answer.issues?.map(issue => [issue.code, issue.path])],
    [1, [['TARGET_NOT_A_FILE', 'cv']]],
  );
  assert.deepEqual(
    [
      lstatSync(join(space.home, 'cvs', 'jane.png')).isSymbolicLink(),
      readFileSync(join(space.home, 'store', 'jane.png')),
    ],
    [true, stored],
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
  // A link to a stored file that is no photo would lead the write into that file.
  rmSync(join(space.home, 'cvs', 'jane.png'));
  symlinkSync('../profiles/acme.json', join(space.home, 'cvs', 'jane.png'));
  const acme = readFileSync(join(space.home, 'profiles', 'acme.json'), 'utf8');
  const into = await call(space, ['photo', 'set', '--file', source, '--cv', 'jane', '--replace']);
  assert.deepEqual([into.exit, into.codes], [1, ['TARGET_NOT_A_FILE']]);
  assert.equal(readFileSync(join(space.home, 'profiles', 'acme.json'), 'utf8'), acme);
  // A link that leads nowhere is replaced by the photo.
  rmSync(join(space.home, 'cvs', 'jane.png'));
  symlinkSync('nowhere.png', join(space.home, 'cvs', 'jane.png'));
  const dangling = await call(space, ['photo', 'set', '--file', source, '--replace']);
  assert.deepEqual(
    [dangling.exit, lstatSync(join(space.home, 'cvs', 'jane.png')).isSymbolicLink()],
    [0, false],
  );
  assert.equal(existsSync(join(space.home, 'cvs', 'nowhere.png')), false);
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
  const Shown = z.object({ cv: z.string(), blocks: z.array(z.unknown()) });
  const all = Shown.parse((await call(space, ['show'])).answer.result);
  assert.deepEqual([all.cv, all.blocks.length], ['jane', 15]);
  const one = await call(space, ['show', '--block', 'awards']);
  assert.equal(JSON.stringify(one.answer.result).includes('Team Award'), true);
  // --block has a source, so adx refuses an id the CV lacks before show runs.
  assert.deepEqual((await call(space, ['show', '--block', 'nobody'])).codes, ['NOT_IN_LIST']);
  // A CV that fails its shape is refused below cv, with the command of the shape.
  const master = JSON.parse(readFileSync(join(space.home, 'cvs', 'jane.json'), 'utf8'));
  writeFileSync(join(space.home, 'cvs', 'jane.json'), JSON.stringify({ ...master, pages: 0 }));
  const [broken] = (await call(space, ['show'])).answer.issues ?? [];
  assert.deepEqual(
    [broken?.code, broken?.path, broken?.command],
    ['SCHEMA', 'cv.pages', 'oriko schema master'],
  );
});

test('schema answers the accepted input of a command', async () => {
  const { exit, answer } = await call(workspace(), ['schema', 'block move']);
  assert.equal(exit, 0);
  assert.equal(JSON.stringify(answer.input).includes('"after"'), true);
});

test('every packaged example CV and profile fits and builds', async () => {
  const space = { ...workspace(), home: fileURLToPath(new URL('../../examples', import.meta.url)) };
  const cvs = z
    .object({ items: z.unknown() })
    .parse((await call(space, ['cvs'])).answer.result).items;
  const profiles = z
    .object({ items: z.unknown() })
    .parse((await call(space, ['profiles'])).answer.result).items;
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
    [['init', '--cv', 'erika'], 'SCHEMA'],
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
    [['cvs', '--output', 'pdf'], 'NOT_IN_LIST'],
    [['preview', '--output', 'pdf'], 'NOT_IN_LIST'],
    [['plan', '--home', join(space.cwd, 'missing')], 'ROOT_NOT_FOUND'],
    [['cvs', '--home', 'missing'], 'ROOT_NOT_FOUND'],
    [['cvs', '--home', join(space.cwd, 'empty-home')], 'NO_CV'],
    [['show', '--home', join(space.cwd, 'empty-home')], 'NO_CV'],
    [['show', '--block', 'awards', '--home', join(space.cwd, 'empty-home')], 'NO_CV'],
    [['show', '--home', join(space.cwd, 'badjson-home')], 'STORED_INVALID'],
    [['profiles', '--home', join(space.cwd, 'empty-home')], 'NO_CV'],
    [
      [
        'profile',
        'set',
        '--profile',
        'globex',
        '--order',
        'awards',
        '--home',
        join(space.cwd, 'empty-home'),
      ],
      'NO_CV',
    ],
    [
      [
        'profile',
        'set',
        '--profile',
        'globex',
        '--order',
        'awards',
        '--home',
        join(space.cwd, 'broken-home'),
      ],
      'SCHEMA',
    ],
    [['profile', 'show', '--profile', 'badjson'], 'STORED_INVALID'],
    [['plan', '--home', join(space.cwd, 'broken-home')], 'SCHEMA'],
    [['plan', '--profile', 'nobody'], 'NOT_IN_LIST'],
    [['preview', '--profile', 'nobody'], 'NOT_IN_LIST'],
    [['photo', 'set', '--file', notes, '--profile', '../cv'], 'NOT_IN_LIST'],
    [['init', '--json', NEW_CV], 'SCHEMA'],
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
    result: { option: 'cv', values: [{ value: 'erika' }, { value: 'jane' }] },
  });
  assert.deepEqual(await values(['read', '--profile']), {
    ok: true,
    result: { option: 'profile', taken: ['acme', 'broken'] },
  });
  assert.deepEqual(await values(['init', '--cv']), {
    ok: true,
    result: { option: 'cv', taken: ['erika', 'jane'] },
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
  // The old shell still answers oriko alone, and lists the forms of --output there.
  assert.deepEqual(await values(['--output']), {
    ok: true,
    option: 'output',
    values: ['json', 'text'],
  });
  // The blocks of the stored CV, hidden ones too: the profile acme hides freelance.
  const Blocks = z.object({ values: z.array(z.object({ value: z.string(), does: z.string() })) });
  const blocks = Blocks.parse((await values(['show', '--cv', 'jane', '--block'])).result).values;
  assert.deepEqual(
    [blocks.length, blocks[0], blocks.at(-1)],
    [
      15,
      { value: 'northwind', does: 'job in Professional Experience: Senior Backend Engineer' },
      { value: 'awards', does: 'entries in Awards' },
    ],
  );
  const profiled = Blocks.parse((await values(['show', '--profile', 'acme', '--block'])).result);
  assert.deepEqual(profiled.values, blocks);
  assert.deepEqual((await values(['show', '--cv', 'erika', '--block'])).result, {
    option: 'block',
    values: [],
  });
});

// A free value, such as a path or a JSON input, has no list; the refusal names the option.
test('an option without a value and without a list is refused by its name', async () => {
  const space = workspace();
  const cases: [string[], string][] = [
    [['build', '--out'], 'out'],
    [['plan', '--home'], 'home'],
    [['block', 'add', '--json'], 'json'],
    [['profile', 'set', '--profile', 'globex', '--json'], 'json'],
    // schema runs on the old shell, which refuses the option by its name as well.
    [['schema', '--home'], 'home'],
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
    [['schema', '--output', 'pdf'], 'UNKNOWN_OUTPUT', 'oriko --output'],
    [['paint'], 'UNKNOWN_COMMAND', 'oriko schema'],
    [['schema', '--color'], 'UNKNOWN_OPTION', 'oriko schema'],
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
    [['show'], 'CV_REQUIRED', `oriko show --home ${space.home} --cv`],
    [['show', '--cv', 'nobody'], 'NOT_IN_LIST', `oriko show --home ${space.home} --cv`],
    [
      ['read', '--posting', 'job.pdf'],
      'MISSING_OPTION',
      `oriko read --posting job.pdf --home ${space.home} --profile`,
    ],
    [
      ['show', '--cv', 'jane', '--block', 'nobody'],
      'NOT_IN_LIST',
      `oriko show --cv jane --home ${space.home} --block`,
    ],
    [['show', '--block'], 'CV_REQUIRED', `oriko show --home ${space.home} --cv`],
    [['cvs', '--output', 'pdf'], 'NOT_IN_LIST', `oriko --output`],
    [['cvs', '--color'], 'UNKNOWN_OPTION', 'oriko schema cvs'],
    [['init', '--json', NEW_CV], 'SCHEMA', 'oriko schema init'],
    [
      ['init', '--cv', 'jane', '--json', NEW_CV],
      'CV_EXISTS',
      `oriko init --language de --first-name Erika --last-name Muster --role Entwicklerin --home ${space.home} --cv`,
    ],
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
    [
      ['profile', 'set', '--profile', 'globex', '--order', 'awards'],
      'CV_REQUIRED',
      `oriko profile set --profile globex --order awards --home ${space.home} --cv`,
    ],
    [
      ['profile', 'set', '--profile', 'globex', '--cv', 'nobody'],
      'NOT_IN_LIST',
      `oriko profile set --profile globex --home ${space.home} --cv`,
    ],
    [
      ['profile', 'set', '--profile', 'acme', '--cv', 'jane'],
      'ALREADY_EXISTS',
      `oriko profile set --profile acme --cv jane --home ${space.home} --replace --dry-run`,
    ],
    [['profile', 'set', '--profile', 'globex'], 'NOTHING_TO_STORE', 'oriko schema profile set'],
    [
      ['profile', 'set', '--profile', 'globex', '--json'],
      'MISSING_VALUE',
      'oriko schema profile set',
    ],
    [['profile', 'set', '--json', '{"cv":"jane"}'], 'SCHEMA', 'oriko schema profile set'],
    [
      ['profile', 'show', '--profile', 'nobody'],
      'NOT_IN_LIST',
      `oriko profile show --home ${space.home} --profile`,
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

// NO_CV, UNKNOWN_CV and UNKNOWN_BLOCK lie in core/ and every command raises them; their
// commands lie in cv/: init creates a CV, cvs lists the CVs, show lists the block ids.
test('a missing CV, an unknown CV and an unknown block name init, cvs and show', async () => {
  const space = workspace();
  const empty = join(space.cwd, 'empty-home');
  mkdirSync(empty);
  const picture = tall(space.cwd);
  writeFileSync(join(space.home, 'profiles', 'ghost.json'), JSON.stringify({ cv: 'ghost' }));
  const home = ` --home ${space.home}`;
  const blocksOfJane = `oriko show --cv jane${home} --block`;
  const cases: [string[], string, string, string][] = [
    [['plan'], 'NO_CV', '', `oriko init --home ${empty}`],
    [['preview'], 'NO_CV', '', `oriko init --home ${empty}`],
    [['build', '--out', 'cv.docx'], 'NO_CV', '', `oriko init --home ${empty}`],
    [['cvs'], 'NO_CV', '', `oriko init --home ${empty}`],
    [['show'], 'NO_CV', '', `oriko init --home ${empty}`],
    [['profiles'], 'NO_CV', '', `oriko init --home ${empty}`],
    [
      ['profile', 'set', '--profile', 'globex', '--order', 'awards'],
      'NO_CV',
      '',
      `oriko init --home ${empty}`,
    ],
    [['block', 'remove', '--json', '{"id":"awards"}'], 'NO_CV', '', `oriko init --home ${empty}`],
    [['photo', 'set', '--file', picture], 'NO_CV', '', `oriko init --home ${empty}`],
    [['plan', '--profile', 'ghost'], 'UNKNOWN_CV', 'profile.cv', `oriko cvs${home}`],
    [['preview', '--profile', 'ghost'], 'UNKNOWN_CV', 'profile.cv', `oriko cvs${home}`],
    [
      ['build', '--profile', 'ghost', '--out', 'g.docx'],
      'UNKNOWN_CV',
      'profile.cv',
      `oriko cvs${home}`,
    ],
    [['show', '--profile', 'ghost'], 'UNKNOWN_CV', 'profile.cv', `oriko cvs${home}`],
    [
      ['plan', '--profile', 'broken'],
      'UNKNOWN_BLOCK',
      'profile.blocks.nobody',
      `oriko show --profile broken${home} --block`,
    ],
    [
      ['preview', '--profile', 'broken'],
      'UNKNOWN_BLOCK',
      'profile.blocks.nobody',
      `oriko show --profile broken${home} --block`,
    ],
    [
      ['build', '--cv', 'jane', '--profile', 'broken', '--out', 'b.docx'],
      'UNKNOWN_BLOCK',
      'profile.blocks.nobody',
      `oriko show --cv jane --profile broken${home} --block`,
    ],
    [
      ['block', 'remove', '--cv', 'jane', '--json', '{"id":"nobody"}'],
      'UNKNOWN_BLOCK',
      'id',
      blocksOfJane,
    ],
    [
      ['item', 'add', '--cv', 'jane', '--json', '{"block":"nobody","value":"Go"}'],
      'UNKNOWN_BLOCK',
      'block',
      blocksOfJane,
    ],
    // A profile that is not stored yet stays out of the command, which then lists the CV's blocks.
    [
      ['profile', 'set', '--profile', 'globex', '--json', '{"cv":"jane","blocks":{"nobody":{}}}'],
      'UNKNOWN_BLOCK',
      'blocks.nobody',
      blocksOfJane,
    ],
    [
      [
        'profile',
        'set',
        '--profile',
        'acme',
        '--replace',
        '--json',
        '{"cv":"jane","order":["nobody"]}',
      ],
      'UNKNOWN_BLOCK',
      'order.0',
      `oriko show --cv jane --profile acme${home} --block`,
    ],
  ];
  for (const [argv, code, path, command] of cases) {
    const at = path === '' ? empty : space.home;
    const [issue] = (await call(space, [...argv, '--home', at])).answer.issues ?? [];
    assert.deepEqual(
      [issue?.code, issue?.path ?? '', issue?.command],
      [code, path, command],
      argv.join(' '),
    );
    if (code === 'NO_CV') continue;
    assert.equal((await call(space, command.split(' ').slice(1))).answer.ok, true, command);
  }
  // The step of NO_CV takes the fields of a new CV.
  const created = await call(space, ['init', '--home', empty, '--cv', 'erika', '--json', NEW_CV]);
  assert.equal(created.exit, 0);
  // A stored profile of another CV stays out of the command, which lists the blocks of the CV
  // the refused call named.
  await call(space, ['init', '--cv', 'erika', '--json', NEW_CV]);
  const blocksOfErika = `oriko show --cv erika${home} --block`;
  for (const argv of [
    ['profile', 'set', '--profile', 'acme', '--json', '{"cv":"erika","blocks":{"nobody":{}}}'],
    ['profile', 'set', '--profile', 'acme', '--cv', 'erika', '--order', 'nobody', '--replace'],
  ]) {
    const [issue] = (await call(space, [...argv, '--home', space.home])).answer.issues ?? [];
    assert.deepEqual(
      [issue?.code, issue?.command],
      ['UNKNOWN_BLOCK', blocksOfErika],
      argv.join(' '),
    );
  }
  const listed = await call(space, blocksOfErika.split(' ').slice(1));
  assert.deepEqual(listed.answer.result, { option: 'block', values: [] });
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
    [
      ['init'],
      [
        ['SCHEMA', 'cv'],
        ['SCHEMA', 'language'],
        ['SCHEMA', 'firstName'],
        ['SCHEMA', 'lastName'],
        ['SCHEMA', 'role'],
      ],
    ],
    // An unknown option stops the call before its checks name the missing profile.
    [['read', '--posting', 'job.pdf', '--out', 'x.docx'], [['UNKNOWN_OPTION', 'out']]],
    [['cvs', 'extra'], [['UNEXPECTED_ARGUMENT', 'extra']]],
    [['photo', 'set', '--file', 'a.png', 'b.png'], [['UNEXPECTED_ARGUMENT', 'b.png']]],
    [['schema', '--out', 'x.docx'], [['OPTION_NOT_ALLOWED', 'out']]],
    [['cvs', '--out', 'x.docx'], [['UNKNOWN_OPTION', 'out']]],
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
    // --cv lists its values, so the second option without a value is the one refused.
    [['read', '--cv', '--profile'], [['MISSING_VALUE', 'profile']]],
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
  const notAllowed = (await call(space, ['schema', '--out', 'x.docx'])).answer.issues?.[0];
  assert.equal(notAllowed?.command, 'oriko schema schema');
  // The old shell shows a refusal at a terminal as one line per issue.
  const shown = await terminal(space, ['schema', 'nope']);
  assert.match(
    shown,
    /\n- UNKNOWN_COMMAND at name: "No command or shape is called nope"\. .* Command: oriko schema\n$/,
  );
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
    // The old shell, which answers oriko alone, checks the data folder itself.
    [['--home', join(space.cwd, 'notes.txt')], 'NOT_A_FOLDER', 'home'],
    [['--home', join(space.cwd, 'flat')], 'PATH_REFUSED', 'home'],
    [['show', '--home', join(space.cwd, 'notes.txt')], 'ROOT_NOT_FOUND', undefined],
    [['show', '--home', join(space.cwd, 'notes.txt', 'x')], 'ROOT_NOT_FOUND', undefined],
    // adx lists regular files only, so a file cvs, a folder or a pipe at a CV holds no CV.
    [['cvs', '--home', join(space.cwd, 'flat')], 'NO_CV', undefined],
    [['show', '--home', join(space.cwd, 'nested')], 'NO_CV', undefined],
    [['photo', 'set', '--file', space.cwd], 'PICTURE_NOT_A_FILE', 'file'],
    [['photo', 'set', '--file', join(space.cwd, 'huge.png')], 'PICTURE_TOO_LARGE', 'file'],
    [['photo', 'set', '--file', join(space.cwd, 'pipe.png')], 'PICTURE_NOT_A_FILE', 'file'],
    [['show', '--home', join(space.cwd, 'piped')], 'NO_CV', undefined],
    [['build', '--profile', 'piped', '--out', 'p.docx', '--dry-run'], 'NOT_A_FILE', undefined],
    [['photo', 'set', '--file', join(space.cwd, 'locked.png')], 'PATH_REFUSED', 'file'],
    [['photo', 'set', '--file', join(space.cwd, 'notes.txt', 'x.png')], 'PATH_REFUSED', 'file'],
    [['photo', 'set', '--file', join(space.cwd, `${'a'.repeat(300)}.png`)], 'PATH_REFUSED', 'file'],
    [
      ['show', '--profile', 'acme', '--home', join(space.cwd, 'nowhere')],
      'ROOT_NOT_FOUND',
      undefined,
    ],
    [['show', '--profile', 'ghost'], 'UNKNOWN_CV', 'profile.cv'],
    [['plan', '--home', join(space.cwd, 'notes.txt')], 'ROOT_NOT_FOUND', undefined],
    [['plan', '--profile', 'ghost'], 'UNKNOWN_CV', 'profile.cv'],
    [['build', '--out', 'notes.txt/x.docx', '--dry-run'], 'NOT_A_FOLDER', 'out'],
    [['build', '--out', 'd.docx', '--dry-run'], 'NOT_A_FILE', 'out'],
    [['build', '--out', 'sealed/x.docx'], 'SYSTEM_REFUSED', undefined],
    [['build', '--out', 'loop.docx', '--dry-run'], 'SYSTEM_REFUSED', undefined],
    [
      ['init', '--cv', 'erika', '--json', NEW_CV, '--home', join(space.cwd, 'sealed-home')],
      'SYSTEM_REFUSED',
      undefined,
    ],
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

// One source answers both the list of --cv and the check of its value, so the list holds every
// CV, the one the profile names among them.
test('a profile decides the CV for show, and the list of CVs holds every CV', async () => {
  const space = workspace();
  await call(space, ['init', '--cv', 'erika', '--json', NEW_CV]);
  const shown = z.object({ cv: z.string() }).loose();
  assert.equal(
    shown.parse((await call(space, ['show', '--profile', 'acme'])).answer.result).cv,
    'jane',
  );
  assert.deepEqual((await call(space, ['show', '--profile', 'acme', '--cv'])).answer.result, {
    option: 'cv',
    values: [{ value: 'erika' }, { value: 'jane' }],
  });
  // With --cv, the list of --profile holds only the profiles that may go with that CV.
  assert.deepEqual((await call(space, ['show', '--profile', 'acme', '--cv', 'erika'])).codes, [
    'NOT_IN_LIST',
  ]);
  assert.deepEqual((await call(space, ['show', '--cv', 'erika', '--profile'])).answer.result, {
    option: 'profile',
    values: [{ value: 'broken' }],
  });
  // A profile that holds no JSON names no CV here, so show takes the CV of --cv.
  writeFileSync(join(space.home, 'profiles', 'badjson.json'), '{');
  const named = await call(space, ['show', '--profile', 'badjson', '--cv', 'erika']);
  assert.equal(shown.parse(named.answer.result).cv, 'erika');
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
  // adx refuses a link out of its root at the placeholder, and init never replaces a file it
  // finds at the CV, a link there included.
  symlinkSync(victim, join(space.home, 'placeholder.png'));
  const outside = await call(space, ['init', '--cv', 'erika', '--json', NEW_CV]);
  assert.deepEqual([outside.exit, outside.codes], [1, ['PATH_OUTSIDE']]);
  rmSync(join(space.home, 'placeholder.png'));
  symlinkSync(victim, join(space.home, 'cvs', 'eva.json'));
  const linked = await call(space, ['init', '--cv', 'eva', '--json', NEW_CV]);
  assert.deepEqual([linked.exit, linked.codes], [1, ['ALREADY_EXISTS']]);
  assert.equal(readFileSync(victim, 'utf8'), 'untouched');
  assert.equal(existsSync(join(space.home, 'placeholder.png')), false);
  rmSync(join(space.home, 'cvs', 'eva.json'));
  // An edit runs on adx, which stages under a name of its own beside the CV and leaves no
  // file behind; a CV that is a link out of the data folder is no CV adx lists, so the edit
  // never reaches the link's target.
  const cvs = join(space.home, 'cvs');
  const input = JSON.stringify({ id: 'awards' });
  assert.equal((await call(space, ['block', 'remove', '--cv', 'jane', '--json', input])).exit, 0);
  assert.deepEqual(readdirSync(cvs).sort(), ['jane.json', 'jane.png']);
  const moved = join(space.cwd, 'jane.json');
  renameSync(join(cvs, 'jane.json'), moved);
  symlinkSync(moved, join(cvs, 'jane.json'));
  const before = readFileSync(moved, 'utf8');
  const edited = await call(space, [
    'block',
    'remove',
    '--cv',
    'jane',
    '--json',
    '{"id":"campus"}',
  ]);
  assert.deepEqual([edited.codes, readFileSync(moved, 'utf8')], [['NOT_IN_LIST'], before]);
});

// A command that writes several files writes all of them or none: here the CV file cannot be
// written, so the placeholder is not left behind either.
test('a refused write leaves none of the files of the command', async () => {
  const space = workspace();
  mkdirSync(join(space.home, 'cvs', 'erika.json'));
  const { exit, codes } = await call(space, ['init', '--cv', 'erika', '--json', NEW_CV]);
  assert.deepEqual(
    [exit, codes, existsSync(join(space.home, 'placeholder.png'))],
    [1, ['NOT_A_FILE'], false],
  );
});

// adx writes through a link at its target to a file inside the data folder, so init refuses such
// a link at the CV; adx refuses every other link and a folder itself. The placeholder is written
// only when nothing stands there, so a link at it is never written through.
test('init refuses a link or a folder at the CV, and writes no placeholder through a link', async () => {
  const space = workspace();
  const cvs = join(space.home, 'cvs');
  symlinkSync('jane.json', join(cvs, 'linked.json'));
  symlinkSync('missing.json', join(cvs, 'nowhere.json'));
  writeFileSync(join(space.cwd, 'outside.json'), '{}');
  symlinkSync(join(space.cwd, 'outside.json'), join(cvs, 'out.json'));
  mkdirSync(join(cvs, 'folder.json'));
  const cases: [string, string, string | undefined][] = [
    ['linked', 'TARGET_NOT_A_FILE', 'cv'],
    ['nowhere', 'ALREADY_EXISTS', undefined],
    ['out', 'ALREADY_EXISTS', undefined],
    ['folder', 'NOT_A_FILE', undefined],
  ];
  for (const [cv, code, path] of cases) {
    for (const dryRun of [[], ['--dry-run']]) {
      const { exit, answer } = await call(space, ['init', '--cv', cv, '--json', NEW_CV, ...dryRun]);
      const [issue] = answer.issues ?? [];
      assert.deepEqual([exit, issue?.code, issue?.path], [1, code, path], `${cv} ${dryRun}`);
    }
  }
  assert.equal(readFileSync(join(space.cwd, 'outside.json'), 'utf8'), '{}');
  assert.equal(lstatSync(join(cvs, 'linked.json')).isSymbolicLink(), true);
  // A link to a file with the bytes of the new CV would let adx write nothing and answer ok.
  assert.equal((await call(space, ['init', '--cv', 'erika', '--json', NEW_CV])).exit, 0);
  symlinkSync('erika.json', join(cvs, 'same.json'));
  assert.deepEqual((await call(space, ['init', '--cv', 'same', '--json', NEW_CV])).codes, [
    'TARGET_NOT_A_FILE',
  ]);
  // A placeholder that stands as a link to a file inside the data folder is kept and named.
  const linkedHome = mkdtempSync(join(tmpdir(), 'oriko-home-'));
  mkdirSync(join(linkedHome, 'cvs'));
  writeFileSync(join(linkedHome, 'mine.png'), photo());
  symlinkSync('mine.png', join(linkedHome, 'placeholder.png'));
  const kept = await call(space, ['init', '--cv', 'eva', '--json', NEW_CV, '--home', linkedHome]);
  assert.deepEqual(kept.answer.result, {
    cv: { file: 'cvs/eva.json', bytes: 243, replaces: false },
    photo: 'placeholder.png',
  });
  assert.deepEqual(readFileSync(join(linkedHome, 'mine.png')), photo());
  // A link that leads nowhere and a folder at the placeholder adx refuses, before any write.
  const nowhere = mkdtempSync(join(tmpdir(), 'oriko-home-'));
  symlinkSync('missing.png', join(nowhere, 'placeholder.png'));
  const folder = mkdtempSync(join(tmpdir(), 'oriko-home-'));
  mkdirSync(join(folder, 'placeholder.png'));
  for (const [at, code] of [
    [nowhere, 'ALREADY_EXISTS'],
    [folder, 'NOT_A_FILE'],
  ]) {
    const { codes } = await call(space, ['init', '--cv', 'eva', '--json', NEW_CV, '--home', at]);
    assert.deepEqual([codes, existsSync(join(at, 'cvs'))], [[code], false], at);
  }
});

const PAGE = '<!doctype html><html><body><h1>Senior Go Engineer</h1><p>Berlin</p></body></html>';

// read on adx reaches the network through NODE_WEB, so a test replaces its two calls with a fake.
const reading = (t: TestContext, pages: Record<string, Page> = {}) => {
  const { web, requests } = fakeWeb(
    { 'jobs.example': ['93.184.216.34'], 'intranet.example': ['10.0.0.5'] },
    { 'https://jobs.example/1': { status: 200, body: PAGE }, ...pages },
  );
  t.mock.method(NODE_WEB, 'lookup', web.lookup);
  t.mock.method(NODE_WEB, 'get', web.get);
  return { ...workspace(), requests };
};

const stored = (space: Space, ...path: string[]) => {
  const file = join(space.home, ...path);
  return existsSync(file) ? readFileSync(file, 'utf8') : null;
};

const Read = z.object({
  read: z.array(z.looseObject({ role: z.string(), source: z.string() })),
  posting: z.unknown().optional(),
  notes: z.unknown().optional(),
});

// A source is named by its absolute path: adx's test kit leaves the working directory as it is.
test('read stores a posting from a file or an https address beside its profile', async t => {
  const space = reading(t);
  const job = join(space.cwd, 'job.pdf');
  writeFileSync(job, pdf('Senior Go Engineer'));
  const fromFile = await call(space, ['read', '--profile', 'acme', '--posting', job]);
  assert.deepEqual(
    [fromFile.exit, fromFile.answer.applied, fromFile.answer.result],
    [
      0,
      true,
      {
        read: [
          {
            role: 'posting',
            source: job,
            kind: 'pdf',
            chars: 18,
            replaced: 0,
            stored: 'profiles/acme.posting.md',
            text: 'Senior Go Engineer',
          },
        ],
        profile: 'acme',
        posting: { file: 'profiles/acme.posting.md', bytes: 49 + job.length, replaces: false },
      },
    ],
  );
  assert.equal(
    stored(space, 'profiles', 'acme.posting.md'),
    `---\nsource: "${job}"\nkind: pdf\n---\n\nSenior Go Engineer\n`,
  );
  assert.equal(statSync(join(space.home, 'profiles', 'acme.posting.md')).mode & 0o777, 0o600);
  // A dry run of a download sends its request as the real run does, and stores nothing.
  const link = 'https://jobs.example/1';
  const dry = await call(space, ['read', '--profile', 'globex', '--posting', link, '--dry-run']);
  assert.deepEqual(
    [dry.exit, stored(space, 'profiles', 'globex.posting.md'), space.requests.length],
    [0, null, 1],
  );
  const fromWeb = await call(space, ['read', '--profile', 'globex', '--posting', link]);
  assert.deepEqual(
    [fromWeb.exit, stored(space, 'profiles', 'globex.posting.md'), space.requests],
    [
      0,
      `---\nsource: "${link}"\nkind: html\n---\n\n# Senior Go Engineer\n\nBerlin\n`,
      [
        { address: '93.184.216.34', url: link },
        { address: '93.184.216.34', url: link },
      ],
    ],
  );
});

test('read appends notes beside the CV, and answers an old CV without storing it', async t => {
  const space = reading(t);
  const [a, b, old] = ['a.md', 'b.txt', 'old.docx'].map(name => join(space.cwd, name));
  writeFileSync(a, 'Led the move to Go');
  writeFileSync(b, 'Mentored four engineers');
  writeFileSync(old, await docx(['Jane Doe', 'Engineer']));
  const notes = join(space.home, 'cvs', 'jane.notes.md');
  const first = await call(space, ['read', '--notes', a, '--notes', b]);
  assert.deepEqual(Read.parse(first.answer.result).notes, {
    file: 'cvs/jane.notes.md',
    bytes: statSync(notes).size,
    replaces: false,
  });
  const again = await call(space, ['read', '--notes', a]);
  assert.deepEqual(Read.parse(again.answer.result).notes, {
    file: 'cvs/jane.notes.md',
    bytes: statSync(notes).size,
    replaces: true,
    changes: {
      added: [`## ${a}`, '', 'Led the move to Go', ''],
      changed: [],
      removed: [],
      more: 0,
    },
  });
  assert.equal(
    stored(space, 'cvs', 'jane.notes.md'),
    `## ${a}\n\nLed the move to Go\n\n## ${b}\n\nMentored four engineers\n\n## ${a}\n\nLed the move to Go\n`,
  );
  const before = [readdirSync(join(space.home, 'cvs')), readdirSync(join(space.home, 'profiles'))];
  const resume = await call(space, ['read', '--resume', old]);
  assert.deepEqual(resume.answer.result, {
    read: [
      {
        role: 'resume',
        source: old,
        kind: 'docx',
        chars: 17,
        replaced: 0,
        text: 'Jane Doe\nEngineer',
      },
    ],
  });
  assert.deepEqual(
    [readdirSync(join(space.home, 'cvs')), readdirSync(join(space.home, 'profiles'))],
    before,
  );
});

// Notes go to the CV the profile names, as for every command that takes both.
test('read picks the CV its notes belong to, and refuses a call that names no CV of them', async t => {
  const space = reading(t);
  const a = join(space.cwd, 'a.md');
  writeFileSync(a, 'Led the move to Go');
  writeFileSync(join(space.home, 'profiles', 'ghost.json'), JSON.stringify({ cv: 'ghost' }));
  // A profile that cannot be read names no CV, so the notes go to the only one.
  writeFileSync(join(space.home, 'profiles', 'badjson.json'), '{');
  writeFileSync(join(space.home, 'profiles', 'big.json'), ' '.repeat(1_000_001));
  for (const profile of ['badjson', 'big'])
    assert.equal((await call(space, ['read', '--notes', a, '--profile', profile])).exit, 0);
  await call(space, ['init', '--cv', 'erika', '--json', NEW_CV]);
  const toErika = await call(space, ['read', '--notes', a, '--cv', 'erika']);
  assert.equal(Read.parse(toErika.answer.result).notes !== undefined, true);
  const empty = join(space.cwd, 'empty-home');
  mkdirSync(empty);
  const cases: [string[], string, string | undefined][] = [
    [['read', '--notes', a], 'CV_REQUIRED', 'cv'],
    [['read', '--notes', a, '--cv', 'nobody'], 'NOT_IN_LIST', 'cv'],
    [['read', '--notes', a, '--profile', 'ghost'], 'UNKNOWN_CV', 'profile.cv'],
    [['read', '--notes', a, '--cv', 'erika', '--profile', 'acme'], 'CV_MISMATCH', 'cv'],
    [['read', '--notes', a, '--home', empty], 'NO_CV', undefined],
    [['read', '--posting'], 'MISSING_VALUE', 'posting'],
    [['read', 'extra'], 'UNEXPECTED_ARGUMENT', 'extra'],
    [['read', '--home', 'a.md'], 'ROOT_NOT_FOUND', undefined],
  ];
  for (const [argv, code, path] of cases) {
    const [issue] = (await call(space, argv)).answer.issues ?? [];
    assert.deepEqual([issue?.code, issue?.path], [code, path], argv.join(' '));
  }
  // For notes a profile is picked by its name among the stored ones, an id or not; any other name
  // is read nowhere, inside the data folder or out of it.
  const erika = JSON.stringify({ cv: 'erika' });
  writeFileSync(join(space.home, 'profiles', 'Big_Job.json'), erika);
  writeFileSync(join(space.home, 'x.json'), erika);
  mkdirSync(join(space.home, 'profiles', 'a'));
  writeFileSync(join(space.home, 'profiles', 'a', 'b.json'), erika);
  writeFileSync(join(space.cwd, 'abs.json'), erika);
  const picked = await call(space, ['read', '--notes', a, '--profile', 'Big_Job', '--dry-run']);
  assert.equal(z.object({ cv: z.string() }).loose().parse(picked.answer.result).cv, 'erika');
  for (const name of ['../x', 'a/b', join(space.cwd, 'abs'), ''])
    assert.deepEqual(
      (await call(space, ['read', '--notes', a, '--json', JSON.stringify({ profile: name })]))
        .codes,
      ['CV_REQUIRED'],
      name,
    );
  // Beside --posting the name becomes the file of the posting, so it must be an id.
  for (const name of ['Big_Job', '../x', 'a/b', ''])
    assert.deepEqual(
      (
        await call(space, ['read', '--posting', a, '--json', JSON.stringify({ profile: name })])
      ).answer.issues?.map(issue => [issue.code, issue.path]),
      [['SCHEMA', 'profile']],
      name,
    );
  assert.deepEqual(readdirSync(join(space.home, 'profiles')).sort(), [
    'Big_Job.json',
    'a',
    'acme.json',
    'badjson.json',
    'big.json',
    'broken.json',
    'ghost.json',
  ]);
  // One source answers both the list of --cv and the check of its value, so it lists every CV.
  assert.deepEqual((await call(space, ['read', '--profile', 'acme', '--cv'])).answer.result, {
    option: 'cv',
    values: [{ value: 'erika' }, { value: 'jane' }],
  });
  // --profile may name a new profile, so it lists the names taken.
  assert.deepEqual((await call(space, ['read', '--profile'])).answer.result, {
    option: 'profile',
    taken: ['Big_Job', 'acme', 'badjson', 'big', 'broken', 'ghost'],
  });
});

// One answer names every issue of every input, and a refused call stores nothing at all.
test('read refuses with every issue of every input, and then stores nothing', async t => {
  const space = reading(t, {
    'https://jobs.example/gone': { status: 404 },
    'https://jobs.example/busy': { status: 503 },
  });
  const at = (name: string) => join(space.cwd, name);
  writeFileSync(at('job.pdf'), pdf('Senior Go Engineer'));
  writeFileSync(at('scan.pdf'), pdf());
  writeFileSync(at('image.png'), photo());
  writeFileSync(at('a.md'), 'Led the move to Go');
  writeFileSync(at('huge.txt'), Buffer.alloc(10_000_001, 'a'));
  writeFileSync(at('locked.md'), 'no one may read this', { mode: 0o000 });
  mkdirSync(at('empty'));
  const posting = ['read', '--profile', 'acme', '--posting'];
  const cases: [string[], string[], string][] = [
    [['read'], ['NOTHING_TO_READ'], 'fix'],
    [['read', '--posting', at('job.pdf')], ['MISSING_OPTION'], 'fix'],
    [['read', '--profile', '../acme', '--posting', at('job.pdf')], ['SCHEMA'], 'fix'],
    [
      [...posting, at('scan.pdf'), '--notes', at('a.md'), '--notes', at('image.png')],
      ['NO_TEXT', 'UNSUPPORTED_KIND'],
      'fix',
    ],
    [[...posting, 'http://jobs.example/1'], ['ADDRESS_NOT_ALLOWED'], 'fix'],
    [[...posting, 'https://intranet.example/1'], ['PRIVATE_ADDRESS'], 'fix'],
    [[...posting, 'https://jobs.example/gone'], ['HTTP_STATUS'], 'fix'],
    [[...posting, 'https://jobs.example/busy'], ['SITE_BUSY'], 'retry'],
    [[...posting, 'https://nowhere.example/1'], ['DOWNLOAD_FAILED'], 'retry'],
    [[...posting, at('missing.pdf')], ['SOURCE_NOT_FOUND'], 'fix'],
    [[...posting, at('empty')], ['SOURCE_NOT_A_FILE'], 'fix'],
    [[...posting, at('huge.txt')], ['SOURCE_TOO_LARGE'], 'fix'],
    [[...posting, at('locked.md')], ['PATH_REFUSED'], 'fix'],
    [
      ['read', '--notes', at('missing.md'), '--home', at('empty')],
      ['NO_CV', 'SOURCE_NOT_FOUND'],
      'fix',
    ],
  ];
  for (const [argv, expected, kind] of cases) {
    const { exit, codes, answer } = await call(space, argv);
    assert.deepEqual([exit, codes, answer.kind], [1, expected, kind], argv.join(' '));
  }
  assert.deepEqual(
    [stored(space, 'profiles', 'acme.posting.md'), stored(space, 'cvs', 'jane.notes.md')],
    [null, null],
  );
  // Each issue stands at the option that named its source, its message headed by the source.
  const [refused] = (await call(space, [...posting, 'http://jobs.example/1'])).answer.issues ?? [];
  assert.deepEqual(
    [refused?.path, refused?.message],
    ['posting', '"http://jobs.example/1": The address "http://jobs.example/1" uses no https'],
  );
  const [missing] = (await call(space, ['read'])).answer.issues ?? [];
  assert.equal(missing?.command, 'oriko schema read');
});

// A posting is replaced only on request; the same text again is no change, and a dry run writes nothing.
test('read keeps a stored posting unless --replace is given', async t => {
  const space = reading(t);
  const [job, other] = [join(space.cwd, 'job.pdf'), join(space.cwd, 'new.txt')];
  writeFileSync(job, pdf('Senior Go Engineer'));
  writeFileSync(other, 'Staff Go Engineer');
  const posting = ['read', '--profile', 'acme', '--posting'];
  const Posting = z.object({ posting: z.object({ unchanged: z.boolean().optional() }) });
  assert.equal((await call(space, [...posting, job])).exit, 0);
  const same = await call(space, [...posting, job]);
  assert.equal(Posting.parse(same.answer.result).posting.unchanged, true);
  const [taken] = (await call(space, [...posting, other])).answer.issues ?? [];
  assert.deepEqual(
    [taken?.code, taken?.command],
    [
      'ALREADY_EXISTS',
      `oriko read --posting ${other} --profile acme --home ${space.home} --replace --dry-run`,
    ],
  );
  assert.equal((await call(space, [...posting, other, '--replace', '--dry-run'])).exit, 0);
  assert.match(stored(space, 'profiles', 'acme.posting.md') ?? '', /Senior Go Engineer/);
  assert.equal((await call(space, [...posting, other, '--replace'])).exit, 0);
  assert.match(stored(space, 'profiles', 'acme.posting.md') ?? '', /Staff Go Engineer/);
});

// adx writes through a link at its target to a file inside the data folder, so read refuses such
// a link at the posting and at the notes; adx refuses or replaces every other link and a folder.
test('read refuses a link to a stored file at the posting or the notes, and writes neither', async t => {
  const space = reading(t);
  const a = join(space.cwd, 'a.md');
  writeFileSync(a, 'Led the move to Go');
  const outside = join(space.cwd, 'outside.md');
  writeFileSync(outside, 'untouched');
  const profiles = join(space.home, 'profiles');
  symlinkSync('acme.json', join(profiles, 'linked.posting.md'));
  symlinkSync('missing.md', join(profiles, 'nowhere.posting.md'));
  symlinkSync(outside, join(profiles, 'out.posting.md'));
  mkdirSync(join(profiles, 'folder.posting.md'));
  const posting = (profile: string, ...flags: string[]) => [
    'read',
    '--posting',
    a,
    '--profile',
    profile,
    ...flags,
  ];
  const cases: [string[], string, string | undefined][] = [
    [posting('linked'), 'TARGET_NOT_A_FILE', 'profile'],
    [posting('linked', '--replace'), 'TARGET_NOT_A_FILE', 'profile'],
    [posting('nowhere'), 'ALREADY_EXISTS', undefined],
    [posting('out'), 'ALREADY_EXISTS', undefined],
    [posting('folder', '--replace'), 'NOT_A_FILE', undefined],
    // The notes are refused too, so the posting of the same call is not written either.
    [[...posting('globex'), '--notes', a], 'TARGET_NOT_A_FILE', 'cv'],
  ];
  symlinkSync('jane.json', join(space.home, 'cvs', 'jane.notes.md'));
  for (const [argv, code, path] of cases) {
    const { exit, answer } = await call(space, argv);
    const [issue] = answer.issues ?? [];
    assert.deepEqual([exit, issue?.code, issue?.path], [1, code, path], argv.join(' '));
  }
  assert.equal(existsSync(join(profiles, 'globex.posting.md')), false);
  // A link that leads nowhere or out of the data folder is replaced with --replace, never followed.
  for (const profile of ['nowhere', 'out'])
    assert.equal((await call(space, posting(profile, '--replace'))).exit, 0, profile);
  assert.deepEqual(
    [
      lstatSync(join(profiles, 'out.posting.md')).isFile(),
      readFileSync(outside, 'utf8'),
      existsSync(join(profiles, 'missing.md')),
      lstatSync(join(space.home, 'cvs', 'jane.notes.md')).isSymbolicLink(),
    ],
    [true, 'untouched', false, true],
  );
  // Notes behind a link out of the data folder are adx's PATH_OUTSIDE, before any write.
  rmSync(join(space.home, 'cvs', 'jane.notes.md'));
  symlinkSync(outside, join(space.home, 'cvs', 'jane.notes.md'));
  assert.deepEqual((await call(space, ['read', '--notes', a])).codes, ['PATH_OUTSIDE']);
  assert.equal(readFileSync(outside, 'utf8'), 'untouched');
});

// The notes of a CV stay within the size of a read file, as each source does.
test('read refuses notes that would grow past the limit of a read file', async t => {
  const space = reading(t);
  const a = join(space.cwd, 'a.md');
  writeFileSync(a, 'Led the move to Go');
  const notes = join(space.home, 'cvs', 'jane.notes.md');
  writeFileSync(notes, `${'a'.repeat(9_999_990)}\n`);
  const { codes, answer } = await call(space, ['read', '--notes', a]);
  assert.deepEqual([codes, answer.issues?.[0]?.path], [['SOURCE_TOO_LARGE'], 'notes']);
  assert.equal(statSync(notes).size, 9_999_991);
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
    [created.exit, created.answer.applied, created.answer.result],
    [
      0,
      true,
      {
        name: 'globex',
        file: 'profiles/globex.json',
        bytes: 81,
        replaces: false,
        changes: { added: ['blocks.campus', 'cv'], changed: [], removed: [], more: 0 },
        cv: 'jane',
        fits: true,
        layout: [],
      },
    ],
  );
  assert.equal(stored(space, 'profiles', 'globex.json'), `${JSON.stringify(fresh, null, 2)}\n`);
  // The same profile again writes nothing and needs no --replace (adx decision 81).
  const again = await call(space, profileSet('globex', fresh));
  assert.deepEqual(
    [again.exit, z.looseObject({ unchanged: z.boolean() }).parse(again.answer.result).unchanged],
    [0, true],
  );
  const [exists] = (await call(space, profileSet('acme', fresh))).answer.issues ?? [];
  assert.deepEqual(
    [exists?.code, exists?.command],
    [
      'ALREADY_EXISTS',
      `oriko profile set --profile acme --cv jane --json '{"blocks":{"campus":{"hidden":true}}}' --home ${space.home} --replace --dry-run`,
    ],
  );
  const preview = await call(space, profileSet('acme', fresh, '--replace', '--dry-run'));
  assert.deepEqual(
    [preview.answer.applied, Changed.parse(preview.answer.result).changes],
    [false, { added: ['blocks.campus'], changed: [], removed: ['blocks.freelance'], more: 0 }],
  );
  assert.equal(stored(space, 'profiles', 'acme.json'), acme);
  assert.equal((await call(space, profileSet('acme', fresh, '--replace'))).exit, 0);
  assert.equal(stored(space, 'profiles', 'acme.json'), `${JSON.stringify(fresh, null, 2)}\n`);
  // A profile that changes nothing is stored with its CV alone, and through stdin with --json -.
  const piped = await call(
    space,
    ['profile', 'set', '--profile', 'initech', '--json', '-'],
    '{"cv":"jane"}',
  );
  assert.deepEqual(
    [piped.exit, stored(space, 'profiles', 'initech.json')],
    [0, '{\n  "cv": "jane"\n}\n'],
  );
  // A stored profile that is no JSON counts as empty, so --replace mends it.
  writeFileSync(join(space.home, 'profiles', 'torn.json'), '{');
  const mended = await call(space, [
    'profile',
    'set',
    '--profile',
    'torn',
    '--cv',
    'jane',
    '--replace',
  ]);
  assert.deepEqual(Changed.parse(mended.answer.result).changes, {
    added: ['cv'],
    changed: [],
    removed: [],
    more: 0,
  });
  // A profile that makes the CV too long is stored; the answer says what does not fit.
  const long = await call(space, profileSet('long', { cv: 'jane', person: { role: LONG_ROLE } }));
  const fit = z.looseObject({
    fits: z.boolean(),
    layout: z.array(z.looseObject({ code: z.string(), path: z.string() })),
  });
  const { fits, layout } = fit.parse(long.answer.result);
  assert.deepEqual(
    [long.exit, fits, layout.map(found => [found.code, found.path]), long.answer.next],
    [0, false, [['ROLE_TOO_LONG', 'person.role']], undefined],
  );
});

const Changed = z.looseObject({ changes: z.unknown() });

// adx would write through a link at the profile to a file inside the data folder, such as a CV,
// so profile set refuses it; a link that leads nowhere or out of the folder is replaced.
test('profile set refuses a link to a stored file, and replaces a link adx replaces', async () => {
  const space = workspace();
  const jane = stored(space, 'cvs', 'jane.json');
  symlinkSync('../cvs/jane.json', join(space.home, 'profiles', 'evil.json'));
  const evil = await call(space, profileSet('evil', { cv: 'jane' }, '--replace'));
  assert.deepEqual(
    [evil.exit, evil.answer.issues?.map(issue => [issue.code, issue.path])],
    [1, [['TARGET_NOT_A_FILE', 'profile']]],
  );
  assert.equal(stored(space, 'cvs', 'jane.json'), jane);
  const outside = join(space.cwd, 'outside.json');
  writeFileSync(outside, 'outside');
  symlinkSync(outside, join(space.home, 'profiles', 'out.json'));
  symlinkSync('nowhere.json', join(space.home, 'profiles', 'dangling.json'));
  for (const name of ['out', 'dangling']) {
    const replaced = await call(space, profileSet(name, { cv: 'jane' }, '--replace'));
    const file = join(space.home, 'profiles', `${name}.json`);
    assert.deepEqual(
      [replaced.exit, lstatSync(file).isSymbolicLink(), stored(space, 'profiles', `${name}.json`)],
      [0, false, '{\n  "cv": "jane"\n}\n'],
      name,
    );
  }
  assert.deepEqual(
    [readFileSync(outside, 'utf8'), stored(space, 'profiles', 'nowhere.json')],
    ['outside', null],
  );
});

// A profile stored before in another key order is the same profile, so nothing is written.
test('profile set writes nothing for the content of the stored profile in another order', async () => {
  const space = workspace();
  const before =
    '{\n  "blocks": {\n    "freelance": {\n      "hidden": true\n    }\n  },\n  "cv": "jane"\n}\n';
  writeFileSync(join(space.home, 'profiles', 'acme.json'), before);
  const again = await call(
    space,
    profileSet('acme', { cv: 'jane', blocks: { freelance: { hidden: true } } }),
  );
  assert.deepEqual(
    [again.exit, again.answer.result],
    [
      0,
      {
        name: 'acme',
        file: 'profiles/acme.json',
        bytes: before.length,
        replaces: false,
        unchanged: true,
        changes: { added: [], changed: [], removed: [], more: 0 },
        cv: 'jane',
        fits: true,
        layout: [],
      },
    ],
  );
  assert.equal(stored(space, 'profiles', 'acme.json'), before);
});

// adx reads up to 1,048,576 characters from stdin; a profile or an edit is held to the byte limit
// of a stored file, counted as compact JSON.
test('profile set and an edit refuse an input past the byte limit of a stored file', async () => {
  const space = workspace();
  const long = 'x'.repeat(1_000_100);
  const cases: [string[], string][] = [
    [
      ['profile', 'set', '--profile', 'globex', '--json', '-'],
      JSON.stringify({ cv: 'jane', blocks: { awards: { title: long } } }),
    ],
    [['item', 'add', '--json', '-'], JSON.stringify({ block: 'interests', value: long })],
  ];
  for (const [argv, stdin] of cases) {
    const { exit, answer } = await call(space, argv, stdin);
    assert.deepEqual(
      [exit, answer.issues?.map(issue => [issue.code, issue.path])],
      [1, [['JSON_TOO_LARGE', undefined]]],
      argv.join(' '),
    );
  }
});

// The same checks plan runs, before anything is written: a refused profile is never stored.
test('profile set refuses a profile that does not fit its CV, and stores nothing', async () => {
  const space = workspace();
  const { pages, ...withoutPages } = JSON.parse(readFileSync(FIXTURE_URL, 'utf8'));
  const twice = {
    ...withoutPages,
    pages,
    blocks: [...withoutPages.blocks, withoutPages.blocks[0]],
  };
  writeFileSync(join(space.home, 'cvs', 'twice.json'), JSON.stringify(twice));
  writeFileSync(join(space.home, 'cvs', 'bare.json'), JSON.stringify(withoutPages));
  // The profile is the input, so its issues stand at its own fields, and those of the CV below cv.
  const cases: [string[], string | null, [string, string | undefined, string | undefined][]][] = [
    [
      profileSet('globex', { cv: 'jane', blocks: { nobody: { hidden: true } } }),
      null,
      [['UNKNOWN_BLOCK', 'blocks.nobody', `oriko show --cv jane --home ${space.home} --block`]],
    ],
    [
      profileSet('globex', { cv: 'jane', order: ['awards', 'nobody'] }),
      null,
      [['UNKNOWN_BLOCK', 'order.1', `oriko show --cv jane --home ${space.home} --block`]],
    ],
    [
      profileSet('globex', { cv: 'jane', blocks: { northwind: { bullets: ['a\nb'] } } }),
      null,
      [['SCHEMA', 'blocks.northwind.bullets.0', 'oriko schema block']],
    ],
    [
      profileSet('globex', { cv: 'jane', blocks: { northwind: { employer: 'Elsewhere' } } }),
      null,
      [['FACT_CHANGED', 'blocks.northwind.employer', undefined]],
    ],
    [
      profileSet('globex', { cv: 'jane', order: ['cedar'] }),
      null,
      [['JOB_MOVED', 'order', undefined]],
    ],
    [
      profileSet('globex', { cv: 'twice', order: ['awards'] }),
      null,
      [
        [
          'DUPLICATE_ID',
          'cv.blocks.northwind',
          `oriko profile set --profile globex --order awards --home ${space.home} --cv`,
        ],
      ],
    ],
    [
      profileSet('globex', { cv: 'bare', order: ['awards'] }),
      null,
      [['SCHEMA', 'cv.pages', 'oriko schema master']],
    ],
    [
      profileSet('globex', { cv: 'jane', colour: 'red' }),
      null,
      [['SCHEMA', 'colour', 'oriko schema profile set']],
    ],
    [
      profileSet('../globex', { cv: 'jane' }),
      null,
      [['SCHEMA', 'profile', 'oriko schema profile set']],
    ],
    // A call that names no field stores no empty profile, and piped text needs --json -.
    [
      ['profile', 'set', '--profile', 'globex', '--json', '{}'],
      null,
      [['NOTHING_TO_STORE', undefined, 'oriko schema profile set']],
    ],
    [
      ['profile', 'set', '--profile', 'globex'],
      '{"cv":"jane"}',
      [['NOTHING_TO_STORE', undefined, 'oriko schema profile set']],
    ],
  ];
  for (const [argv, stdin, expected] of cases) {
    const { exit, answer } = await call(space, argv, stdin);
    assert.deepEqual(
      [exit, answer.issues?.map(issue => [issue.code, issue.path, issue.command])],
      [1, expected],
      argv.join(' '),
    );
  }
  assert.equal(stored(space, 'profiles', 'globex.json'), null);
});

test('profile show answers a stored profile and its posting', async () => {
  const space = workspace();
  const job = join(space.cwd, 'job.txt');
  writeFileSync(job, 'Senior Go Engineer');
  writeFileSync(join(space.home, 'profiles', 'odd.json'), JSON.stringify({ colour: 'red' }));
  assert.deepEqual((await call(space, ['profile', 'show', '--profile', 'acme'])).answer, {
    ok: true,
    result: {
      name: 'acme',
      profile: { cv: 'jane', blocks: { freelance: { hidden: true } } },
      posting: null,
    },
    next: [
      {
        does: 'places every block on the pages',
        command: `oriko plan --profile acme --home ${space.home}`,
      },
    ],
  });
  await call(space, ['read', '--profile', 'globex', '--posting', job]);
  const posting = (await call(space, ['profile', 'show', '--profile', 'globex'])).answer;
  assert.deepEqual(posting.result, {
    name: 'globex',
    profile: null,
    posting: `---\nsource: "${job}"\nkind: text\n---\n\nSenior Go Engineer\n`,
  });
  // A posting without a profile counts as a name, and a stored profile must pass its shape; adx
  // lists regular files only, so a link and a folder count as no name.
  symlinkSync('acme.json', join(space.home, 'profiles', 'link.json'));
  mkdirSync(join(space.home, 'profiles', 'folder.posting.md'));
  assert.deepEqual((await call(space, ['profile', 'show', '--profile'])).answer.result, {
    option: 'profile',
    values: [{ value: 'acme' }, { value: 'broken' }, { value: 'globex' }, { value: 'odd' }],
  });
  const refused = [
    await call(space, ['profile', 'show', '--profile', 'nobody']),
    await call(space, ['profile', 'show', '--profile', 'odd']),
    await call(space, ['profile', 'show', '--profile', 'link']),
    await call(space, ['profile', 'show', '--profile', 'folder']),
  ];
  assert.deepEqual(
    refused.map(({ answer }) => answer.issues?.map(issue => [issue.code, issue.path])),
    [
      [['NOT_IN_LIST', 'profile']],
      [['SCHEMA', 'profile']],
      [['NOT_IN_LIST', 'profile']],
      [['NOT_IN_LIST', 'profile']],
    ],
  );
});
