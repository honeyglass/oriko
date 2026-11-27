/**
 * The options of every command, and how an option is written back for a shell.
 *
 * OPTIONS, OptionName: every option with its type, whether a list holds its values, and its texts.
 * ListedOption, isListed: the options whose values sit in a list.
 * Switch, Many, One: the options without a value, with several values, and with one value.
 * missingHint, NEW_NAME: what to add to an option without a value, or one that takes a new name.
 * optionText, isDashed: one option with its value, quoted so a shell reads the value back.
 * optionsText, shellWord: every option of a call, and one word, written back the same way.
 *
 * Several features name options in their issues and next steps, so the table lives here.
 * A command oriko names may be run by an agent as it stands, so every value in it is quoted.
 *
 * @example const option = optionText('profile', name);
 */
import { UNSAFE_CHAR } from '@honeyglass/utils/ts';

type Option = {
  type: 'string' | 'boolean';
  /** The values sit in a list, so the option without a value answers that list. */
  listed?: true;
  text: string;
  /** What to add when the option is missing, or comes without a value and no list holds its values. */
  missing?: string;
  /** The option may come several times, each with a value of its own. */
  multiple?: true;
};

export const OPTIONS = {
  home: {
    type: 'string',
    text: 'the data folder with cvs/NAME.json and profiles/NAME.json; ~/.oriko when left out',
    missing: 'Add the data folder that holds cvs/ and profiles/, or leave out --home for ~/.oriko',
  },
  cv: {
    type: 'string',
    listed: true,
    text: 'the name of one CV, or of the new one for init; any other command may leave it out when the data folder holds one CV or the profile names it',
  },
  profile: {
    type: 'string',
    listed: true,
    text: 'the name of one profile; it names its CV in its field cv',
    missing:
      'Run the command for the existing profiles, or pass a new name in lower-case words joined by hyphens',
  },
  out: {
    type: 'string',
    text: 'the .docx or .pdf to write, for build; a path inside the working directory; a .pdf needs LibreOffice',
    missing: 'Add the path of the .docx or .pdf file to write, inside the working directory',
  },
  json: {
    type: 'string',
    text: 'the JSON input of the command, in the shape oriko schema <command> shows; without it the input comes from stdin',
    missing: 'Run the command for the input shape, then pass it as one JSON object',
  },
  block: {
    type: 'string',
    listed: true,
    text: 'the id of one block to show in full, for show',
  },
  'dry-run': { type: 'boolean', text: 'check and answer, but write no file' },
  posting: {
    type: 'string',
    text: 'the job posting, for read: a PDF, Word, HTML or text file, or an https:// address',
    missing: 'Add the file or the https:// address of the job posting',
  },
  notes: {
    type: 'string',
    multiple: true,
    text: 'notes on the career, for read, kept beside the CV; may come several times',
    missing: 'Add the file or the https:// address of the notes',
  },
  resume: {
    type: 'string',
    text: 'an old CV, for read: its text is answered and stored nowhere',
    missing: 'Add the file or the https:// address of the old CV',
  },
  replace: {
    type: 'boolean',
    text: 'for read and profile set: overwrite the posting or the profile that is already stored',
  },
  style: {
    type: 'string',
    listed: true,
    text: 'the look of the file, for build: classic, or terminal like the preview; classic when left out',
  },
  output: {
    type: 'string',
    listed: true,
    text: 'json or text; json when stdout is no terminal',
  },
  credits: {
    type: 'boolean',
    text: 'for preview, and build with --style terminal: names oriko and its author on the right of the last page',
  },
} as const satisfies Record<string, Option>;

export type OptionName = keyof typeof OPTIONS;

/** An option whose values sit in a list; a switch over it must answer every such option. */
export type ListedOption = {
  [Name in OptionName]: (typeof OPTIONS)[Name] extends { listed: true } ? Name : never;
}[OptionName];

export const isListed = (name: OptionName): name is ListedOption => 'listed' in OPTIONS[name];

/** What to add to an option without a value, the same whether it is missing or empty. */
export function missingHint(option: OptionName) {
  const spec: Option = OPTIONS[option];
  return spec.missing ?? `Add a value to --${option}`;
}

type Options = typeof OPTIONS;
export type Switch = {
  [Name in OptionName]: Options[Name] extends { type: 'boolean' } ? Name : never;
}[OptionName];
export type Many = {
  [Name in OptionName]: Options[Name] extends { multiple: true } ? Name : never;
}[OptionName];
export type One = Exclude<OptionName, Switch | Many>;

/** What a new name looks like, for an option that takes one. */
export const NEW_NAME =
  'Add a new name in lower-case words joined by hyphens; the command lists the names already taken';

// Node's own test: '-' alone is a value, so only a dash with more after it starts an option.
export const isDashed = (arg: string | undefined) =>
  arg !== undefined && arg.length > 1 && arg.startsWith('-');

/**
 * @param name - the option
 * @param value - its value, from the call or the data folder
 * @returns ' --name value', or ' --name=value' when the value starts with a dash
 */
export function optionText(name: One, value: string) {
  return valueText(name, value);
}

/**
 * @param values - the options of a call as its arguments gave them; one left undefined is left out
 * @returns each option in the order given, a switch alone and a repeated one once per value
 */
export function optionsText(values: { [Name in OptionName]?: string | boolean | string[] }) {
  return Object.entries(values)
    .map(([name, value]) => givenText(name, value))
    .join('');
}

function givenText(name: string, value: string | boolean | string[] | undefined) {
  if (value === undefined || value === false) return '';
  if (value === true) return ` --${name}`;
  return [value]
    .flat()
    .map(one => valueText(name, one))
    .join('');
}

function valueText(name: string, value: string) {
  const word = shellWord(value);
  return isDashed(value) ? ` --${name}=${word}` : ` --${name} ${word}`;
}

// Only letters, digits and '_ . / -' stay bare; a visible value, '~' too, goes in single quotes.
// A value with a character that does not show as itself goes in $'…' with that character as
// escaped bytes, so the command stays one visible line that bash, zsh and ksh read back.
export function shellWord(word: string) {
  if (/^[\w./-]+$/.test(word)) return word;
  if (UNSAFE_CHAR.test(word) === false) return `'${word.replaceAll("'", `'\\''`)}'`;
  return `$'${[...word].map(escapedChar).join('')}'`;
}

// '\xHH' per UTF-8 byte: bash 3.2, the one macOS ships, knows no '\u' in $'…'.
function escapedChar(char: string) {
  if (char === '\\' || char === "'") return `\\${char}`;
  if (UNSAFE_CHAR.test(char) === false) return char;
  return [...Buffer.from(char)].map(byte => `\\x${byte.toString(16).padStart(2, '0')}`).join('');
}
