/**
 * The shape of everything that enters from outside: the master file, a profile and their parts.
 *
 * Master, Profile: one CV with every block, and the changes of one job posting.
 * NewCv: what 'oriko init' needs to create a CV.
 * Block, PATCH, ITEM, ITEM_PATCH: one block, and what may change in a block or in one item, per kind.
 * Item, ContactItem: one item of any kind, and one contact line, as `oriko schema` shows them.
 *
 * Every text is one visible line: a control or an invisible character is refused, so no text
 * hides in the document or forges a line of output.
 *
 * @example const parsed = Master.safeParse(JSON.parse(text));
 */
import { isAbsolute, normalize, sep } from 'node:path';
import { UNSAFE_CHAR } from '@honeyglass/utils/ts';
import { z } from 'zod';
import { CV_LIMITS, ICONS } from './cv.limits.ts';

const isVisibleLine = (value: string) => value.trim() !== '' && UNSAFE_CHAR.test(value) === false;

const text = z
  .string()
  .max(CV_LIMITS.text)
  .refine(isVisibleLine, 'Expected one line of visible text');
const id = z
  .string()
  .max(60)
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    'Expected lower-case words joined by hyphens, such as additional-skills',
  );
const level = z.int().min(0).max(CV_LIMITS.level);
const page = z.int().min(1).max(CV_LIMITS.pages);
const link = z
  .string()
  .max(CV_LIMITS.text)
  .regex(/^https:\/\/\S+$/, 'Expected an https:// address')
  .refine(isVisibleLine, 'Expected one line of visible text');

// `page` is the earliest page a block may start on; the blocks after it follow.
const common = { id, section: text, page: page.optional(), hidden: z.boolean().optional() };
const items = <Item extends z.ZodType>(item: Item) => z.array(item).min(1).max(CV_LIMITS.items);

const RatedItem = z.strictObject({ name: text, level });
const EntryItem = z.strictObject({ title: text, note: text });

const Job = z.strictObject({
  ...common,
  kind: z.literal('job'),
  from: text,
  to: text,
  title: text,
  place: text,
  employer: text,
  bullets: z.array(text).max(CV_LIMITS.items),
});
// A right-column block may leave out its title when it is the only block of its section.
const Rated = z.strictObject({
  ...common,
  kind: z.literal('rated'),
  title: text.optional(),
  items: items(RatedItem),
});
const List = z.strictObject({
  ...common,
  kind: z.literal('list'),
  title: text.optional(),
  items: items(text),
});
const Entries = z.strictObject({
  ...common,
  kind: z.literal('entries'),
  title: text.optional(),
  items: items(EntryItem),
});

export const Block = z.discriminatedUnion('kind', [Job, Rated, List, Entries]);
export type Block = z.output<typeof Block>;

// In a patch, null removes an optional field. The id and the kind of a block never change.
const fixed = { id: true, kind: true } as const;
const removable = { page: page.nullable(), hidden: z.boolean().nullable() };
const untitled = { ...removable, title: text.nullable() };
export const PATCH = {
  job: Job.omit(fixed).extend(removable).partial(),
  rated: Rated.omit(fixed).extend(untitled).partial(),
  list: List.omit(fixed).extend(untitled).partial(),
  entries: Entries.omit(fixed).extend(untitled).partial(),
};

export const ITEM = { job: text, rated: RatedItem, list: text, entries: EntryItem };
export const ITEM_PATCH = {
  job: text,
  rated: RatedItem.partial(),
  list: text,
  entries: EntryItem.partial(),
};

// An item's shape depends on the kind of its block, so the one shape lists the kinds' shapes.
export const Item = z
  .union([ITEM.job, ITEM.rated, ITEM.entries])
  .describe('job and list blocks take text, rated blocks {name, level}, entries {title, note}');

// A path inside the data folder, written relative to it, on one visible line like every text.
// This is its shape only; the place that opens the file checks where a link in it leads.
const photo = z
  .string()
  .max(200)
  .refine(isVisibleLine, 'Expected one line of visible text')
  .refine(isInsidePath, 'Expected a path inside the data folder, relative to it');

function isInsidePath(path: string) {
  const [first] = normalize(path).split(sep);
  return isAbsolute(path) === false && first !== '..';
}

export const ContactItem = z.strictObject({
  icon: z.enum(ICONS),
  lines: z.array(text).min(1).max(3),
  link: link.optional(),
});

/** An ISO 639-1 code such as 'en' or 'de', so an agent can pick the CV in the posting's language. */
const language = z
  .string()
  .regex(/^[a-z]{2}$/, 'Expected a two-letter language code, such as en or de');

export const Master = z.strictObject({
  language,
  person: z.strictObject({ firstName: text, lastName: text, role: text, photo }),
  contact: z.strictObject({ title: text, items: z.array(ContactItem).max(8) }),
  pages: page,
  blocks: z.array(Block).max(CV_LIMITS.blocks),
});
export type Master = z.output<typeof Master>;

export const NewCv = z.strictObject({ language, firstName: text, lastName: text, role: text });

export const Profile = z.strictObject({
  cv: id.optional(),
  person: z.strictObject({ role: text, photo }).partial().optional(),
  order: z.array(id).max(CV_LIMITS.blocks).optional(),
  blocks: z.record(z.string(), z.unknown()).optional(),
});
export type Profile = z.output<typeof Profile>;

export { id as Id, language as Language, page as Page, text as Text };
