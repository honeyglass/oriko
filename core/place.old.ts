/**
 * The page plan: which block stands on which page, each block whole.
 *
 * place: the plan of a checked CV, or the blocks that do not fit.
 * Plan, Column, Placed, Heading: the plan and its parts, as the renderer reads them.
 *
 * A column fills from the top, block by block. A block that no longer fits goes to the next
 * page as a whole, with its section heading; it is never split.
 *
 * @example const plan = place(cv);
 */
import { done, rejected } from './errors.ts';
import type { Issue, Result } from './errors.ts';
import * as issue from './issues.old.ts';
import { COLUMN } from './cv.limits.ts';
import type { Block, Master } from './cv.schema.ts';
import { blockHeight, contactHeight, roleLines } from './measure.ts';
import { COLUMN_HEIGHT, LEFT_START, LINE, SPACE, pt } from './metrics.ts';

type Side = 'left' | 'right';

/** A section heading above a block, with its spacing in DXA. */
export type Heading = { text: string; before: number; after: number };
/** A block on a page; the height includes the heading, in pt. */
export type Placed = { id: string; height: number; heading: Heading | null };
export type Column = { used: number; free: number; blocks: Placed[] };
export type Plan = { pages: { left: Column; right: Column }[] };

type Spot = Placed & { page: number; bottom: number };

/**
 * @param cv - a checked CV, hidden blocks already left out
 * @returns the plan, or one issue per block that is too high and per column that needs more pages
 */
export function place(cv: Master): Result<Plan> {
  const left = fillColumn(cv, 'left');
  const right = fillColumn(cv, 'right');
  const issues = [
    ...roleTooLong(cv.person.role),
    ...tooTall(left),
    ...tooTall(right),
    ...overflow(cv, left, 'left'),
    ...overflow(cv, right, 'right'),
  ];
  if (issues.length > 0) return rejected('place', issues);
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
