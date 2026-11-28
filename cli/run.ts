/**
 * The cli: one JSON answer per call on stdout, and an exit code that says who acts next.
 *
 * run: runs one command and answers its exit code.
 * Io: what the cli needs from its surroundings, so a test can stand in for the terminal.
 *
 * Exit 0 is success, 1 a refusal the caller fixes, 2 a bug in this program. stdout carries the
 * whole answer; nothing a caller needs goes to stderr.
 *
 * @example process.exitCode = await run(process.argv.slice(2), io);
 */
import { resolve } from 'node:path';
import { $try, causeText } from '@honeyglass/utils/ts';
import { rejected } from '../core/errors.ts';
import * as issue from './issues.old.ts';
import { homeIssues } from '../core/home.old.ts';
import { readArgs } from './args.ts';
import { isOutput } from './commands.ts';
import { json, text } from './answer.ts';
import { commandIssues, commandOf, requiredIssues } from './route.ts';
import { withCommands, withNext } from './complete.ts';
import { dispatched } from './dispatch.ts';
import { emptied } from './values.ts';
import type { Io } from './types.ts';

export type { Io } from './types.ts';

const EXIT = { ok: 0, expected: 1, fatal: 2 } as const;

/**
 * @param argv - the arguments after the program name
 * @param io - the surroundings of the call
 * @returns the exit code
 */
export async function run(argv: string[], io: Io) {
  const { data, error } = await $try(() => answered(argv, io));
  if (error !== null) return crashed(error, io);
  io.write(data.asText ? text(data.result, io.isTTY) : json(data.result));
  return data.result.error === null ? EXIT.ok : EXIT.expected;
}

// The one place an unexpected error ends: a bug of this program, never the caller's to fix.
function crashed(error: Error, io: Io) {
  const bug = {
    ok: false,
    kind: 'bug',
    step: 'oriko',
    reason: 'an unexpected error stopped the command',
    next: 'stop and tell the person; the maintainer of oriko fixes it',
    state: 'A file may be half written only if the error came from the disk.',
    issues: [],
    cause: causeText(error),
  };
  io.write(`${JSON.stringify(bug)}\n`);
  return EXIT.fatal;
}

async function answered(argv: string[], io: Io) {
  const args = readArgs(argv);
  const { values } = args;
  const isKnownOutput = values.output === undefined || isOutput(values.output);
  const asText = isKnownOutput && values.output !== undefined ? values.output === 'text' : io.isTTY;
  const home = values.home === undefined ? io.home : resolve(io.cwd, values.home);
  const found = commandOf(args.words);
  const call = { io: readsStdinOnce(io), home, values, rest: found.rest, command: found.name };
  // An empty --home is refused below; until then no folder, not even the default one, is opened.
  const isHomeEmpty = args.empty.includes('home');
  // An option given without a value lists its values and runs no command, so nothing is required.
  const isRunning = args.empty.length === 0;
  const issues = [
    ...commandIssues(found, args.given),
    ...(isRunning ? requiredIssues(found, args.given) : []),
    ...args.issues,
    ...(isHomeEmpty ? [] : await homeIssues(home)),
    ...(isKnownOutput ? [] : [issue.unknownOutput(values.output ?? '')]),
  ];
  if (issues.length > 0) return { result: withCommands(call, rejected('oriko', issues)), asText };
  const result = args.empty.length === 0 ? await dispatched(call) : await emptied(call, args.empty);
  return { result: withCommands(call, withNext(call, result)), asText };
}

// A pipe gives its text only once; a refusal that looks at the input again gets the same text.
function readsStdinOnce(io: Io): Io {
  let text: Promise<string | null> | undefined;
  return { ...io, stdin: () => (text ??= io.stdin()) };
}
