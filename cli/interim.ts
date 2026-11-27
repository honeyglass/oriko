/**
 * Which side answers a call while oriko moves onto adx command by command.
 *
 * onAdx: whether the command a call names stands in the table of the tool on adx.
 *
 * The old shell finds the command, so an option before it does not hide it. Everything else, a
 * command not moved yet, oriko alone, schema, a group alone, an unknown command, stays there.
 *
 * @example if (onAdx(argv)) await oriko.main();
 */
import { readArgs } from './args.ts';
import { commands } from './oriko.ts';
import { commandOf } from './route.ts';

export function onAdx(argv: string[]) {
  const { name } = commandOf(readArgs(argv).words);
  return name !== undefined && isListed(commands, name.split(' '));
}

// A word leads to a command or to the table of a group; only a command counts, so a group
// alone stays with the old shell. A command of adx is an object that has invoke.
function isListed(table: object, words: string[]): boolean {
  const [word = '', ...rest] = words;
  const entry = new Map<string, unknown>(Object.entries(table)).get(word);
  if (typeof entry !== 'object' || entry === null) return false;
  return rest.length === 0 ? 'invoke' in entry : isListed(entry, rest);
}
