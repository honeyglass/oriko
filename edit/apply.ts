/**
 * The edit commands on one CV: whole blocks, items inside a block, the person and the contact lines.
 *
 * apply: the CV after one command, or the issues that refuse it.
 * COMMANDS: the names of the commands.
 *
 * A command never changes the master it was given, and its result passes the same check as a
 * master file read from disk, so an edit cannot write what a later read would refuse.
 *
 * @example const edited = apply(master, 'block move', { id: 'awards', page: 2 });
 */
import { done, rejected } from '../core/errors.ts';
import type { Issue, Result } from '../core/errors.ts';
import * as issue from './issues.ts';
import * as coreIssue from '../core/issues.old.ts';
import { COLUMN } from '../core/cv.limits.ts';
import { check, patched } from '../core/check.ts';
import { Block, ContactItem, ITEM, ITEM_PATCH, Master } from '../core/cv.schema.ts';
import { INPUT } from './edit.schema.old.ts';

type Command = keyof typeof INPUT;
type Handler = (master: Master, input: unknown) => Result<Master>;

const HANDLERS: Record<Command, Handler> = {
  'block add': addBlock,
  'block update': updateBlock,
  'block remove': removeBlock,
  'block move': moveBlock,
  'item add': addItem,
  'item update': updateItem,
  'item remove': removeItem,
  'item move': moveItem,
  'cv update': updateCv,
  'contact add': addContact,
  'contact update': updateContact,
  'contact remove': removeContact,
  'contact move': moveContact,
};

export const COMMANDS = Object.keys(HANDLERS);

const isCommand = (name: string): name is Command => Object.hasOwn(HANDLERS, name);

/**
 * @param master - the parsed master file
 * @param command - the name of the command, such as 'item update'
 * @param input - the input of the command, unchecked
 * @returns the edited master file, checked like one read from disk
 */
export function apply(master: unknown, command: string, input: unknown): Result<Master> {
  if (isCommand(command) === false)
    return rejected('edit', [issue.unknownCommand(command, COMMANDS)]);
  const parsed = Master.safeParse(master);
  if (parsed.success === false)
    return rejected(command, coreIssue.schemaIssues(parsed.error, [], 'master'));
  const edited = HANDLERS[command](parsed.data, input);
  if (edited.error !== null) return edited;
  const checked = check(edited.data);
  if (checked.error !== null) return rejected(command, checked.error.issues);
  return edited;
}

function addBlock(master: Master, input: unknown): Result<Master> {
  const parsed = INPUT['block add'].safeParse(input);
  if (parsed.success === false)
    return rejected('block add', coreIssue.schemaIssues(parsed.error, [], 'block add'));
  const { block, before, after } = parsed.data;
  const issues = anchorIssues(master, block, before, after);
  if (issues.length > 0) return rejected('block add', issues);
  return done({ ...master, blocks: inserted(master.blocks, block, before, after) });
}

function updateBlock(master: Master, input: unknown): Result<Master> {
  const parsed = INPUT['block update'].safeParse(input);
  if (parsed.success === false)
    return rejected('block update', coreIssue.schemaIssues(parsed.error, [], 'block update'));
  const block = master.blocks.find(candidate => candidate.id === parsed.data.id);
  if (block === undefined)
    return rejected('block update', [coreIssue.unknownBlock(parsed.data.id, 'id')]);
  const issues: Issue[] = [];
  const changed = patched(block, parsed.data.set, issues);
  if (issues.length > 0) return rejected('block update', issues);
  return done(replaced(master, changed));
}

function removeBlock(master: Master, input: unknown): Result<Master> {
  const parsed = INPUT['block remove'].safeParse(input);
  if (parsed.success === false)
    return rejected('block remove', coreIssue.schemaIssues(parsed.error, [], 'block remove'));
  const { id } = parsed.data;
  const exists = master.blocks.some(block => block.id === id);
  if (exists === false) return rejected('block remove', [coreIssue.unknownBlock(id, 'id')]);
  return done({ ...master, blocks: master.blocks.filter(block => block.id !== id) });
}

function moveBlock(master: Master, input: unknown): Result<Master> {
  const parsed = INPUT['block move'].safeParse(input);
  if (parsed.success === false)
    return rejected('block move', coreIssue.schemaIssues(parsed.error, [], 'block move'));
  const { id, before, after, page } = parsed.data;
  const block = master.blocks.find(candidate => candidate.id === id);
  if (block === undefined) return rejected('block move', [coreIssue.unknownBlock(id, 'id')]);
  const hasNothing = before === undefined && after === undefined && page === undefined;
  if (hasNothing) return rejected('block move', [issue.nothingToDo()]);
  const issues = anchorIssues(master, block, before, after);
  const pinned = page === undefined ? block : patched(block, { page }, issues);
  if (issues.length > 0) return rejected('block move', issues);
  const others = master.blocks.filter(candidate => candidate.id !== id);
  const stays = before === undefined && after === undefined;
  return done(
    stays
      ? replaced(master, pinned)
      : { ...master, blocks: inserted(others, pinned, before, after) },
  );
}

const replaced = (master: Master, block: Block): Master => ({
  ...master,
  blocks: master.blocks.map(candidate => (candidate.id === block.id ? block : candidate)),
});

// An anchor is a block of the same column, since the order of a column is all a move can change.
function anchorIssues(
  master: Master,
  block: Block,
  before: string | undefined,
  after: string | undefined,
): Issue[] {
  if (before !== undefined && after !== undefined) return [issue.bothAnchors()];
  const id = before ?? after;
  if (id === undefined) return [];
  const path = before === undefined ? 'after' : 'before';
  const anchor = master.blocks.find(candidate => candidate.id === id);
  if (anchor === undefined) return [coreIssue.unknownBlock(id, path)];
  const column = COLUMN[block.kind];
  if (COLUMN[anchor.kind] === column) return [];
  const sameColumn = master.blocks.filter(
    candidate => COLUMN[candidate.kind] === column && candidate.id !== block.id,
  );
  const others = sameColumn.map(candidate => candidate.id);
  return [issue.otherColumn(block.id, id, column, path, others)];
}

// Without an anchor a block goes to the end, which is the end of its own column too.
function inserted(
  blocks: Block[],
  block: Block,
  before: string | undefined,
  after: string | undefined,
) {
  const id = before ?? after;
  if (id === undefined) return [...blocks, block];
  const at = blocks.findIndex(candidate => candidate.id === id) + (before === undefined ? 1 : 0);
  return [...blocks.slice(0, at), block, ...blocks.slice(at)];
}

function addItem(master: Master, input: unknown): Result<Master> {
  const parsed = INPUT['item add'].safeParse(input);
  if (parsed.success === false)
    return rejected('item add', coreIssue.schemaIssues(parsed.error, [], 'item add'));
  const block = master.blocks.find(candidate => candidate.id === parsed.data.block);
  if (block === undefined)
    return rejected('item add', [coreIssue.unknownBlock(parsed.data.block, 'block')]);
  const value = ITEM[block.kind].safeParse(parsed.data.value);
  if (value.success === false)
    return rejected('item add', coreIssue.schemaIssues(value.error, ['value'], 'item'));
  const items = added(itemsOf(block), value.data, parsed.data.index, 'item add');
  if (items.error !== null) return items;
  return withItems(master, block, items.data, 'item add');
}

function updateItem(master: Master, input: unknown): Result<Master> {
  const parsed = INPUT['item update'].safeParse(input);
  if (parsed.success === false)
    return rejected('item update', coreIssue.schemaIssues(parsed.error, [], 'item update'));
  const block = master.blocks.find(candidate => candidate.id === parsed.data.block);
  if (block === undefined)
    return rejected('item update', [coreIssue.unknownBlock(parsed.data.block, 'block')]);
  const value = ITEM_PATCH[block.kind].safeParse(parsed.data.value);
  if (value.success === false)
    return rejected('item update', coreIssue.schemaIssues(value.error, ['value'], 'item'));
  const items = updated(itemsOf(block), parsed.data.index, value.data, 'item update');
  if (items.error !== null) return items;
  return withItems(master, block, items.data, 'item update');
}

function removeItem(master: Master, input: unknown): Result<Master> {
  const parsed = INPUT['item remove'].safeParse(input);
  if (parsed.success === false)
    return rejected('item remove', coreIssue.schemaIssues(parsed.error, [], 'item remove'));
  const block = master.blocks.find(candidate => candidate.id === parsed.data.block);
  if (block === undefined)
    return rejected('item remove', [coreIssue.unknownBlock(parsed.data.block, 'block')]);
  const items = removed(itemsOf(block), parsed.data.index, 'item remove');
  if (items.error !== null) return items;
  return withItems(master, block, items.data, 'item remove');
}

function moveItem(master: Master, input: unknown): Result<Master> {
  const parsed = INPUT['item move'].safeParse(input);
  if (parsed.success === false)
    return rejected('item move', coreIssue.schemaIssues(parsed.error, [], 'item move'));
  const block = master.blocks.find(candidate => candidate.id === parsed.data.block);
  if (block === undefined)
    return rejected('item move', [coreIssue.unknownBlock(parsed.data.block, 'block')]);
  const items = moved(itemsOf(block), parsed.data.index, parsed.data.to, 'item move');
  if (items.error !== null) return items;
  return withItems(master, block, items.data, 'item move');
}

const itemsOf = (block: Block): unknown[] => (block.kind === 'job' ? block.bullets : block.items);

// The new items are unchecked, so the block passes its schema again before it enters the master.
function withItems(master: Master, block: Block, items: unknown[], step: string): Result<Master> {
  const candidate = block.kind === 'job' ? { ...block, bullets: items } : { ...block, items };
  const parsed = Block.safeParse(candidate);
  if (parsed.success === false)
    return rejected(step, coreIssue.schemaIssues(parsed.error, ['blocks', block.id], 'block'));
  return done(replaced(master, parsed.data));
}

// The photo stays out of reach here: 'oriko photo set' writes the picture and its path together.
function updateCv(master: Master, input: unknown): Result<Master> {
  const parsed = INPUT['cv update'].safeParse(input);
  if (parsed.success === false)
    return rejected('cv update', coreIssue.schemaIssues(parsed.error, [], 'cv update'));
  const { person, contact, ...rest } = parsed.data;
  return done({
    ...master,
    ...rest,
    person: { ...master.person, ...person },
    contact: { ...master.contact, ...contact },
  });
}

function addContact(master: Master, input: unknown): Result<Master> {
  const parsed = INPUT['contact add'].safeParse(input);
  if (parsed.success === false)
    return rejected('contact add', coreIssue.schemaIssues(parsed.error, [], 'contact add'));
  const value = ContactItem.safeParse(parsed.data.value);
  if (value.success === false)
    return rejected('contact add', coreIssue.schemaIssues(value.error, ['value'], 'contact'));
  const items = added(master.contact.items, value.data, parsed.data.index, 'contact add');
  if (items.error !== null) return items;
  return withContact(master, items.data, 'contact add');
}

function updateContact(master: Master, input: unknown): Result<Master> {
  const parsed = INPUT['contact update'].safeParse(input);
  if (parsed.success === false)
    return rejected('contact update', coreIssue.schemaIssues(parsed.error, [], 'contact update'));
  const value = ContactItem.partial().safeParse(parsed.data.value);
  if (value.success === false)
    return rejected('contact update', coreIssue.schemaIssues(value.error, ['value'], 'contact'));
  const items = updated(master.contact.items, parsed.data.index, value.data, 'contact update');
  if (items.error !== null) return items;
  return withContact(master, items.data, 'contact update');
}

function removeContact(master: Master, input: unknown): Result<Master> {
  const parsed = INPUT['contact remove'].safeParse(input);
  if (parsed.success === false)
    return rejected('contact remove', coreIssue.schemaIssues(parsed.error, [], 'contact remove'));
  const items = removed(master.contact.items, parsed.data.index, 'contact remove');
  if (items.error !== null) return items;
  return withContact(master, items.data, 'contact remove');
}

function moveContact(master: Master, input: unknown): Result<Master> {
  const parsed = INPUT['contact move'].safeParse(input);
  if (parsed.success === false)
    return rejected('contact move', coreIssue.schemaIssues(parsed.error, [], 'contact move'));
  const items = moved(master.contact.items, parsed.data.index, parsed.data.to, 'contact move');
  if (items.error !== null) return items;
  return withContact(master, items.data, 'contact move');
}

// The new lines are unchecked, so the master passes its schema again before it is answered.
function withContact(master: Master, items: unknown[], step: string): Result<Master> {
  const parsed = Master.safeParse({ ...master, contact: { ...master.contact, items } });
  if (parsed.success === false)
    return rejected(step, coreIssue.schemaIssues(parsed.error, [], 'master'));
  return done(parsed.data);
}

// ---------- one place for every edit of a list by position ----------

function added(
  items: unknown[],
  value: unknown,
  at: number | undefined,
  step: string,
): Result<unknown[]> {
  const index = at ?? items.length;
  if (index > items.length) return rejected(step, [issue.outOfRange('index', index, items.length)]);
  return done([...items.slice(0, index), value, ...items.slice(index)]);
}

function updated(
  items: unknown[],
  index: number,
  change: unknown,
  step: string,
): Result<unknown[]> {
  if (index >= items.length)
    return rejected(step, [issue.outOfRange('index', index, items.length - 1)]);
  return done(items.map((item, at) => (at === index ? merged(item, change) : item)));
}

// A text item is replaced; an item with fields keeps the fields the input leaves out.
function merged(item: unknown, change: unknown) {
  const haveFields =
    typeof item === 'object' && item !== null && typeof change === 'object' && change !== null;
  return haveFields ? { ...item, ...change } : change;
}

function removed(items: unknown[], index: number, step: string): Result<unknown[]> {
  if (index >= items.length)
    return rejected(step, [issue.outOfRange('index', index, items.length - 1)]);
  return done(items.filter((_, at) => at !== index));
}

function moved(items: unknown[], index: number, to: number, step: string): Result<unknown[]> {
  const last = items.length - 1;
  if (index > last) return rejected(step, [issue.outOfRange('index', index, last)]);
  if (to > last) return rejected(step, [issue.outOfRange('to', to, last)]);
  const rest = items.filter((_, at) => at !== index);
  return done([...rest.slice(0, to), items[index], ...rest.slice(to)]);
}
