/**
 * The cli in a test: a data folder with the reference CV, and a call that answers parsed JSON.
 *
 * workspace, seed: a data folder with the reference CV 'jane' and two profiles, and a working
 * directory; seed fills a data folder the caller made.
 * call: runs oriko as a program reads it, and answers the exit code and the parsed answer.
 * terminal, piped: run oriko as a person at a terminal sees it, or as a program reads it, as text.
 * NEW_CV: the input of a second CV, 'erika'.
 *
 * A call goes where bin/oriko.ts sends it: a command on adx through run() of adx's test kit, with
 * the --home of the test's data folder unless the call names its own, every other one through
 * the old shell. The network of a Space reaches only the old shell; a test stands in for
 * LibreOffice by replacing libreOffice.program of pdf/convert.ts.
 *
 * @example const { exit, answer } = await call(workspace(), ['plan']);
 */
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run as runOnAdx } from '@honeyglass/adx/test';
import { z } from 'zod';
import { onAdx } from '../../cli/interim.ts';
import { oriko } from '../../cli/oriko.ts';
import { run } from '../../cli/run.ts';
import type { Web } from '../../read/web.ts';
import { FIXTURE_URL, photo } from './fixture.ts';
import { fakeWeb } from './web.ts';

const Answer = z.looseObject({
  ok: z.boolean(),
  // An issue of adx at no field, such as NO_CV, has no path.
  issues: z
    .array(
      z.looseObject({
        code: z.string(),
        path: z.string().optional(),
        command: z.string().optional(),
      }),
    )
    .optional(),
  // A refusal says its next step in a sentence; a success lists its steps.
  next: z
    .union([
      z.string(),
      z.array(
        z.strictObject({
          does: z.string(),
          command: z.string().optional(),
          needs: z.array(z.string()).optional(),
        }),
      ),
    ])
    .optional(),
});

/** The data folder, the working directory, and the network, which by default reaches nothing. */
export type Space = { home: string; cwd: string; web?: Web };

export const workspace = (): Space => {
  const home = mkdtempSync(join(tmpdir(), 'oriko-home-'));
  const cwd = mkdtempSync(join(tmpdir(), 'oriko-cwd-'));
  seed(home);
  return { home, cwd };
};

/** Fills the data folder `home` with the reference CV 'jane', its photo and two profiles. */
export const seed = (home: string) => {
  mkdirSync(join(home, 'cvs'), { recursive: true });
  const master = readFileSync(FIXTURE_URL, 'utf8').replace('"photo.png"', '"cvs/jane.png"');
  writeFileSync(join(home, 'cvs', 'jane.json'), master);
  writeFileSync(join(home, 'cvs', 'jane.png'), photo());
  mkdirSync(join(home, 'profiles'));
  writeFileSync(
    join(home, 'profiles', 'acme.json'),
    JSON.stringify({ cv: 'jane', blocks: { freelance: { hidden: true } } }),
  );
  writeFileSync(
    join(home, 'profiles', 'broken.json'),
    JSON.stringify({ blocks: { nobody: { hidden: true } } }),
  );
};

export const call = async (space: Space, argv: string[], stdin: string | null = null) => {
  const { exit, out } = await ran(space, argv, stdin, false);
  const answer = Answer.parse(JSON.parse(out));
  return { exit, answer, codes: answer.issues?.map(issue => issue.code) ?? [] };
};

export const terminal = async (space: Space, argv: string[]) =>
  (await ran(space, argv, null, true)).out;

export const piped = async (space: Space, argv: string[]) =>
  (await ran(space, argv, null, false)).out;

async function ran(space: Space, argv: string[], stdin: string | null, isTTY: boolean) {
  if (onAdx(argv))
    return runOnAdx(oriko, withHome(argv, space.home), { cwd: space.cwd, stdin, tty: isTTY });
  const { home, cwd, web = fakeWeb({}, {}).web } = space;
  let out = '';
  const exit = await run(argv, {
    home,
    cwd,
    web,
    isTTY,
    stdin: async () => stdin,
    write: text => (out += text),
  });
  return { exit, out };
}

// The --home goes before a '--', after which every argument is a word.
function withHome(argv: string[], home: string) {
  if (argv.some(arg => arg === '--home' || arg.startsWith('--home='))) return argv;
  const end = argv.includes('--') ? argv.indexOf('--') : argv.length;
  return [...argv.slice(0, end), '--home', home, ...argv.slice(end)];
}

export const NEW_CV = JSON.stringify({
  language: 'de',
  firstName: 'Erika',
  lastName: 'Muster',
  role: 'Entwicklerin',
});
