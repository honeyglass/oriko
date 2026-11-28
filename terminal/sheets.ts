/**
 * A CV as text for the terminal, page by page, to pick a profile before it is built.
 *
 * preview: the pages of a plan as text, each page a framed sheet with its two columns.
 * sheets: the same sheets as lists of lines, padded with empty rows to a given height.
 * repositoryLines: the lines the right column breaks the address of oriko into, in the credits.
 *
 * It shows what stands on which page, in which order, and how full each column is. It does not
 * show fonts or exact distances, and Oriko stands where the photo is; those exist only
 * in the .docx.
 *
 * @example io.write(preview(cv, plan));
 */
import { REPOSITORY } from './credits.ts';
import { CV_LIMITS } from '../core/cv.limits.ts';
import type { Block, Master } from '../core/cv.schema.ts';
import type { Column, Placed, Plan } from '../core/place.ts';

const LEFT = 52;
const RIGHT = 25;
const DOTS = CV_LIMITS.level + 1;
/** The cells of a fill bar; one cell is a tenth of a column. */
const BAR = 10;
/** Where the photo stands: Oriko, the mascot of the logo, since the terminal shows no picture. */
const FACE = [
  '  ╭───────┐ ',
  '  │       └┐',
  '  │ ●   ●  │',
  '  │•  ◡   •│',
  '  │ ── ─── │',
  '  ╰────────╯',
];
const FACE_WIDTH = 12;
/** The rows of the name block of page 1, with a blank row above and one below it. */
const NAME_ROWS = FACE.length + 2;

/**
 * @param cv - a checked CV
 * @param plan - the plan place() made for this CV
 * @returns the text, one line per row of the terminal, every line 84 characters wide
 */
export function preview(cv: Master, plan: Plan) {
  return `${sheets(cv, plan)
    .map(lines => lines.join('\n'))
    .join('\n\n')}\n`;
}

/**
 * @param cv - a checked CV
 * @param plan - the plan place() made for this CV
 * @param height - the least number of lines of a sheet; empty rows above the fill bars make it up
 * @returns one sheet per page, each a list of lines 84 characters wide
 */
export function sheets(cv: Master, plan: Plan, height = 0) {
  const count = plan.pages.length;
  return plan.pages.map((page, index) => {
    const title = `Page ${index + 1} of ${count}`;
    const fill = `Left  ${bar(page.left)}     Right ${bar(page.right)}`;
    // A later page starts one blank row below the top edge, as page 1 does above the name.
    const gap = index === 0 ? [] : [''];
    const left = [...gap, ...leftLines(cv, page.left, index)];
    return sheet(title, left, [...gap, ...rightLines(cv, page.right, index)], fill, height);
  });
}

/** The lines of a sheet around its rows: the top edge, and the fill bars with their two edges. */
const FRAME_LINES = 4;

// One page as a sheet: a frame, the two columns, and below them how full each column is.
function sheet(title: string, left: string[], right: string[], fill: string, height: number) {
  const [leftRows, rightRows] = [withoutBlankEnd(left), withoutBlankEnd(right)];
  const rows = Math.max(leftRows.length, rightRows.length, height - FRAME_LINES);
  const body = Array.from(
    { length: rows },
    (_, row) =>
      `│ ${(leftRows[row] ?? '').padEnd(LEFT)} │ ${(rightRows[row] ?? '').padEnd(RIGHT)} │`,
  );
  return [
    `${`╭─ ${title} `.padEnd(LEFT + 3, '─')}┬${'─'.repeat(RIGHT + 2)}╮`,
    ...body,
    `├${'─'.repeat(LEFT + 2)}┴${'─'.repeat(RIGHT + 2)}┤`,
    `│ ${fill.padEnd(LEFT + RIGHT + 3)} │`,
    `╰${'─'.repeat(LEFT + RIGHT + 5)}╯`,
  ];
}

const withoutBlankEnd = (lines: string[]) =>
  lines.slice(0, lines.findLastIndex(line => line !== '') + 1);

function bar(column: Column) {
  const share = column.used / (column.used + column.free);
  const cells = Math.min(BAR, Math.round(share * BAR));
  return `${'■'.repeat(cells)}${'□'.repeat(BAR - cells)} ${Math.round(share * 100)} % full`;
}

/** The address of oriko in lines, as the credits in the right column show it. */
export const repositoryLines = () => wrap(REPOSITORY, RIGHT);

// Breaks at spaces; a word longer than the line is cut, so no line grows past the column.
function wrap(text: string, width: number) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ').flatMap(part => cut(part, width))) {
    const joined = line === '' ? word : `${line} ${word}`;
    if (joined.length <= width) {
      line = joined;
      continue;
    }
    lines.push(line);
    line = word;
  }
  return [...lines, line];
}

// The cut falls after a slash where one is in reach, so an address breaks between its parts.
function cut(word: string, width: number) {
  if (word.length <= width) return [word];
  return word.match(new RegExp(`.{1,${width - 1}}/|.{1,${width}}`, 'gu')) ?? [''];
}

const blockOf = (cv: Master, placed: Placed) => cv.blocks.find(block => block.id === placed.id);

function leftLines(cv: Master, column: Column, page: number) {
  const top = page === 0 ? padded(['', ...nameBlock(cv.person)], topRows(cv)) : [];
  return stacked(top, column.blocks, placed => jobLines(cv, placed));
}

/**
 * A blank row already ends every block; a section heading below one gets a second blank row, so
 * sections stand further apart than the groups inside them.
 *
 * @param top - the lines above the blocks, such as the name or the contact
 * @param blocks - the blocks of one column of one page
 * @param linesOf - the lines of one block, ending in a blank row
 * @returns the lines of the column
 */
function stacked(top: string[], blocks: Placed[], linesOf: (placed: Placed) => string[]) {
  const lines = [...top];
  for (const placed of blocks) {
    if (placed.heading !== null && lines.length > 0) lines.push('');
    lines.push(...linesOf(placed));
  }
  return lines;
}

// The heading in capitals, a rule to the end of the column, and a blank row below.
function ruled(text: string, width: number) {
  const lines = wrap(text.toUpperCase(), width);
  const last = lines.pop() ?? '';
  const rule = '─'.repeat(Math.max(0, width - last.length - 1));
  return [...lines, rule === '' ? last : `${last} ${rule}`, ''];
}

// The face on the left, name and role right-aligned beside it from its first row on.
function nameBlock(person: Master['person']) {
  const room = LEFT - FACE_WIDTH;
  const beside = [person.firstName, person.lastName, person.role];
  return FACE.map((line, row) => `${line}${shortened(beside[row] ?? '', room).padStart(room)}`);
}

const shortened = (text: string, width: number) =>
  text.length <= width ? text : `${text.slice(0, width - 1)}…`;

// The date stands right of the title and the place beside the employer, as the document sets them.
function jobLines(cv: Master, placed: Placed) {
  const job = blockOf(cv, placed);
  if (job?.kind !== 'job') return [];
  const heading = placed.heading === null ? [] : ruled(placed.heading.text, LEFT);
  const date = `${job.from} – ${job.to}`;
  const titleWidth = LEFT - 3 - date.length;
  const [first = '', ...rest] = wrap(job.title, titleWidth);
  const head = [`● ${first.padEnd(titleWidth)} ${date}`, ...rest.map(line => `│ ${line}`)];
  const details = [`${job.employer} · ${job.place}`, ...job.bullets.map(bullet => `› ${bullet}`)];
  const body = details.flatMap(line => hanging(line, LEFT - 2)).map(line => `│ ${line}`);
  return [...heading, ...head, '│', ...body, ''];
}

// The lines after the first stand two characters in, below the text of a bullet.
const hanging = (text: string, width: number) =>
  wrap(text, width - 2).map((line, index) => (index === 0 ? line : `  ${line}`));

function rightLines(cv: Master, column: Column, page: number) {
  const top = page === 0 ? padded(contactLines(cv), topRows(cv)) : [];
  return stacked(top, column.blocks, placed => blockLines(cv, placed));
}

// Both columns of page 1 start their first section on the same row: below the name block, or
// lower where the contact reaches further down, so one blank row still ends the contact.
const topRows = (cv: Master) => Math.max(NAME_ROWS, contactLines(cv).length);

function contactLines(cv: Master) {
  const contact = cv.contact.items.flatMap(item => item.lines.flatMap(line => wrap(line, RIGHT)));
  return ['', ...ruled(cv.contact.title, RIGHT), ...contact];
}

const padded = (lines: string[], rows: number) =>
  Array.from({ length: rows }, (_, row) => lines[row] ?? '');

function blockLines(cv: Master, placed: Placed) {
  const block = blockOf(cv, placed);
  if (block === undefined || block.kind === 'job') return [];
  const heading = placed.heading === null ? [] : ruled(placed.heading.text, RIGHT);
  if (block.title === undefined) return [...heading, ...content(block, RIGHT), ''];
  const items = content(block, RIGHT - INDENT.length).map(line => `${INDENT}${line}`);
  return [...heading, ...wrap(block.title, RIGHT), ...items, ''];
}

/** The items of a group with a title stand this far in, below the title. */
const INDENT = '  ';

function content(block: Exclude<Block, { kind: 'job' }>, width: number) {
  switch (block.kind) {
    case 'rated':
      return block.items.flatMap(item => {
        const [first = '', ...rest] = wrap(item.name, width - DOTS);
        return [`${first.padEnd(width - DOTS)} ${dots(item.level)}`, ...rest];
      });
    case 'list':
      return wrap(block.items.join(', '), width);
    case 'entries':
      return block.items.flatMap(item => [...wrap(item.title, width), ...wrap(item.note, width)]);
  }
}

const dots = (level: number) => '●'.repeat(level) + '○'.repeat(CV_LIMITS.level - level);
