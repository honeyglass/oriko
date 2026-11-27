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
        ['oriko show --cv jane', []],
        ['oriko profiles', []],
      ],
    ],
    [['profiles'], [['oriko plan', ['profile']]]],
    [['show'], [['oriko show', ['block']]]],
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
        ['oriko contact add --cv erika', ['json']],
        ['oriko block add --cv erika', ['json']],
        ['oriko photo set --cv erika', ['file']],
      ],
    ],
    [
      ['cvs'],
      [
        ['oriko show', ['cv']],
        ['oriko profiles', []],
      ],
    ],
    [
      ['read', '--profile', 'acme', '--posting', 'job.txt'],
      [
        ['oriko schema profile', []],
        ['oriko profile set --profile acme', ['json']],
      ],
    ],
    [['read', '--cv', 'jane', '--notes', 'job.txt'], [['oriko show --cv jane', []]]],
    [
      ['read', '--resume', 'job.txt'],
      [
        ['oriko init', ['cv', 'json']],
        ['oriko schema init', []],
      ],
    ],
    [
      ['read', '--cv', 'jane', '--notes', 'job.txt', '--notes', 'job.txt', '--dry-run'],
      [['oriko read --cv jane --notes job.txt --notes job.txt', []]],
    ],
    [
      ['photo', 'set', '--cv', 'jane', '--dry-run', '--', '-me.png'],
      [['oriko photo set --cv jane -- -me.png', []]],
    ],
  ];
  writeFileSync(join(space.cwd, 'job.txt'), 'Senior Go Engineer');
  writeFileSync(join(space.cwd, '-me.png'), photo());
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
  const dashed = join(space.cwd, '-data');
  cpSync(space.home, dashed, { recursive: true });
  renameSync(join(dashed, 'cvs', 'jane.json'), join(dashed, 'cvs', 'x;touch PWNED.json'));
  cpSync(space.home, join(space.cwd, '~'), { recursive: true });
  const cv = `--cv 'x;touch PWNED'`;
  assert.equal(
    (await steps(space, ['cvs', '--home=-data']))[0]?.command,
    `oriko show ${cv} --home=-data`,
  );
  const [issue] =
    (await call(space, ['show', '--block', 'nobody', '--home=-data'])).answer.issues ?? [];
  assert.equal(issue?.command, `oriko show ${cv} --block --home=-data`);
  assert.equal(
    (await steps(space, ['profiles', '--home', '~']))[0]?.command,
    `oriko plan --home '~'`,
  );
  const input = NEW_CV.replace('Muster', "O'Neil");
  const init = ['init', '--cv', 'erika', '--json', input, '--dry-run', '--home=-data'];
  assert.equal(
    (await steps(space, init))[0]?.command,
    `oriko init --cv erika --json '{"language":"de","firstName":"Erika","lastName":"O'\\''Neil","role":"Entwicklerin"}' --home=-data`,
  );
});

// A piped input is not part of the call, so repeating the call needs it again.
test('the step after a dry run of a piped input still needs the input', async () => {
  const space = workspace();
  const { next } = (await call(space, ['block', 'remove', '--dry-run'], '{"id":"awards"}')).answer;
  assert.deepEqual(next, [
    {
      does: 'repeat the call without --dry-run to write',
      command: 'oriko block remove',
      needs: ['json'],
    },
  ]);
});

test('a terminal shows the steps below the answer, and piped text leaves them out', async () => {
  const space = workspace();
  const shown = await terminal(space, ['cvs']);
  assert.match(shown, /\nNext: oriko show --cv jane\nNext: oriko profiles\n$/);
  const text = await piped(space, ['cvs', '--output', 'text']);
  assert.equal(text.includes('Next:'), false);
});
