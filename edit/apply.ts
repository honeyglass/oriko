/**
 * One edit applied to a CV: whole blocks, items inside a block, the person and the contact lines.
 *
 * apply: the CV after one edit, or the issues that refuse it, each at a field of the edit.
 *
 * An edit never changes the CV it was given, and its result passes the same check as a CV read
 * from disk, so an edit cannot write what a later read would refuse. An issue that lies in the
 * CV stands below `cv`, such as `cv.blocks.skills.items`; one the edit brings in stands at the
 * field that names the change, such as `block.id` for a duplicate id (adx decision 69). A part
 * whose shape the kind of the block picks is checked with adx's check (adx decision 78).
 *
 * @example const edited = apply(master, 'block move', { id: 'awards', page: 2 });
 */
import { check } from '@honeyglass/adx';
import type { Field, Issue } from '@honeyglass/adx';
import { shown } from '@honeyglass/utils/ts';
import type { z } from 'zod';
import { check as checkCv, laidOver } from '../core/check.ts';
import { COLUMN } from '../core/cv.limits.ts';
import { Block, ContactItem, ITEM, ITEM_PATCH, Item, Master, PATCH } from '../core/cv.schema.ts';
import type { Issue as Found } from '../core/errors.ts';
import { issueAt, unknownBlock } from '../core/issues.ts';
import type { Issues } from '../core/issues.ts';
import type { EditName, INPUT } from './edit.schema.ts';
import * as issue from './issues.ts';

type Input<N extends EditName> = z.output<(typeof INPUT)[N]>;
type Refused<N extends EditName> = Issues<Field<(typeof INPUT)[N]>>;
type Handlers = { [N in EditName]: (master: Master, input: Input<N>) => Master | Refused<N> };

const HANDLERS: Handlers = {
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

/**
 * @param master - the CV as stored, past its schema
 * @param command - the name of the edit, such as 'item update'
 * @param input - the input of the edit, past the schema of its command
 * @returns the edited CV, checked like one read from disk, or every issue of the first check
 *   that failed
 */
export function apply<N extends EditName>(
  master: Master,
  command: N,
  input: Input<N>,
): Master | Refused<N> {
  const handler: Handlers[N] = HANDLERS[command];
  return handler(master, input);
}

/**
 * The check of a CV read from disk, on the edited CV. An issue the CV raised before the edit
 * lies in the CV; any other the edit brought, at the field that names what it changed. Only a
 * block edit can bring one, so every other edit names `cv`.
 */
function checked<F extends string>(
  before: Master,
  after: Master,
  changed: F,
): Master | Issues<F | 'cv'> {
  const result = checkCv(after);
  if (result.error === null) return after;
  const old = new Set((checkCv(before).error?.issues ?? []).map(keyOf));
  const [first, ...rest] = result.error.issues.map(found =>
    old.has(keyOf(found)) ? inCv(found) : broughtIn(found, changed),
  );
  return first === undefined ? after : [first, ...rest];
}

const keyOf = (found: Found) => `${found.code} ${found.path}`;

const inCv = (found: Found) => issueAt(['cv', ...found.path.split('.')], found, Master);

// A duplicate id lies in the id of the new block; any other issue in the change as a whole.
const broughtIn = <F extends string>(found: Found, changed: F) =>
  issueAt(found.code === 'DUPLICATE_ID' ? [changed, 'id'] : [changed], found, Master);

const missing = <F extends string>(field: F, id: string) =>
  unknownBlock.at(field, `No block has the id ${shown(id)}`);

function addBlock(master: Master, input: Input<'block add'>): Master | Refused<'block add'> {
  const { block, before, after } = input;
  const anchor = anchorIssue(master, block, before, after);
  if (anchor !== undefined) return [anchor];
  return checked(
    master,
    { ...master, blocks: inserted(master.blocks, block, before, after) },
    'block',
  );
}

function updateBlock(
  master: Master,
  input: Input<'block update'>,
): Master | Refused<'block update'> {
  const block = master.blocks.find(candidate => candidate.id === input.id);
  if (block === undefined) return [missing('id', input.id)];
  const patch = check(PATCH[block.kind], input.set, ['set'], { as: Block });
  if (patch.issues !== null) return patch.issues;
  const changed = check(Block, laidOver(block, patch.data), ['set']);
  if (changed.issues !== null) return changed.issues;
  return checked(master, replaced(master, changed.data), 'set');
}

function removeBlock(
  master: Master,
  input: Input<'block remove'>,
): Master | Refused<'block remove'> {
  const exists = master.blocks.some(block => block.id === input.id);
  if (exists === false) return [missing('id', input.id)];
  const blocks = master.blocks.filter(block => block.id !== input.id);
  return checked(master, { ...master, blocks }, 'id');
}

function moveBlock(master: Master, input: Input<'block move'>): Master | Refused<'block move'> {
  const { id, before, after, page } = input;
  const block = master.blocks.find(candidate => candidate.id === id);
  if (block === undefined) return [missing('id', id)];
  const hasNothing = before === undefined && after === undefined && page === undefined;
  if (hasNothing) return [issue.nothingToDo.issue('The input names no new place for the block')];
  const anchor = anchorIssue(master, block, before, after);
  if (anchor !== undefined) return [anchor];
  // The page passed the input's schema, so the block with it passes its own.
  const pinned = page === undefined ? block : Block.parse(laidOver(block, { page }));
  const others = master.blocks.filter(candidate => candidate.id !== id);
  const stays = before === undefined && after === undefined;
  const blocks = stays ? replaced(master, pinned).blocks : inserted(others, pinned, before, after);
  return checked(master, { ...master, blocks }, 'id');
}

const replaced = (master: Master, block: Block): Master => ({
  ...master,
  blocks: master.blocks.map(candidate => (candidate.id === block.id ? block : candidate)),
});

// An anchor is a block of the same column, since the order of a column is all a move can change.
function anchorIssue(
  master: Master,
  block: Block,
  before: string | undefined,
  after: string | undefined,
): Issue<'before' | 'after'> | undefined {
  if (before !== undefined && after !== undefined)
    return issue.bothAnchors.at('after', 'The input names two anchors');
  const id = before ?? after;
  if (id === undefined) return undefined;
  const path = before === undefined ? 'after' : 'before';
  const anchor = master.blocks.find(candidate => candidate.id === id);
  if (anchor === undefined) return missing(path, id);
  const column = COLUMN[block.kind];
  if (COLUMN[anchor.kind] === column) return undefined;
  const others = master.blocks
    .filter(candidate => COLUMN[candidate.kind] === column && candidate.id !== block.id)
    .map(candidate => candidate.id);
  const message = `The block ${shown(block.id)} stands in the ${column} column, the anchor ${shown(id)} does not; the anchors of the ${column} column: ${others.join(', ')}`;
  return issue.otherColumn.at(path, message);
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

function addItem(master: Master, input: Input<'item add'>): Master | Refused<'item add'> {
  const block = master.blocks.find(candidate => candidate.id === input.block);
  if (block === undefined) return [missing('block', input.block)];
  const value = check(ITEM[block.kind], input.value, ['value'], { as: Item });
  if (value.issues !== null) return value.issues;
  const items = added(itemsOf(block), value.data, input.index);
  if (Array.isArray(items) === false) return [items];
  return withItems(master, block, items);
}

function updateItem(master: Master, input: Input<'item update'>): Master | Refused<'item update'> {
  const block = master.blocks.find(candidate => candidate.id === input.block);
  if (block === undefined) return [missing('block', input.block)];
  const value = check(ITEM_PATCH[block.kind], input.value, ['value'], { as: Item });
  if (value.issues !== null) return value.issues;
  const items = updated(itemsOf(block), input.index, value.data);
  if (Array.isArray(items) === false) return [items];
  return withItems(master, block, items);
}

function removeItem(master: Master, input: Input<'item remove'>): Master | Refused<'item remove'> {
  const block = master.blocks.find(candidate => candidate.id === input.block);
  if (block === undefined) return [missing('block', input.block)];
  const items = removed(itemsOf(block), input.index);
  if (Array.isArray(items) === false) return [items];
  return withItems(master, block, items);
}

function moveItem(master: Master, input: Input<'item move'>): Master | Refused<'item move'> {
  const block = master.blocks.find(candidate => candidate.id === input.block);
  if (block === undefined) return [missing('block', input.block)];
  const items = moved(itemsOf(block), input.index, input.to);
  if (Array.isArray(items) === false) return [items];
  return withItems(master, block, items);
}

const itemsOf = (block: Block): unknown[] => (block.kind === 'job' ? block.bullets : block.items);

// The new items are unchecked, so the block passes its schema again before it enters the CV.
function withItems(master: Master, block: Block, items: unknown[]): Master | Issues<'cv'> {
  const candidate = block.kind === 'job' ? { ...block, bullets: items } : { ...block, items };
  const parsed = check(Block, candidate, ['cv', 'blocks', block.id]);
  if (parsed.issues !== null) return parsed.issues;
  return checked(master, replaced(master, parsed.data), 'cv');
}

// The photo stays out of reach here: 'oriko photo set' writes the picture and its path together.
function updateCv(master: Master, input: Input<'cv update'>): Master | Refused<'cv update'> {
  const { cv, person, contact, ...rest } = input;
  const edited = {
    ...master,
    ...rest,
    person: { ...master.person, ...person },
    contact: { ...master.contact, ...contact },
  };
  return checked(master, edited, 'cv');
}

function addContact(master: Master, input: Input<'contact add'>): Master | Refused<'contact add'> {
  const items = added(master.contact.items, input.value, input.index);
  if (Array.isArray(items) === false) return [items];
  return withContact(master, items);
}

function updateContact(
  master: Master,
  input: Input<'contact update'>,
): Master | Refused<'contact update'> {
  const value = check(ContactItem.partial(), input.value, ['value'], { as: ContactItem });
  if (value.issues !== null) return value.issues;
  const items = updated(master.contact.items, input.index, value.data);
  if (Array.isArray(items) === false) return [items];
  return withContact(master, items);
}

function removeContact(
  master: Master,
  input: Input<'contact remove'>,
): Master | Refused<'contact remove'> {
  const items = removed(master.contact.items, input.index);
  if (Array.isArray(items) === false) return [items];
  return withContact(master, items);
}

function moveContact(
  master: Master,
  input: Input<'contact move'>,
): Master | Refused<'contact move'> {
  const items = moved(master.contact.items, input.index, input.to);
  if (Array.isArray(items) === false) return [items];
  return withContact(master, items);
}

// The new lines are unchecked, so the CV passes its schema again before it is answered.
function withContact(master: Master, items: unknown[]): Master | Issues<'cv'> {
  const parsed = check(Master, { ...master, contact: { ...master.contact, items } }, ['cv']);
  if (parsed.issues !== null) return parsed.issues;
  return checked(master, parsed.data, 'cv');
}

// ---------- one place for every edit of a list by position ----------

function added(items: unknown[], value: unknown, at: number | undefined) {
  const index = at ?? items.length;
  if (index > items.length) return outOfRange('index', index, items.length);
  return [...items.slice(0, index), value, ...items.slice(index)];
}

function updated(items: unknown[], index: number, change: unknown) {
  if (index >= items.length) return outOfRange('index', index, items.length - 1);
  return items.map((item, at) => (at === index ? mergedItem(item, change) : item));
}

// A text item is replaced; an item with fields keeps the fields the input leaves out.
function mergedItem(item: unknown, change: unknown) {
  const haveFields =
    typeof item === 'object' && item !== null && typeof change === 'object' && change !== null;
  return haveFields ? { ...item, ...change } : change;
}

function removed(items: unknown[], index: number) {
  if (index >= items.length) return outOfRange('index', index, items.length - 1);
  return items.filter((_, at) => at !== index);
}

function moved(items: unknown[], index: number, to: number) {
  const last = items.length - 1;
  if (index > last) return outOfRange('index', index, last);
  if (to > last) return outOfRange('to', to, last);
  const rest = items.filter((_, at) => at !== index);
  return [...rest.slice(0, to), items[index], ...rest.slice(to)];
}

// `last` is the highest place the edit takes; for an add it is the one past the end, which appends.
function outOfRange<F extends 'index' | 'to'>(path: F, index: number, last: number) {
  const takes = last < 0 ? 'the list is empty' : `the edit takes the places 0 to ${last}`;
  return issue.outOfRange.at(path, `There is no place ${index} for this edit; ${takes}`);
}
