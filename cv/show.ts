/**
 * The command `oriko show` on adx: the outline of one CV, or one of its blocks in full.
 *
 * show: the command, which the tool lists under the word show.
 *
 * One command with two answers, as before: the outline without `--block`, the one block with it,
 * so every field of its output is optional. The CV is read through the root `home` and checked
 * against its shape; a profile only names the CV. `--block` has a source, so adx refuses an id
 * the CV lacks before the command runs.
 *
 * @example const { exit, out } = await run(oriko, ['show', '--cv', 'jane', '--block', 'awards']);
 */
import { read } from '@honeyglass/adx';
import type { Step } from '@honeyglass/adx';
import { shown } from '@honeyglass/utils/ts';
import { z } from 'zod';
import { COLUMN, KINDS } from '../core/cv.limits.ts';
import { Block, Id, Page, Text } from '../core/cv.schema.ts';
import { unknownBlock } from '../core/issues.ts';
import { shownCv } from '../core/load.ts';
import { cv, profile } from '../core/options.ts';
import { blockChoices, cvChoices, profileOfCvChoices } from '../core/sources.ts';

// What a caller needs to pick a block: never its whole text.
const Outline = z.object({
  id: Id.describe('the id of the block'),
  kind: z.enum(KINDS).describe('its kind'),
  column: z.enum(['left', 'right']).describe('the column it stands in'),
  section: Text.describe('the section it stands in'),
  title: Text.optional().describe('its title'),
  page: Page.optional().describe('the earliest page it may start on'),
  hidden: z.boolean().optional().describe('whether it is hidden'),
  items: z.number().describe('how many bullets or items the block holds'),
});

export const show = read({
  does: 'outlines a CV, or shows one block in full',
  input: z.object({
    cv,
    profile,
    block: Id.optional().describe('the id of one block to show in full'),
  }),
  values: { cv: cvChoices, profile: profileOfCvChoices, block: blockChoices },
  output: z.object({
    cv: z.string().optional().describe('the name of the CV, without --block'),
    pages: Page.optional().describe('the pages the CV may fill, without --block'),
    blocks: z.array(Outline).optional().describe('the outline, without --block'),
    block: Block.optional().describe('the one block, with --block'),
  }),
  run: async ({ cv, profile, block }, { refuse }) => {
    const chosen = await shownCv(cv, profile);
    if (Array.isArray(chosen)) return refuse(...chosen);
    const { blocks, pages } = chosen.master;
    if (block === undefined) return { cv: chosen.name, pages, blocks: blocks.map(outline) };
    // adx found the id among the blocks before; only a change of the file since then misses it.
    const found = blocks.find(candidate => candidate.id === block);
    if (found === undefined)
      return refuse(unknownBlock.at('block', `No block has the id ${shown(block)}`));
    return { block: found };
  },
  // The step names this command itself, so the function says its type (adx guide, "Known limits").
  next: (out, { cv, profile }): Step[] =>
    out.block === undefined ? [show.step({ cv, profile }).needs('block')] : [],
});

const outline = (block: Block) => ({
  id: block.id,
  kind: block.kind,
  column: COLUMN[block.kind],
  section: block.section,
  title: block.title,
  page: block.page,
  hidden: block.hidden,
  items: block.kind === 'job' ? block.bullets.length : block.items.length,
});
