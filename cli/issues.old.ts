/**
 * The issues the shell raises, each made by one function.
 *
 * unknownOption, unexpectedValue, repeatedOption: what the arguments get wrong by themselves.
 * optionNotAllowed, unknownCommand: an option the command does not take, and no command.
 * missingValue: an option given without a value.
 * unknownSchema, unknownOutput: a name the cli does not know.
 *
 * @example if (isOption(token.name) === false) issues.push(issue.unknownOption(token.name));
 */
import { shown } from '@honeyglass/utils/ts';
import type { Issue } from '../core/errors.ts';
import { missingHint } from '../core/options.old.ts';
import type { OptionName } from '../core/options.old.ts';
import { OUTPUTS } from './commands.ts';

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

export function missingValue(option: OptionName, schema: string): Issue {
  const issue = {
    code: 'MISSING_VALUE',
    path: option,
    message: `The option --${option} has no value`,
    hint: missingHint(option),
  };
  return option === 'json' ? { ...issue, command: schema } : issue;
}

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
