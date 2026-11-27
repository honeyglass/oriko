/**
 * The input of every edit command, as the cli takes it through --json or stdin.
 *
 * INPUT: one schema per command, by the command's name.
 *
 * @example const parsed = INPUT['block move'].safeParse(input);
 */
import { z } from 'zod';
import { CV_LIMITS } from '../core/cv.limits.ts';
import { Block, Id, Language, Page, Text } from '../core/cv.schema.ts';

const index = z.int().min(0).max(CV_LIMITS.items);

export const INPUT = {
  'block add': z.strictObject({ block: Block, before: Id.optional(), after: Id.optional() }),
  'block update': z.strictObject({ id: Id, set: z.record(z.string(), z.unknown()) }),
  'block remove': z.strictObject({ id: Id }),
  'block move': z.strictObject({
    id: Id,
    before: Id.optional(),
    after: Id.optional(),
    page: Page.nullable().optional(),
  }),
  'item add': z.strictObject({ block: Id, value: z.unknown(), index: index.optional() }),
  'item update': z.strictObject({ block: Id, index, value: z.unknown() }),
  'item remove': z.strictObject({ block: Id, index }),
  'item move': z.strictObject({ block: Id, index, to: index }),
  'cv update': z
    .strictObject({
      language: Language,
      pages: Page,
      person: z.strictObject({ firstName: Text, lastName: Text, role: Text }).partial(),
      contact: z.strictObject({ title: Text }),
    })
    .partial(),
  'contact add': z.strictObject({ value: z.unknown(), index: index.optional() }),
  'contact update': z.strictObject({ index, value: z.unknown() }),
  'contact remove': z.strictObject({ index }),
  'contact move': z.strictObject({ index, to: index }),
};
