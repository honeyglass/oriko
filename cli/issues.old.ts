/**
 * The issues the shell raises, each made by one function.
 *
 * unknownOption, unexpectedValue, repeatedOption: what the arguments get wrong by themselves.
 * optionNotAllowed, unexpectedArgument, unknownCommand: what the named command does not take.
 * missingOption: an option the command needs and the call leaves out.
 * missingValue, oneListAtATime: an option given without a value.
 * unknownSchema, unknownOutput: a name the cli does not know.
 *
 * @example if (isOption(token.name) === false) issues.push(issue.unknownOption(token.name));
 */
import { shown } from '@honeyglass/utils/ts';
import type { Issue } from '../core/errors.ts';
import { isListed, missingHint } from '../core/options.old.ts';
import type { OptionName } from '../core/options.old.ts';
import { OUTPUTS } from './commands.ts';
import type { CommandName } from './commands.ts';

export const unknownOption = (name: string): Issue => ({
  code: 'UNKNOWN_OPTION',
  path: name,
  message: `No option is called --${name}`,
  hint: 'Run the command and use one of the options it lists',
  command: 'oriko schema',
});

export const unexpectedValue = (name: string): Issue => ({
  code: 'UNEXPECTED_VALUE',
  path: name,
  message: `The option --${name} takes no value`,
  hint: `Write --${name} alone`,
});

export const repeatedOption = (name: string): Issue => ({
  code: 'REPEATED_OPTION',
  path: name,
  message: `The option --${name} is given more than once`,
  hint: `Give --${name} once`,
});

export const optionNotAllowed = (option: string, who: string, listing: string): Issue => ({
  code: 'OPTION_NOT_ALLOWED',
  path: option,
  message: `${who} takes no --${option}`,
  hint: 'Run the command and use only the options it lists',
  command: listing,
});

export const unexpectedArgument = (word: string, command: string): Issue => ({
  code: 'UNEXPECTED_ARGUMENT',
  path: word,
  message: `The command ${command} takes no word ${shown(word)}`,
  hint: 'Run the command and pass only the words and options it lists',
  command: `oriko schema ${command}`,
});

// A known group with a wrong action points to the group's list, anything else to the full one.
export function unknownCommand(words: string[], groupActions: string[]): Issue {
  const [group = ''] = words;
  return {
    code: 'UNKNOWN_COMMAND',
    path: 'command',
    message: `There is no command ${shown(words.join(' '))}`,
    hint: 'Run the command and use one of the commands it lists',
    command: groupActions.length > 0 ? `oriko ${group}` : 'oriko schema',
  };
}

/**
 * @param option - the option the command needs
 * @param name - the command
 * @param by - the option given that needs it beside it, if any
 * @returns the issue, with a command that lists what the option may hold
 */
export function missingOption(option: OptionName, name: CommandName, by?: OptionName): Issue {
  const needs = `The command ${name} needs --${option}`;
  return {
    code: 'MISSING_OPTION',
    path: option,
    message: by === undefined ? needs : `${needs} beside --${by}`,
    hint: missingHint(option),
    command: listingOf(option, name),
  };
}

// A listed option lists its values, any other names the command.
function listingOf(option: OptionName, name: CommandName) {
  return isListed(option) ? `oriko ${name} --${option}` : `oriko schema ${name}`;
}

export function missingValue(option: OptionName, schema: string): Issue {
  const issue = {
    code: 'MISSING_VALUE',
    path: option,
    message: `The option --${option} has no value`,
    hint: missingHint(option),
  };
  return option === 'json' ? { ...issue, command: schema } : issue;
}

export const oneListAtATime = (option: string): Issue => ({
  code: 'MISSING_VALUE',
  path: option,
  message: `The option --${option} has no value, and another option has none either`,
  hint: 'Leave one option without a value at a time, and give the others a value',
});

export const unknownSchema = (name: string): Issue => ({
  code: 'UNKNOWN_COMMAND',
  path: 'name',
  message: `No command or shape is called ${shown(name)}`,
  hint: 'Run the command and use one of the commands or schemas it lists',
  command: 'oriko schema',
});

export const unknownOutput = (output: string): Issue => ({
  code: 'UNKNOWN_OUTPUT',
  path: 'output',
  message: `No output is called ${shown(output)}`,
  hint: `Run the command and use one of the outputs it lists: ${OUTPUTS.join(', ')}`,
  command: 'oriko --output',
});
