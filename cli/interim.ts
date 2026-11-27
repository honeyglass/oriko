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
  return name !== undefined && Object.hasOwn(commands, name);
}
