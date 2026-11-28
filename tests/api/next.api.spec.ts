import assert from 'node:assert/strict';
import { cpSync, mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
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
  const cases: [string[], [string | null, string[]][]][] = [
    [
      [],
      [
        ['oriko profiles', []],
        ['oriko read', ['posting', 'profile']],
      ],
    ],
    [
      ['--home', 'empty'],
      [
        ['oriko read --home empty', ['resume']],
        ['oriko init --home empty', ['cv', 'json']],
      ],
    ],
    [
      ['--home', 'solo'],
      [
        ['oriko cvs --home solo', []],
        ['oriko read --home solo', ['posting', 'profile']],
      ],
    ],
    [
      ['cvs'],
      [
        [`oriko show --cv jane --home ${space.home}`, []],
        [`oriko profiles --home ${space.home}`, []],
      ],
    ],
    [['profiles'], [[`oriko plan --home ${space.home}`, ['profile']]]],
    // Without a profile, the shape of one comes first.
    [['profiles', '--home', join(space.cwd, 'solo')], [['oriko schema profile', []]]],
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
  mkdirSync(join(space.cwd, 'empty'));
  cpSync(join(space.home, 'cvs'), join(space.cwd, 'solo', 'cvs'), { recursive: true });
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
      ['UNKNOWN_COMMAND', 'UNKNOWN_OPTION', 'OPTION_NOT_ALLOWED', 'UNEXPECTED_ARGUMENT'].includes(
        code,
      ),
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

test('a terminal shows the steps below the answer, and piped text leaves them out', async () => {
  const space = workspace();
  const shown = await terminal(space, []);
  assert.match(shown, /\nNext: oriko profiles\nNext: oriko read \(needs --posting, --profile\)\n$/);
  const text = await piped(space, ['--output', 'text']);
  assert.equal(text.includes('Next:'), false);
});
