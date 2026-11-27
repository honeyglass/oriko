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
import { chosenCv, cvNames, profileNames } from '../core/home.old.ts';
import { COMMANDS, OUTPUTS } from './commands.ts';
import type { Command, CommandName } from './commands.ts';
import { profileCv } from '../core/load.old.ts';
import { masterOf, outline } from '../cv/show.ts';
import { schemaCommand } from './complete.ts';
import type { Call, Fields } from './types.ts';

// Options without a value: one list answers its values; a free value, a new name, or a second
// list is refused, so no option passes unanswered.
export async function emptied(call: Call, empty: OptionName[]): Promise<Result<Fields>> {
  const fresh: OptionName[] = call.command === undefined ? [] : (freshOf(call.command) ?? []);
  const lists = empty.filter(isListed).filter(option => fresh.includes(option) === false);
  const free = empty.filter(option => lists.some(listed => listed === option) === false);
  const [only] = lists;
  const issues = [
    ...free.map(option =>
      fresh.includes(option)
        ? issue.newNameMissing(option)
        : issue.missingValue(option, schemaCommand(call.command ?? '')),
    ),
    ...(lists.length > 1 ? lists.map(issue.oneListAtATime) : []),
  ];
  if (issues.length > 0 || only === undefined) return rejected('oriko', issues);
  return valuesOf(call, only);
}

const freshOf = (name: CommandName) => {
  const command: Command = COMMANDS[name];
  return command.fresh;
};

// One case per listed option; a new one fails the type check until it has its case.
async function valuesOf(call: Call, option: ListedOption): Promise<Result<Fields>> {
  switch (option) {
    case 'cv':
      return done({ option, values: await cvValues(call) });
    case 'profile':
      return done({ option, values: await profileNames(call.home) });
    case 'output':
      return done({ option, values: [...OUTPUTS] });
    case 'block':
      return blockValues(call);
  }
}

// With a profile, only the CV it names passes, so the list holds only that one.
async function cvValues(call: Call) {
  const names = await cvNames(call.home);
  const fromProfile = await profileCv(call.home, call.values.profile);
  return fromProfile !== undefined && names.includes(fromProfile) ? [fromProfile] : names;
}

// The blocks of the CV this call names, in the outline show answers, so a caller picks an id.
async function blockValues(call: Call): Promise<Result<Fields>> {
  const cv = await chosenCv(
    call.home,
    call.values.cv,
    await profileCv(call.home, call.values.profile),
  );
  if (cv.error !== null) return cv;
  const master = await masterOf(cv.data.path, 'show');
  if (master.error !== null) return master;
  return done({ option: 'block', cv: cv.data.name, values: master.data.blocks.map(outline) });
}
