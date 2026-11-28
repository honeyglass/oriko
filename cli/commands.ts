/**
 * The one table of oriko's commands, so parsing, checks, schema and lists agree.
 *
 * EVERYWHERE: the options every command takes.
 * COMMANDS, CommandName, Command: every command with what it does, its options, words and input.
 * SHAPES: the shapes a caller writes that no command takes whole, such as a profile or an item.
 * OUTPUTS, isOutput: the forms an answer comes in, and whether a name is one of them.
 *
 * A command takes only the options it lists, plus EVERYWHERE; any other is the caller's mistake.
 *
 * @example const { options, input } = COMMANDS['block add'];
 */
import type { ZodType } from 'zod';
import { Block, ContactItem, Item, Master, NewCv, Profile } from '../core/cv.schema.ts';
import { INPUT } from '../edit/edit.schema.old.ts';
import type { OptionName } from '../core/options.old.ts';

export const EVERYWHERE: OptionName[] = ['home', 'output'];

export type Command = {
  does: string;
  options: OptionName[];
  /** The options the command refuses to run without. */
  required?: OptionName[];
  /** The options another option needs beside it, such as --profile beside --posting for read. */
  requiredWith?: Partial<Record<OptionName, OptionName[]>>;
  /** The words after the command's name, such as the file of photo set. */
  words?: string[];
  /** The words after the name are one value, such as the command schema shows. */
  joinsWords?: true;
  /** The input read from --json or stdin. */
  input?: ZodType;
};

const EDIT: OptionName[] = ['cv', 'json', 'dry-run'];

const edit = (does: string, input: ZodType): Command => ({ does, options: EDIT, input });

export const COMMANDS = {
  schema: {
    does: 'lists every command and option, or the input of one command',
    options: [],
    words: ['name'],
    joinsWords: true,
  },
  cvs: { does: 'lists the CVs and whether each fits its pages', options: [] },
  init: {
    does: 'creates a CV',
    options: ['cv', 'json', 'dry-run'],
    required: ['cv'],
    input: NewCv,
  },
  show: { does: 'outlines a CV, or shows one block in full', options: ['cv', 'profile', 'block'] },
  profiles: { does: 'lists the profiles and whether each fits its pages', options: [] },
  plan: { does: 'places every block on the pages', options: ['cv', 'profile'] },
  preview: { does: 'draws the pages in the terminal', options: ['cv', 'profile', 'credits'] },
  build: {
    does: 'writes the Word file, or its PDF through LibreOffice',
    options: ['cv', 'profile', 'out', 'style', 'credits', 'dry-run'],
    required: ['out'],
  },
  read: {
    does: 'reads a posting, notes or an old CV from a file or an https address',
    options: ['cv', 'profile', 'posting', 'notes', 'resume', 'replace', 'dry-run'],
    requiredWith: { posting: ['profile'] },
  },
  'profile set': {
    does: 'stores the profile of one job posting, checked against its CV',
    options: ['profile', 'json', 'replace', 'dry-run'],
    required: ['profile'],
    input: Profile,
  },
  'profile show': {
    does: 'shows a stored profile and the posting read for it',
    options: ['profile'],
    required: ['profile'],
  },
  'photo set': {
    does: 'stores the square photo of a CV, or of one profile',
    options: ['cv', 'profile', 'dry-run'],
    words: ['file'],
  },
  'block add': edit('adds a block, such as a job or a skill group', INPUT['block add']),
  'block update': edit('changes fields of a block', INPUT['block update']),
  'block remove': edit('removes a block', INPUT['block remove']),
  'block move': edit('moves a block, or pins it to a page', INPUT['block move']),
  'item add': edit('adds a bullet, a skill or an entry to a block', INPUT['item add']),
  'item update': edit('changes one item of a block', INPUT['item update']),
  'item remove': edit('removes one item of a block', INPUT['item remove']),
  'item move': edit('moves one item inside its block', INPUT['item move']),
  'cv update': edit(
    'changes the language, the pages, the person or the contact title',
    INPUT['cv update'],
  ),
  'contact add': edit('adds a contact line', INPUT['contact add']),
  'contact update': edit('changes a contact line', INPUT['contact update']),
  'contact remove': edit('removes a contact line', INPUT['contact remove']),
  'contact move': edit('moves a contact line', INPUT['contact move']),
} satisfies Record<string, Command>;

export type CommandName = keyof typeof COMMANDS;

export const SHAPES = {
  master: Master,
  profile: Profile,
  block: Block,
  item: Item,
  contact: ContactItem,
};

export const OUTPUTS = ['json', 'text'] as const;

export const isOutput = (output: string) => OUTPUTS.some(known => known === output);
