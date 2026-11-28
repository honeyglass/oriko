/**
 * The page plan: which block lands on which page, in which column, each block whole.
 *
 * Plan, Column, Placed, Heading: the plan and its parts, as a schema `oriko plan` answers and
 * as the types the renderers read.
 * pagePlan: the plan of a checked CV, or the blocks that do not fit, with paths into the CV.
 * place: the same on adx, each issue below the file it lies in, such as `cv.pages`.
 * fileOf: the file an issue of the check or of the page plan lies in.
 * fit, Fit: whether a CV an edit changed still fits its pages, answered and not refused.
 *
 * A column fills from the top, block by block. A block that no longer fits goes to the next
 * page as a whole, with its section heading; it is never split.
 *
 * @example const placed = place(await checked(cv, profile));
 */
import { z } from 'zod';
import { check } from './check.ts';
import { COLUMN } from './cv.limits.ts';
import type { Block, Master } from './cv.schema.ts';
import { done, rejected } from './errors.ts';
import type { Issue, Result } from './errors.ts';
import { raised } from './issues.ts';
import type { Issues, Stored } from './issues.ts';
import * as issue from './issues.data.ts';
import type { Checked } from './load.ts';
import { blockHeight, contactHeight, roleLines } from './measure.ts';
import { COLUMN_HEIGHT, LEFT_START, LINE, SPACE, pt } from './metrics.ts';

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

/** A section heading above a block, with its spacing in DXA. */
export type Heading = z.output<typeof Heading>;
/** A block on a page; the height includes the heading, in pt. */
export type Placed = z.output<typeof Placed>;
export type Column = z.output<typeof Column>;
export type Plan = z.output<typeof Plan>;

/**
 * @param checked - a checked CV, hidden blocks already left out, and its two files as read
 * @returns the plan; ROLE_TOO_LONG, BLOCK_TOO_TALL and PAGE_OVERFLOW below the file they lie in,
 *   such as `cv.pages`
 */
export function place({ master, cv, profile }: Checked): Plan | Issues<Stored> {
  const placed = pagePlan(master);
  return placed.error === null ? placed.data : raised(fileOf(cv, profile), placed.error);
}

/**
 * An issue the CV alone raises lies in the CV. Any other lies in the profile when the profile
 * holds a value at its path, and in the CV otherwise, so a path always leads to a value in the
 * file its first part names: a long role the profile sets is `profile.person.role`, and a page
 * overflow the profile causes stays `cv.pages`, since a profile holds no `pages`.
 *
 * @param cv - the CV as its file holds it
 * @param profile - the profile as its file holds it, or nothing
 * @returns the file of each issue of the check, of the page plan or of the photo, with the
 *   profile applied
 */
export function fileOf(cv: unknown, profile: unknown): (found: Found) => Stored {
  if (profile === undefined) return () => 'cv';
  const own = new Set(aloneIssues(cv).map(keyOf));
  return found =>
    own.has(keyOf(found)) === false && holds(profile, found.path) ? 'profile' : 'cv';
}

// What the check and the page plan find in the CV without the profile.
function aloneIssues(cv: unknown): Issue[] {
  const alone = check(cv);
  if (alone.error !== null) return alone.error.issues;
  return pagePlan(alone.data).error?.issues ?? [];
}

/** What fileOf reads of an issue: its code, and its path in the CV with the profile applied. */
type Found = Pick<Issue, 'code' | 'path'>;

const keyOf = (found: Found) => `${found.code} ${found.path}`;

// Whether the value holds a key at each part of the path; the empty path is the value itself.
function holds(value: unknown, path: string) {
  let at = value;
  for (const part of path === '' ? [] : path.split('.')) {
    const keys = new Map<string, unknown>(
      typeof at === 'object' && at !== null ? Object.entries(at) : [],
    );
    if (keys.has(part) === false) return false;
    at = keys.get(part);
  }
  return true;
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
  const placed = cv.error === null ? pagePlan(cv.data) : cv;
  return { fits: placed.error === null, layout: placed.error?.issues ?? [] };
}

type Side = 'left' | 'right';

type Spot = Placed & { page: number; bottom: number };

/**
 * @param cv - a checked CV, hidden blocks already left out
 * @returns the plan, or one issue per block that is too high and per column that needs more pages
 */
export function pagePlan(cv: Master): Result<Plan> {
  const left = fillColumn(cv, 'left');
  const right = fillColumn(cv, 'right');
  const issues = [
    ...roleTooLong(cv.person.role),
    ...tooTall(left),
    ...tooTall(right),
    ...overflow(cv, left, 'left'),
    ...overflow(cv, right, 'right'),
  ];
  if (issues.length > 0) return rejected(issues);
  const count = Math.max(1, ...[...left, ...right].map(spot => spot.page + 1));
  const pages = Array.from({ length: count }, (_, page) => ({
    left: columnOf(cv, left, 'left', page),
    right: columnOf(cv, right, 'right', page),
  }));
  return done({ pages });
}

function fillColumn(cv: Master, side: Side) {
  const spots: Spot[] = [];
  let page = 0;
  let y = columnStart(cv, side, page);
  let previous: Block | null = null;
  for (const block of cv.blocks) {
    if (COLUMN[block.kind] !== side) continue;
    const pinned = (block.page ?? 1) - 1;
    if (pinned > page) [page, y, previous] = [pinned, columnStart(cv, side, pinned), null];
    const fitsHere =
      previous === null ||
      y + heightWith(headingOf(cv, block, previous, side, page), block) <= COLUMN_HEIGHT;
    if (fitsHere === false) [page, y, previous] = [page + 1, columnStart(cv, side, page + 1), null];
    const heading = headingOf(cv, block, previous, side, page);
    const height = heightWith(heading, block);
    y += height;
    spots.push({ id: block.id, height: round(height), heading, page, bottom: y });
    previous = block;
  }
  return spots;
}

const round = (value: number) => Math.round(value * 10) / 10;

function columnStart(cv: Master, side: Side, page: number) {
  if (side === 'left') return page === 0 ? LEFT_START.first : LEFT_START.other;
  return page === 0 ? contactHeight(cv.contact) : 0;
}

// A heading stands above the first block of a section on a page, so it repeats on the next page.
function headingOf(
  cv: Master,
  block: Block,
  previous: Block | null,
  side: Side,
  page: number,
): Heading | null {
  if (previous?.section === block.section) return null;
  const before = previous === null ? topGap(cv, side, page) : SPACE.sectionGap;
  return { text: block.section, before, after: gapBelowHeading(block) };
}

function topGap(cv: Master, side: Side, page: number) {
  if (side === 'left') return page === 0 ? SPACE.leftTopFirst : SPACE.leftTop;
  return page === 0 ? belowContact(cv) : SPACE.rightTop;
}

/**
 * The right heading of page 1 stands level with the left one, however long the contact block is.
 *
 * @param cv - a checked CV
 * @returns the space above that heading in DXA, at least the space between two sections
 */
function belowContact(cv: Master) {
  const leftHeading = LEFT_START.first + pt(SPACE.leftTopFirst);
  const gap = Math.round((leftHeading - contactHeight(cv.contact)) * DXA_PER_PT);
  return Math.max(SPACE.sectionGap, gap);
}

const DXA_PER_PT = 20;

// A titled group sits as far below its heading as a job below its own, so the two first lines
// of a page stand level. An untitled block keeps the distance to its content.
function gapBelowHeading(block: Block) {
  if (block.kind === 'job') return 0;
  if (block.title !== undefined) return SPACE.jobGap - SPACE.beforeTitle;
  return block.kind === 'rated' ? SPACE.headingToRated : SPACE.headingToText;
}

function heightWith(heading: Heading | null, block: Block) {
  if (heading === null) return blockHeight(block);
  return pt(heading.before + heading.after) + LINE.heading + blockHeight(block);
}

// The name block has a fixed height, so a second role line would fall below it.
function roleTooLong(role: string): Issue[] {
  if (roleLines(role) === 1) return [];
  return [issue.roleTooLong(role)];
}

function tooTall(spots: Spot[]) {
  const issues: Issue[] = [];
  for (const spot of spots) {
    if (spot.bottom <= COLUMN_HEIGHT) continue;
    const over = Math.ceil(spot.bottom - COLUMN_HEIGHT);
    issues.push(issue.blockTooTall(spot.id, over));
  }
  return issues;
}

function overflow(cv: Master, spots: Spot[], side: Side): Issue[] {
  const late = spots.filter(spot => spot.page >= cv.pages).map(spot => spot.id);
  if (late.length === 0) return [];
  return [issue.pageOverflow(side, cv.pages, late)];
}

function columnOf(cv: Master, spots: Spot[], side: Side, page: number): Column {
  const here = spots.filter(spot => spot.page === page);
  const used = here.at(-1)?.bottom ?? columnStart(cv, side, page);
  const blocks = here.map(({ id, height, heading }) => ({ id, height, heading }));
  return { used: round(used), free: round(COLUMN_HEIGHT - used), blocks };
}
