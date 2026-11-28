/**
 * The input of every edit command on adx: the CV it changes, and the edit itself.
 *
 * INPUT, EditName: one schema per command, by the command's name, and the names.
 *
 * `--cv` and `--json` fill one object, so a call reads as before:
 * `oriko block move --cv jane --json '{"id":"awards","page":2}'`. A part whose shape the kind of
 * a stored block picks, such as an item, says `unknown` here, and apply.ts checks it once it found
 * the block.
 *
 * @example const input = INPUT['block move'];
 */
import { z } from 'zod';
import { CV_LIMITS } from '../core/cv.limits.ts';
import { Block, ContactItem, Id, Language, Page, Text } from '../core/cv.schema.ts';
import { cv } from '../core/options.ts';

const index = z.int().min(0).max(CV_LIMITS.items);

export const INPUT = {
  'block add': z.strictObject({ cv, block: Block, before: Id.optional(), after: Id.optional() }),
  'block update': z.strictObject({ cv, id: Id, set: z.record(z.string(), z.unknown()) }),
  'block remove': z.strictObject({ cv, id: Id }),
  // `page` stays a field: an effect has no --page of adx (adx decision 71).
  'block move': z.strictObject({
    cv,
    id: Id,
    before: Id.optional(),
    after: Id.optional(),
    page: Page.nullable().optional(),
  }),
  'item add': z.strictObject({ cv, block: Id, value: z.unknown(), index: index.optional() }),
  'item update': z.strictObject({ cv, block: Id, index, value: z.unknown() }),
  'item remove': z.strictObject({ cv, block: Id, index }),
  'item move': z.strictObject({ cv, block: Id, index, to: index }),
  'cv update': z.strictObject({
    cv,
    language: Language.optional(),
    pages: Page.optional(),
    person: z.strictObject({ firstName: Text, lastName: Text, role: Text }).partial().optional(),
    contact: z.strictObject({ title: Text }).optional(),
  }),
  'contact add': z.strictObject({ cv, value: ContactItem, index: index.optional() }),
  // A change of a contact line is a part of one, and only the whole shape stands in `shapes`.
  'contact update': z.strictObject({ cv, index, value: z.unknown() }),
  'contact remove': z.strictObject({ cv, index }),
  'contact move': z.strictObject({ cv, index, to: index }),
};

export type EditName = keyof typeof INPUT;
