/**
 * The arguments of one call, read in full, so one answer names every mistake in them.
 *
 * readArgs: the values, the words, the options given and those given without a value, and the
 * mistakes the arguments hold by themselves.
 * Values: the value of each option a call gives.
 *
 * A strict parse stops at the first unknown option; this one reads every argument and collects.
 *
 * @example const { values, words, issues } = readArgs(['plan', '--cv', 'jane']);
 */
import { parseArgs } from 'node:util';
import type { Issue } from '../core/errors.ts';
import * as issue from './issues.old.ts';
import { OPTIONS, isDashed } from '../core/options.old.ts';
import type { Many, One, OptionName, Switch } from '../core/options.old.ts';

export type Values = { [Name in One]?: string } & { [Name in Switch]?: boolean } & {
  [Name in Many]?: string[];
};

/**
 * @param argv - the arguments after the program name
 * @returns what the arguments say, and every mistake they hold without knowing the command
 */
export function readArgs(argv: string[]) {
  const { tokens } = parseArgs({
    args: dashValuesEmptied(argv),
    strict: false,
    tokens: true,
    allowPositionals: true,
    options: OPTIONS,
  });
  const values: Values = {};
  const words: string[] = [];
  const given: OptionName[] = [];
  const empty: OptionName[] = [];
  const issues: Issue[] = [];
  for (const token of tokens) {
    if (token.kind === 'positional') words.push(token.value);
    if (token.kind !== 'option') continue;
    if (isOption(token.name) === false) {
      issues.push(issue.unknownOption(token.name));
      continue;
    }
    const name = token.name;
    given.push(name);
    if (isSwitch(name)) {
      if (token.value === undefined) values[name] = true;
      else issues.push(issue.unexpectedValue(name));
      continue;
    }
    if (token.value === undefined || token.value === '') empty.push(name);
    else if (isMany(name)) values[name] = [...(values[name] ?? []), token.value];
    else values[name] = token.value;
  }
  return { values, words, given, empty, issues: [...issues, ...repeated(given)] };
}

const isOption = (name: string): name is OptionName => Object.hasOwn(OPTIONS, name);
const isSwitch = (name: OptionName): name is Switch => OPTIONS[name].type === 'boolean';
const isMany = (name: OptionName): name is Many => 'multiple' in OPTIONS[name];

// Node's strict parse calls a separate value that starts with '-' ambiguous: it is the next
// option, so the option before it stays without a value; '--opt=-x' still gives one.
function dashValuesEmptied(argv: string[]) {
  const end = argv.includes('--') ? argv.indexOf('--') : argv.length;
  return argv.map((arg, index) =>
    index < end && takesText(arg) && isDashed(argv[index + 1]) ? `${arg}=` : arg,
  );
}

function takesText(arg: string) {
  const name = arg.slice(2);
  return arg.startsWith('--') && isOption(name) && OPTIONS[name].type === 'string';
}

// An option that takes several values may come again; any other only once.
function repeated(given: OptionName[]) {
  const twice = given.filter(
    (name, index) => isMany(name) === false && given.indexOf(name) !== index,
  );
  return [...new Set(twice)].map(issue.repeatedOption);
}
