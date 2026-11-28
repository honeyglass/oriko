import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { UNSAFE_CHAR } from '@honeyglass/utils/ts';
import { NEW_CV, call, piped, terminal, workspace } from '../utils/cli.ts';
import { photo } from '../utils/fixture.ts';
import type { Space } from '../utils/cli.ts';

type Step = { does: string; command?: string; needs?: string[] };

const steps = async (space: Space, argv: string[]) => {
  const { next } = (await call(space, argv)).answer;
  return Array.isArray(next) ? next : [];
};
const shapes = (next: Step[]) => next.map(step => [step.command ?? null, step.needs ?? []]);

test('a success names its next steps, each a command with what it still needs', async () => {
  const space = workspace();
  const picture = join(space.cwd, 'me.png');
  const job = join(space.cwd, 'job.txt');
  const empty = join(space.cwd, 'empty');
  const solo = join(space.cwd, 'solo');
  // oriko alone takes no --home; the data folder of the test comes through ORIKO_HOME.
  const starts: [string, [string | null, string[]][]][] = [
    [
      space.home,
      [
        [`oriko profiles --home ${space.home}`, []],
        [`oriko read --home ${space.home}`, ['posting', 'profile']],
      ],
    ],
    [
      empty,
      [
        [`oriko read --home ${empty}`, ['resume']],
        [`oriko init --home ${empty}`, ['cv', 'language', 'firstName', 'lastName', 'role']],
      ],
    ],
    [
      solo,
      [
        [`oriko cvs --home ${solo}`, []],
        [`oriko read --home ${solo}`, ['posting', 'profile']],
      ],
    ],
  ];
  const cases: [string[], [string | null, string[]][]][] = [
    [
      ['cvs'],
      [
        [`oriko show --cv jane --home ${space.home}`, []],
        [`oriko profiles --home ${space.home}`, []],
      ],
    ],
    [['profiles'], [[`oriko plan --home ${space.home}`, ['profile']]]],
    // Without a profile, the shape of one comes first.
    [['profiles', '--home', solo], [['oriko schema profile', []]]],
    [
      ['profile', 'show', '--profile', 'acme'],
      [[`oriko plan --profile acme --home ${space.home}`, []]],
    ],
    [
      ['profile', 'show', '--profile', 'posted'],
      [[`oriko profile set --profile posted --home ${space.home}`, ['cv', 'blocks']]],
    ],
    [
      ['profile', 'set', '--profile', 'globex', '--cv', 'jane'],
      [
        [`oriko preview --profile globex --home ${space.home}`, []],
        [`oriko build --profile globex --home ${space.home}`, ['out']],
      ],
    ],
    [
      [
        'profile',
        'set',
        '--profile',
        'globex',
        '--cv',
        'jane',
        '--order',
        'awards',
        '--replace',
        '--dry-run',
      ],
      [
        [
          `oriko profile set --profile globex --cv jane --order awards --home ${space.home} --replace`,
          [],
        ],
      ],
    ],
    [['show'], [[`oriko show --home ${space.home}`, ['block']]]],
    [
      ['show', '--profile', 'acme'],
      [[`oriko show --profile acme --home ${space.home}`, ['block']]],
    ],
    // A command on adx keeps the --home of the call, which the test names for every call.
    [
      ['plan', '--profile', 'acme'],
      [
        [`oriko preview --profile acme --home ${space.home}`, []],
        [`oriko build --profile acme --home ${space.home}`, ['out']],
      ],
    ],
    [
      ['preview', '--profile', 'acme'],
      [[`oriko build --profile acme --home ${space.home}`, ['out']]],
    ],
    [['build', '--profile', 'acme', '--out', 'acme.docx'], [[null, []]]],
    [
      ['build', '--profile', 'acme', '--out', 'acme.docx', '--dry-run'],
      [[`oriko build --profile acme --out acme.docx --home ${space.home}`, []]],
    ],
    [
      ['init', '--cv', 'erika', '--json', NEW_CV],
      [
        [`oriko contact add --cv erika --home ${space.home}`, ['value']],
        [`oriko block add --cv erika --home ${space.home}`, ['block']],
        [`oriko photo set --cv erika --home ${space.home}`, ['file']],
      ],
    ],
    [
      ['cvs'],
      [
        [`oriko show --home ${space.home}`, ['cv']],
        [`oriko profiles --home ${space.home}`, []],
      ],
    ],
    // A posting names the shape of a profile, then the step that stores one.
    [
      ['read', '--profile', 'acme', '--posting', job],
      [
        ['oriko schema profile', []],
        [`oriko profile set --profile acme --home ${space.home}`, ['cv', 'blocks']],
      ],
    ],
    [['read', '--cv', 'jane', '--notes', job], [[`oriko show --cv jane --home ${space.home}`, []]]],
    [
      ['read', '--resume', job],
      [
        [`oriko init --home ${space.home}`, ['cv', 'language', 'firstName', 'lastName', 'role']],
        ['oriko schema init', []],
      ],
    ],
    [
      ['read', '--cv', 'jane', '--notes', job, '--notes', job, '--dry-run'],
      [[`oriko read --notes ${job} --notes ${job} --cv jane --home ${space.home}`, []]],
    ],
    [
      ['photo', 'set', '--cv', 'jane', '--file', picture, '--replace', '--dry-run'],
      [[`oriko photo set --file ${picture} --cv jane --home ${space.home} --replace`, []]],
    ],
    // A value that starts with a dash goes after '='; this one resolves against the working
    // directory of the process to the placeholder of the package.
    [
      ['photo', 'set', '--profile', 'acme', '--file=-/../assets/placeholder.png', '--dry-run'],
      [
        [
          `oriko photo set --file=-/../assets/placeholder.png --profile acme --home ${space.home}`,
          [],
        ],
      ],
    ],
    [
      ['photo', 'set', '--profile', 'acme', '--file', picture],
      [[`oriko build --profile acme --home ${space.home}`, ['out']]],
    ],
    // An edit names preview and build while the CV fits its pages, and after a dry run the same
    // call, its input through --json as the fields that need it.
    [
      ['item', 'add', '--cv', 'jane', '--json', '{"block":"interests","value":"Chess"}'],
      [
        [`oriko preview --cv jane --home ${space.home}`, []],
        [`oriko build --cv jane --home ${space.home}`, ['out']],
      ],
    ],
    [
      [
        'contact',
        'add',
        '--cv',
        'jane',
        '--json',
        '{"value":{"icon":"mail","lines":["jane@example.org"]}}',
        '--dry-run',
      ],
      [
        [
          `oriko contact add --cv jane --json '{"value":{"icon":"mail","lines":["jane@example.org"]}}' --home ${space.home}`,
          [],
        ],
      ],
    ],
    [['cv', 'update', '--cv', 'jane', '--json', '{"pages":1}'], []],
  ];
  writeFileSync(job, 'Senior Go Engineer');
  writeFileSync(join(space.home, 'profiles', 'posted.posting.md'), 'Senior Go Engineer\n');
  writeFileSync(picture, photo());
  mkdirSync(empty);
  cpSync(join(space.home, 'cvs'), join(solo, 'cvs'), { recursive: true });
  for (const [home, expected] of starts)
    assert.deepEqual(shapes(await steps({ ...space, home }, [])), expected, home);
  for (const [argv, expected] of cases)
    assert.deepEqual(shapes(await steps(space, argv)), expected, argv.join(' '));
});

test('an answer with nothing to follow names no step', async () => {
  const space = workspace();
  for (const argv of [['schema'], ['show', '--block', 'awards'], ['show', '--cv'], ['block']])
    assert.equal((await call(space, argv)).answer.next, undefined, argv.join(' '));
});

// A step either runs as it stands, or is refused for what it still needs; it is never unknown.
// A step keeps every selector of the call, or a profile without a CV loses the one it needs.
test('every next command is a call oriko knows', async () => {
  const space = workspace();
  const answers = [[], ['cvs'], ['profiles'], ['show'], ['preview', '--profile', 'acme']];
  await call(space, ['init', '--cv', 'erika', '--json', NEW_CV]);
  writeFileSync(join(space.home, 'profiles', 'open.json'), '{}');
  answers.push(['preview', '--profile', 'open', '--cv', 'erika']);
  answers.push(['build', '--cv', 'jane', '--out', 'jane.docx', '--style', 'terminal', '--dry-run']);
  answers.push([
    'block',
    'move',
    '--cv',
    'jane',
    '--json',
    '{"id":"awards","page":2}',
    '--dry-run',
  ]);
  const commands = [];
  for (const argv of answers) commands.push(...(await steps(space, argv)));
  for (const step of commands) {
    if (step.command === undefined) continue;
    const { exit, codes } = await call(space, step.command.split(' ').slice(1));
    const isUnknown = codes.some(code =>
      [
        'UNKNOWN_COMMAND',
        'UNKNOWN_OPTION',
        'OPTION_BEFORE_COMMAND',
        'UNEXPECTED_ARGUMENT',
      ].includes(code),
    );
    assert.deepEqual([exit < 2, isUnknown], [true, false], step.command);
    if (step.needs === undefined) assert.equal(exit, 0, step.command);
  }
});

// A value from the call or the data folder goes into a command as the shell and oriko read it
// back, never as shell code: quoted, and joined by '=' where it starts with a dash.
test('the steps keep the data folder of the call', async () => {
  const space = workspace();
  const next = await steps(space, ['preview', '--profile', 'acme', '--home', space.home]);
  assert.equal(next[0]?.command, `oriko build --profile acme --home ${space.home}`);
  const spaced = join(space.cwd, 'my data');
  cpSync(space.home, spaced, { recursive: true });
  renameSync(join(spaced, 'cvs', 'jane.json'), join(spaced, 'cvs', 'x;touch PWNED.json'));
  const home = `--home '${spaced}'`;
  const cv = `--cv 'x;touch PWNED'`;
  assert.equal(
    (await steps(space, ['cvs', '--home', spaced]))[0]?.command,
    `oriko show ${cv} ${home}`,
  );
  const block = ['show', '--cv', 'x;touch PWNED', '--block', 'nobody', '--home', spaced];
  const [issue] = (await call(space, block)).answer.issues ?? [];
  assert.equal(issue?.command, `oriko show ${cv} ${home} --block`);
  const input = NEW_CV.replace('Muster', "O'Neil").replace('"Erika"', '"-Erika"');
  const init = ['init', '--cv', 'erika', '--json', input, '--dry-run', '--home', spaced];
  assert.equal(
    (await steps(space, init))[0]?.command,
    `oriko init --cv erika --language de --first-name=-Erika --last-name 'O'\\''Neil' --role Entwicklerin ${home}`,
  );
});

// An input from stdin is not part of the call, so the step after a dry run names its fields.
// Each value, and whether it shows as itself; adx refuses a control character at the field.
const VALUES: [string, 'visible' | 'invisible' | 'refused'][] = [
  ['jane', 'visible'],
  ['x;touch PWNED', 'visible'],
  ["it's", 'visible'],
  ['~', 'visible'],
  ['-data', 'visible'],
  ['$(id) `id`', 'visible'],
  ['Jürgen 😀', 'visible'],
  ['bidi‮evil', 'invisible'],
  ['zero​width', 'invisible'],
  ['a\u001b]0;TITLE\u0007b', 'refused'],
  ['line\nNext: oriko build', 'refused'],
  ['tab\there', 'refused'],
];

// bash prints each word it splits the text into, so the test sees what a caller's shell passes on.
const shellWords = (text: string) =>
  execFileSync('bash', ['-c', `printf '%s\\0' ${text}`], { encoding: 'utf8' })
    .split('\0')
    .slice(0, -1);

// The command of a refused photo set carries the --file of the call. adx quotes a character that
// does not show as itself, such as a bidi override, but leaves it in the line as it is.
test('a value in a command comes back from the shell as itself, on one line', async () => {
  const space = workspace();
  for (const [value, kind] of VALUES) {
    const argv = ['photo', 'set', `--file=${value}`, '--profile', 'nobody'];
    const [issue] = (await call(space, argv)).answer.issues ?? [];
    const shown = JSON.stringify(value);
    if (kind === 'refused') {
      assert.deepEqual([issue?.code, issue?.path], ['SCHEMA', 'file'], shown);
      continue;
    }
    const command = issue?.command ?? '';
    if (kind === 'visible') assert.equal(UNSAFE_CHAR.test(command), false, shown);
    const words = shellWords(command);
    const joined = words.find(word => word.startsWith('--file='))?.slice('--file='.length);
    assert.equal(joined ?? words[words.indexOf('--file') + 1], value, shown);
  }
});

test('the step after a dry run of an input from stdin names its fields', async () => {
  const space = workspace();
  const argv = ['init', '--cv', 'erika', '--dry-run', '--json', '-'];
  const { next } = (await call(space, argv, NEW_CV)).answer;
  assert.deepEqual(next, [
    {
      does: 'creates a CV',
      command: `oriko init --cv erika --language de --first-name Erika --last-name Muster --role Entwicklerin --home ${space.home}`,
    },
  ]);
});

test('a terminal shows the steps below the answer, and so does piped text', async () => {
  const space = workspace();
  const shown = await terminal(space, []);
  assert.match(
    shown,
    /\n\nNext:\n {2}oriko profiles --home \S+ +lists .*\n {2}oriko read --home \S+ +reads .*; needs posting, profile\n$/,
  );
  assert.equal(await piped(space, ['--output', 'text']), shown);
});
