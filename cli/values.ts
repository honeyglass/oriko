/**
 * The values of an option given without one, so a caller picks a value from a list.
 *
 * emptied: the values of the one listed option given empty, or the issues of every other.
 *
 * @example const result = await emptied(call, args.empty);
 */
import { done, rejected } from '../core/errors.ts';
import type { Result } from '../core/errors.ts';
import * as issue from './issues.old.ts';
import { isListed } from '../core/options.old.ts';
import type { ListedOption, OptionName } from '../core/options.old.ts';
import { OUTPUTS } from './commands.ts';
import { schemaCommand } from './complete.ts';
import type { Call, Fields } from './types.ts';

// Options without a value: the one list, --output, answers its values; a free value is refused,
// so no option passes unanswered. A second --output is refused before, as a repeated option.
export function emptied(call: Call, empty: OptionName[]): Result<Fields> {
  const [only] = empty.filter(isListed);
  const free = empty.filter(option => isListed(option) === false);
  const issues = free.map(option => issue.missingValue(option, schemaCommand(call.command ?? '')));
  if (issues.length > 0 || only === undefined) return rejected('oriko', issues);
  return valuesOf(only);
}

// One case per listed option; a new one fails the type check until it has its case.
function valuesOf(option: ListedOption): Result<Fields> {
  switch (option) {
    case 'output':
      return done({ option, values: [...OUTPUTS] });
  }
}
