/**
 * The page plan on adx: which block lands on which page, in which column, as a schema.
 *
 * Plan: the answer of `oriko plan`, which `schema` shows and `--fields` cuts.
 * place: the plan of a checked CV, or the issues of what does not fit, each below its file.
 * fit, Fit: whether a CV an edit changed still fits its pages, answered and not refused.
 *
 * The algorithm stays in place.old.ts, which the commands on the old shell still call.
 *
 * @example const placed = place(await checked(cv, profile));
 */
import { z } from 'zod';
import { check } from './check.ts';
import type { Master } from './cv.schema.ts';
import type { Issue } from './errors.ts';
import { raised } from './issues.ts';
import type { Issues, Stored } from './issues.ts';
import { fileOf } from './load.ts';
import type { Checked } from './load.ts';
import { place as placeOld } from './place.old.ts';

const Heading = z.object({
  text: z.string().describe('the title of the section'),
  before: z.number().describe('the space above it in DXA'),
  after: z.number().describe('the space below it in DXA'),
});
const Placed = z.object({
  id: z.string().describe('the id of the block'),
  height: z.number().describe('its height in pt, its heading included'),
  heading: Heading.nullable().describe('the section heading above it, if it starts one'),
});
const Column = z.object({
  used: z.number().describe('the pt the blocks take'),
  free: z.number().describe('the pt left on the page'),
  blocks: z.array(Placed).describe('the blocks of the column, from the top'),
});
export const Plan = z.object({
  pages: z.array(z.object({ left: Column, right: Column })).describe('one entry per page'),
});

/**
 * @param checked - a checked CV, hidden blocks already left out, and its two files as read
 * @returns the plan; ROLE_TOO_LONG, BLOCK_TOO_TALL and PAGE_OVERFLOW below the file they lie in,
 *   such as `cv.pages`
 */
export function place({ master, cv, profile }: Checked): z.output<typeof Plan> | Issues<Stored> {
  const placed = placeOld(master);
  return placed.error === null ? placed.data : raised(fileOf(cv, profile), placed.error);
}

/** Whether a CV fits its pages, and what the check or the page plan would refuse in it. */
export type Fit = { fits: boolean; layout: Issue[] };

/**
 * An edit may make a CV too long, and the edit still stands, so this answers and refuses nothing.
 * `layout` holds the issues as the pure code answers them, with their paths into the CV.
 *
 * @param master - a CV that passed its schema
 * @returns whether it fits, and the issues of the check or of the page plan, if any
 */
export function fit(master: Master): Fit {
  const cv = check(master);
  const placed = cv.error === null ? placeOld(cv.data) : cv;
  return { fits: placed.error === null, layout: placed.error?.issues ?? [] };
}
