/**
 * The command a call names, and the options and words that command refuses.
 *
 * commandOf: the command whose words lead the call, and the words after it.
 * commandIssues: every option and word the command does not take.
 * requiredIssues: every option the command needs and the call leaves out.
 * actionsOf: the actions of a group, such as 'block add' for 'block'.
 * isCommandName, isShapeName, isSchemaName: whether a name is a command, a shape, or either.
 *
 * @example const issues = commandIssues(commandOf(args.words), args.given);
 */
import type { Issue } from '../core/errors.ts';
import * as issue from './issues.old.ts';
import type { OptionName } from '../core/options.old.ts';
import { COMMANDS, EVERYWHERE, SHAPES } from './commands.ts';
import type { Command, CommandName } from './commands.ts';

type Found = { name: CommandName | undefined; rest: string[] };

// The command whose words lead the call one by one, such as 'block' and 'add' for 'block add'.
export function commandOf(words: string[]): Found {
  const name = Object.keys(COMMANDS)
    .filter(isCommandName)
    .find(known => known.split(' ').every((part, index) => words[index] === part));
  if (name === undefined) return { name, rest: words };
  return { name, rest: words.slice(name.split(' ').length) };
}

// A command takes only its own options and words; anything more is named, never dropped.
// Without a command, only oriko alone and a group alone pass, with the options of every command.
export function commandIssues(found: Found, given: OptionName[]): Issue[] {
  const options = [...new Set(given)];
  if (found.name === undefined) {
    const [group, ...more] = found.rest;
    const isListing = group === undefined || (more.length === 0 && actionsOf(group).length > 0);
    if (isListing === false)
      return [issue.unknownCommand(found.rest, actionsOf(found.rest[0] ?? ''))];
    const listing = group === undefined ? 'oriko schema' : `oriko ${group}`;
    return options
      .filter(option => EVERYWHERE.includes(option) === false)
      .map(option => issue.optionNotAllowed(option, 'oriko without a command', listing));
  }
  const name = found.name;
  const command: Command = COMMANDS[name];
  const allowed: OptionName[] = [...command.options, ...EVERYWHERE];
  const words = command.joinsWords === true ? [] : found.rest.slice(command.words?.length ?? 0);
  return [
    ...options
      .filter(option => allowed.includes(option) === false)
      .map(option => issue.optionNotAllowed(option, `The command ${name}`, `oriko schema ${name}`)),
    ...words.map(word => issue.unexpectedArgument(word, name)),
  ];
}

// A command needs its required options, and an option given needs the ones it requires beside it.
export function requiredIssues(found: Found, given: OptionName[]): Issue[] {
  if (found.name === undefined) return [];
  const name = found.name;
  const command: Command = COMMANDS[name];
  const options = [...new Set(given)];
  const isMissing = (option: OptionName) => options.includes(option) === false;
  return [
    ...(command.required ?? []).filter(isMissing).map(option => issue.missingOption(option, name)),
    ...options.flatMap(by =>
      (command.requiredWith?.[by] ?? [])
        .filter(isMissing)
        .map(option => issue.missingOption(option, name, by)),
    ),
  ];
}

// The actions of a group, such as 'block add' for 'block'; none for a word that is no group.
export const actionsOf = (group: string) =>
  Object.keys(COMMANDS).filter(name => {
    const [first, action] = name.split(' ');
    return first === group && action !== undefined;
  });

export const isCommandName = (name: string): name is CommandName => Object.hasOwn(COMMANDS, name);
export const isShapeName = (name: string): name is keyof typeof SHAPES =>
  Object.hasOwn(SHAPES, name);
export const isSchemaName = (name: string) => isCommandName(name) || isShapeName(name);
