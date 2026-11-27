/**
 * The .docx of a CV: tables with invisible borders, one page table per page of the plan.
 *
 * render: the bytes of the .docx for a checked CV and its plan, for Google Docs or LibreOffice.
 * Engine: the program that sets the .docx.
 *
 * Google Docs drops or misplaces floating shapes, so every position is a table cell, and each
 * page is its own table: the plan decides what stands on a page, never the text flow.
 *
 * LibreOffice sets the same .docx apart from Google Docs in a few places. Its .docx carries other
 * values there, so its PDF shows the page Google Docs shows; LOOKS holds both sets.
 *
 * @example const docx = await render(cv, plan, { bytes: readFileSync('photo.png'), file: 'cv' });
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { trySync$ } from '@honeyglass/utils/ts';
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  Header,
  HeightRule,
  ImageRun,
  LevelFormat,
  LineRuleType,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlignTable,
  WidthType,
} from 'docx';
import type { IParagraphOptions, IRunOptions, ITableCellOptions, ParagraphChild } from 'docx';
import type { Issues, Stored } from '../core/issues.ts';
import * as issue from './issues.ts';
import { CV_LIMITS, ICONS } from '../core/cv.limits.ts';
import type { Block, Master } from '../core/cv.schema.ts';
import { spacedRole } from '../core/measure.ts';
import { HEIGHT, SPACE, WIDTH } from '../core/metrics.ts';
import type { Column, Heading, Placed, Plan } from '../core/place.old.ts';
import { circlePhoto, solidPng } from './images.ts';
import { stable } from '../core/zip.ts';

const COLOR = {
  text: '262626',
  black: '000000',
  bar: '595959',
  line: 'A6A6A6',
  dotOn: '404040',
  dotOff: 'D8D8D8',
};
const FONT = { sans: 'Open Sans', light: 'Open Sans Light', head: 'Calibri', symbol: 'Arial' };
/** The edge length of each contact icon, in pt. */
const ICON_SIZE = { pin: 9.64, home: 9.64, phone: 7.94, mail: 8.79, globe: 7.94 } as const;
const ASSETS = join(import.meta.dirname, '..', 'assets');
const NAME_COLUMNS = [754, 1190, 1190, WIDTH.name];
const GUTTER = WIDTH.page - WIDTH.left - WIDTH.right;

export type Engine = 'google' | 'libreoffice';

/**
 * The values where the two engines differ, in DXA; an absent gap is the 1 pt gap paragraph.
 *
 * Google Docs draws the header bar 15 pt high, sets an empty 1 pt paragraph before a table about
 * 3 pt high, grows the exact photo row to the photo's line, rounds every table column to whole
 * pixels of 1/96 inch, draws a cell border 1 pt wide inside the cell, ignores the spacing
 * between letters, and sets an image on whole pixels with a margin of 2 pixels around it, so the
 * exact photo row grows by those margins. The LibreOffice values
 * reproduce the Google Docs PDFs of the examples in examples/showcase to a quarter point.
 */
type Look = {
  headerBar: number;
  pageGap?: number;
  cellGap?: number;
  tableGap?: number;
  imageMargin: number;
  pixels: boolean;
  letterSpacing: boolean;
};
const LOOKS: Record<Engine, Look> = {
  google: { headerBar: 252, imageMargin: 0, pixels: false, letterSpacing: true },
  libreoffice: {
    headerBar: 300,
    pageGap: 62,
    cellGap: 68,
    tableGap: 63,
    imageMargin: 30,
    pixels: true,
    letterSpacing: false,
  },
};

/** One pixel of 1/96 inch, in DXA. */
const PIXEL = 15;
/** The timeline drawn as a column for LibreOffice, 1 pt wide as Google Docs draws the border. */
const LINE_WIDTH = 20;

type Images = {
  photo: Uint8Array;
  bar: Uint8Array;
  jobPin: Uint8Array;
  icons: Record<(typeof ICONS)[number], Uint8Array>;
};
type Cell = Paragraph | Table;
type Job = Extract<Block, { kind: 'job' }>;

const UNREADABLE = 'The photo is neither a PNG nor a JPEG picture';

/** The bytes of the photo, and the stored file whose `person.photo` names it: `cv` or `profile`. */
export type Photo = { bytes: Uint8Array; file: Stored };

/**
 * @param cv - a checked CV
 * @param plan - the plan place() made for this CV
 * @param photo - the photo, a PNG or JPEG file, and the file that names it
 * @param engine - the program that sets the .docx; Google Docs when left out
 * @returns the bytes of the .docx, the same for the same input; PHOTO_UNREADABLE at
 *   `person.photo` below the file that names the photo
 */
export async function render(
  cv: Master,
  plan: Plan,
  photo: Photo,
  engine: Engine = 'google',
): Promise<Uint8Array | Issues<Stored>> {
  const round = trySync$(() => circlePhoto(photo.bytes));
  if (round.error !== null)
    return [issue.photoUnreadable.at([photo.file, 'person', 'photo'], UNREADABLE)];
  const images = { photo: round.data, ...packagedImages() };
  return stable(await Packer.toBuffer(document(cv, plan, images, LOOKS[engine])));
}

function packagedImages() {
  const icon = (name: string) => readFileSync(join(ASSETS, `${name}.png`));
  const icons = {
    pin: icon('pin'),
    home: icon('home'),
    phone: icon('phone'),
    mail: icon('mail'),
    globe: icon('globe'),
  };
  return { bar: solidPng(170, 23, COLOR.bar), jobPin: icon('job-pin'), icons };
}

function document(cv: Master, plan: Plan, images: Images, look: Look) {
  const pages = plan.pages.flatMap((page, index) => [
    gap(index === 0 ? {} : { pageBreakBefore: true }, look.pageGap),
    pageTable(
      leftCell(cv, page.left, index, images, look),
      rightCell(cv, page.right, index, images, look),
      look,
    ),
  ]);
  return new Document({
    creator: `${cv.person.firstName} ${cv.person.lastName}`,
    title: 'Curriculum Vitae',
    styles: {
      default: {
        document: {
          run: { font: FONT.sans, size: 20, color: COLOR.text },
          paragraph: { spacing: { before: 0, after: 0, line: 240 } },
        },
      },
    },
    numbering: { config: [bulletMarks()] },
    sections: [
      {
        properties: {
          page: {
            size: { width: WIDTH.page, height: HEIGHT.page },
            margin: { top: 660, right: 0, bottom: 280, left: 0, header: 0, footer: 0 },
          },
        },
        headers: { default: new Header({ children: [bar(look.headerBar)] }) },
        footers: { default: new Footer({ children: [bar(LOOKS.google.headerBar)] }) },
        children: [...pages, gap()],
      },
    ],
  });
}

const bulletMarks = () => ({
  reference: 'bullets',
  levels: [
    {
      level: 0,
      format: LevelFormat.BULLET,
      text: '›',
      alignment: AlignmentType.LEFT,
      style: {
        paragraph: { indent: { left: WIDTH.bulletIndent, hanging: WIDTH.bulletHanging } },
        run: { font: 'Segoe UI Symbol', size: 20, color: COLOR.text },
      },
    },
  ],
});

// ---------- small builders ----------

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const NO_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };
const TIMELINE = {
  ...NO_BORDERS,
  right: { style: BorderStyle.SINGLE, size: 6, color: COLOR.line },
};
const NO_MARGINS = { top: 0, bottom: 0, left: 0, right: 0 };

const run = (text: string, options: IRunOptions = {}) =>
  new TextRun({ text, font: FONT.sans, size: 20, color: COLOR.text, ...options });

const para = (children: ParagraphChild[], options: IParagraphOptions = {}) =>
  new Paragraph({ children, ...options });

// Word needs a paragraph between two tables and at the end of a cell; at 1 pt it stays invisible.
// Google Docs adds a 14.5 pt line before a table that starts a page or a cell, so one stands there too.
// A height in DXA fixes the paragraph at the height Google Docs gives it, for LibreOffice.
const gap = (options: IParagraphOptions = {}, height?: number) =>
  new Paragraph({
    run: { size: 2 },
    spacing: height === undefined ? { line: 240 } : { line: height, lineRule: LineRuleType.EXACT },
    ...options,
  });

const cell = (children: Cell[], width: number, options: Partial<ITableCellOptions> = {}) =>
  new TableCell({
    children,
    width: { size: width, type: WidthType.DXA },
    borders: NO_BORDERS,
    margins: NO_MARGINS,
    ...options,
  });

const table = (columnWidths: number[], rows: TableRow[]) =>
  new Table({
    width: { size: columnWidths.reduce((sum, width) => sum + width, 0), type: WidthType.DXA },
    columnWidths,
    layout: TableLayoutType.FIXED,
    borders: { ...NO_BORDERS, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER },
    margins: NO_MARGINS,
    rows,
  });

// An ImageRun takes CSS pixels, the page is laid out in pt.
const image = (data: Uint8Array, width: number, height: number, look: Look) =>
  new ImageRun({
    type: 'png',
    data,
    transformation: { width: cssPixels(width, look), height: cssPixels(height, look) },
  });

// Google Docs shows an image on whole pixels.
const cssPixels = (pt: number, look: Look) =>
  look.pixels ? Math.round((pt * 96) / 72) : (pt * 96) / 72;

const headingText = (text: string, look: Look) =>
  new TextRun({ text, font: FONT.head, size: 28, color: COLOR.black, ...letters(10, look) });

// The spacing between letters in twentieths of a pt, where the engine shows it.
const letters = (characterSpacing: number, look: Look) =>
  look.letterSpacing ? { characterSpacing } : {};

const dot = () => run('●', { font: FONT.symbol, size: 26, color: COLOR.black });

// The full-width bar of header and footer: a shaded empty paragraph of the given height in DXA.
const bar = (height: number) =>
  new Paragraph({
    run: { font: FONT.symbol, size: 22 },
    shading: { type: ShadingType.CLEAR, fill: COLOR.bar, color: 'auto' },
    spacing: { line: height, lineRule: LineRuleType.EXACT },
  });

const pageTable = (left: Cell[], right: Cell[], look: Look) =>
  table(columnsOf([WIDTH.left, WIDTH.right, GUTTER], look), [
    new TableRow({
      children: [cell(left, WIDTH.left), cell(right, WIDTH.right), cell([gap()], GUTTER)],
    }),
  ]);

// Google Docs sets every table column on whole pixels; LibreOffice needs them so already.
const columnsOf = (widths: number[], look: Look) =>
  look.pixels ? widths.map(width => Math.round(width / PIXEL) * PIXEL) : widths;

const shadedLine = { type: ShadingType.CLEAR, fill: COLOR.line, color: 'auto' };

/**
 * The two columns of a timeline's rail; the line is the right border of the first.
 *
 * Google Docs draws that border 1 pt wide, starting one pixel left of the column edge.
 * LibreOffice draws it across the edge and moves the next column's text, so for LibreOffice
 * the line is a shaded column of its own, where Google Docs draws it.
 *
 * @param left - the width of the first column
 * @param right - the width of the second column
 * @param look - the values of the engine
 * @returns the widths of the rail's columns and its empty cells
 */
function rail(left: number, right: number, look: Look) {
  if (look.pixels === false)
    return {
      columns: [left, right],
      cells: [cell([gap()], left, { borders: TIMELINE }), cell([gap()], right)],
    };
  const [first = 0, second = 0] = columnsOf([left, right], look);
  const columns = [first - PIXEL, LINE_WIDTH, second + PIXEL - LINE_WIDTH];
  const [before = 0, line = 0, after = 0] = columns;
  const cells = [
    cell([gap()], before),
    cell([gap()], line, { shading: shadedLine }),
    cell([gap()], after),
  ];
  return { columns, cells };
}

const blockOf = (cv: Master, placed: Placed) => cv.blocks.find(block => block.id === placed.id);

// ---------- left column ----------

function leftCell(cv: Master, column: Column, page: number, images: Images, look: Look) {
  const first = gap({}, look.cellGap);
  const top =
    page === 0
      ? [first, nameBlock(cv.person, images.photo, look), gap({}, look.tableGap)]
      : [first];
  const rows = column.blocks.flatMap(placed => jobRowsOf(cv, placed, images, look));
  if (rows.length === 0) return top;
  return [...top, table(jobColumns(look), rows), gap()];
}

const jobColumns = (look: Look) => [
  ...columnsOf([WIDTH.gutter], look),
  ...rail(WIDTH.rail, WIDTH.rail, look).columns,
  ...columnsOf([WIDTH.jobTitle, WIDTH.jobDate], look),
];

function nameBlock(person: Master['person'], photo: Uint8Array, look: Look) {
  const [margin = 0, half = 0, , name = 0] = NAME_COLUMNS;
  const timeline = rail(half, half, look);
  const around = look.imageMargin;
  const photoSpacing =
    around === 0 ? {} : { spacing: { before: around }, indent: { left: around } };
  const right = { alignment: AlignmentType.RIGHT, indent: { right: WIDTH.nameRight } };
  const nameRun = (text: string, size: number, characterSpacing: number) =>
    new TextRun({
      text,
      font: FONT.head,
      size,
      color: COLOR.black,
      ...letters(characterSpacing, look),
    });
  const nameCell = cell(
    [
      para([nameRun(person.firstName, 40, -30)], { ...right, spacing: { before: 1540 } }),
      para([nameRun(person.lastName, 50, -20)], right),
      para([run(spacedRole(person.role), { font: FONT.light, size: 16 })], {
        ...right,
        spacing: { before: 150 },
      }),
    ],
    name,
    { verticalMerge: 'restart' },
  );
  const columns = [...columnsOf([margin], look), ...timeline.columns, ...columnsOf([name], look)];
  const span = { columnSpan: timeline.columns.length };
  const picture = para([image(photo, 119, 118.4, look)], { run: { size: 2 }, ...photoSpacing });
  return table(columns, [
    new TableRow({
      height: { value: 2380 + 2 * around, rule: HeightRule.EXACT },
      children: [cell([gap()], margin), cell([picture], half * 2, span), nameCell],
    }),
    new TableRow({
      height: { value: 760, rule: HeightRule.EXACT },
      children: [
        cell([gap()], margin),
        ...timeline.cells,
        cell([gap()], name, { verticalMerge: 'continue' }),
      ],
    }),
    new TableRow({
      children: [
        cell([gap()], margin),
        cell([para([dot()], { alignment: AlignmentType.CENTER })], half * 2, span),
        cell([gap()], name),
      ],
    }),
  ]);
}

function jobRowsOf(cv: Master, placed: Placed, images: Images, look: Look) {
  const block = blockOf(cv, placed);
  if (block?.kind !== 'job') return [];
  const heading = placed.heading === null ? [] : [sectionRow(placed.heading, images.bar, look)];
  return [...heading, ...jobRows(block, images.jobPin, look)];
}

// The section heading is a row of the jobs table: the gray bar on the left, the title beside it.
function sectionRow(heading: Heading, barImage: Uint8Array, look: Look) {
  const spacing = { before: heading.before };
  const columnSpan = rail(WIDTH.rail, WIDTH.rail, look).columns.length + 2;
  const center = { verticalAlign: VerticalAlignTable.CENTER };
  return new TableRow({
    children: [
      cell(
        [
          para([image(barImage, 85, 11.4, look)], {
            spacing,
            indent: { left: -48 + look.imageMargin },
          }),
        ],
        WIDTH.gutter,
        center,
      ),
      cell(
        [para([headingText(heading.text, look)], { indent: { left: 160 }, spacing })],
        WIDTH.leftText - WIDTH.gutter,
        { columnSpan, ...center },
      ),
    ],
  });
}

// A job is two rows. First: dot, title, date. Second: timeline, employer with place, bullets.
// A text reader takes the date with its title and the place with its employer.
// Neither row may split, so a job stays whole even where the estimate is off.
function jobRows(job: Job, pin: Uint8Array, look: Look) {
  const timeline = rail(WIDTH.rail, WIDTH.rail, look);
  const wide = { line: 276, lineRule: LineRuleType.AUTO };
  const marker = para([dot()], {
    alignment: AlignmentType.CENTER,
    spacing: { before: SPACE.jobGap + 40 },
  });
  const title = para([run(job.title, { bold: true })], {
    indent: { left: WIDTH.jobIndent },
    spacing: { before: SPACE.jobGap, after: SPACE.afterJobTitle, ...wide },
  });
  const date = para([run(`${job.from} – ${job.to}`, { font: FONT.light })], {
    alignment: AlignmentType.RIGHT,
    spacing: { before: SPACE.jobGap, ...wide },
  });
  const employer = [run(job.employer), ...pinned(pin, job.place, look)];
  const details = [
    para(employer, { indent: { left: WIDTH.jobIndent }, spacing: { after: SPACE.afterEmployer } }),
    ...job.bullets.map(bullet =>
      para([run(bullet)], { numbering: { reference: 'bullets', level: 0 } }),
    ),
  ];
  return [
    new TableRow({
      cantSplit: true,
      children: [
        cell([gap()], WIDTH.gutter, { verticalMerge: 'restart' }),
        cell([marker], WIDTH.rail * 2, { columnSpan: timeline.columns.length }),
        cell([title], WIDTH.jobTitle),
        cell([date], WIDTH.jobDate),
      ],
    }),
    new TableRow({
      cantSplit: true,
      children: [
        cell([gap()], WIDTH.gutter, { verticalMerge: 'continue' }),
        ...timeline.cells,
        cell(details, WIDTH.jobTitle + WIDTH.jobDate, { columnSpan: 2 }),
      ],
    }),
  ];
}

// The place behind its pin; for LibreOffice the spaces beside the pin carry its image margin.
function pinned(pin: Uint8Array, place: string, look: Look) {
  const margin = look.imageMargin;
  if (margin === 0)
    return [run('   '), image(pin, 8.75, 8.75, look), run(` ${place}`, { font: FONT.light })];
  return [
    run('   ', { characterSpacing: margin / 3 }),
    image(pin, 8.75, 8.75, look),
    run(' ', { font: FONT.light, characterSpacing: margin }),
    run(place, { font: FONT.light }),
  ];
}

// ---------- right column ----------

function rightCell(cv: Master, column: Column, page: number, images: Images, look: Look) {
  const top = page === 0 ? contactBlock(cv.contact, images.icons, look) : [];
  const children = [...top, ...column.blocks.flatMap(placed => rightBlock(cv, placed, look))];
  const last = children.at(-1);
  const endsWithParagraph = last instanceof Paragraph;
  return endsWithParagraph ? children : [...children, gap()];
}

function contactBlock(contact: Master['contact'], icons: Images['icons'], look: Look): Cell[] {
  const columns = [WIDTH.contactIcon, WIDTH.right - WIDTH.contactIcon];
  const rows = contact.items.map(item => {
    const size = ICON_SIZE[item.icon];
    const icon = para([image(icons[item.icon], size, size, look)], {
      alignment: AlignmentType.CENTER,
      indent: { right: 184 },
    });
    const lines = item.lines.map((line, index) => run(line, index === 0 ? {} : { break: 1 }));
    const content =
      item.link === undefined
        ? lines
        : [new ExternalHyperlink({ link: item.link, children: lines })];
    return new TableRow({
      children: [
        cell([icon], WIDTH.contactIcon),
        cell([para(content, { spacing: { after: SPACE.afterContactRow } })], columns[1] ?? 0),
      ],
    });
  });
  const heading = para([headingText(contact.title, look)], {
    indent: { left: 60 },
    spacing: { before: SPACE.rightTop, after: SPACE.afterContactHeading },
  });
  // A .docx table needs at least one row; a new CV starts without contact lines.
  return rows.length === 0 ? [heading] : [heading, table(columnsOf(columns, look), rows)];
}

function rightBlock(cv: Master, placed: Placed, look: Look): Cell[] {
  const block = blockOf(cv, placed);
  if (block === undefined || block.kind === 'job') return [];
  // Google Docs shows only the larger of two spacings that meet, so the gap below a heading
  // moves onto the group title right below it.
  const below = placed.heading?.after ?? 0;
  const titled = block.title !== undefined;
  const heading =
    placed.heading === null ? [] : [sectionHeading(placed.heading, titled ? 0 : below, look)];
  const title =
    block.title === undefined ? [] : [blockTitle(block.title, SPACE.beforeTitle + below)];
  return [...heading, ...title, ...content(block, look)];
}

const sectionHeading = (heading: Heading, after: number, look: Look) =>
  para([headingText(heading.text, look)], {
    indent: { left: WIDTH.indent },
    spacing: { before: heading.before, after },
  });

const blockTitle = (title: string, before: number) =>
  para([run(title, { bold: true })], {
    indent: { left: WIDTH.indent },
    spacing: { before, after: SPACE.afterTitle },
  });

function content(block: Exclude<Block, Job>, look: Look): Cell[] {
  switch (block.kind) {
    case 'rated':
      return [ratedTable(block.items, look)];
    case 'list':
      return [
        para([run(block.items.join(', '))], {
          indent: { left: WIDTH.indent, right: WIDTH.textRight },
        }),
      ];
    case 'entries':
      return block.items.flatMap((item, index) => entry(item, index === block.items.length - 1));
  }
}

// One rated item is one row: the name on the left, the dots on the right.
function ratedTable(items: { name: string; level: number }[], look: Look) {
  const columns = [WIDTH.ratedName, WIDTH.right - WIDTH.ratedName];
  const rows = items.map(
    item =>
      new TableRow({
        children: [
          cell(
            [
              para([run(item.name)], {
                indent: { left: WIDTH.indent },
                spacing: { after: SPACE.ratedPad },
              }),
            ],
            WIDTH.ratedName,
          ),
          cell([para(dots(item.level), { spacing: { before: SPACE.ratedPad } })], columns[1] ?? 0),
        ],
      }),
  );
  return table(columnsOf(columns, look), rows);
}

// The dots are text: Google Docs has no letter spacing, so a small space stands between them.
function dots(level: number) {
  const children: TextRun[] = [];
  for (let index = 0; index < CV_LIMITS.level; index++) {
    if (index > 0) children.push(new TextRun({ text: ' ', font: FONT.symbol, size: 16 }));
    children.push(
      new TextRun({
        text: '●',
        font: FONT.symbol,
        size: 22,
        color: index < level ? COLOR.dotOn : COLOR.dotOff,
      }),
    );
  }
  return children;
}

function entry(item: { title: string; note: string }, isLast: boolean) {
  const indent = { left: WIDTH.indent, right: WIDTH.textRight };
  return [
    para([run(item.title, { bold: true })], { indent, spacing: { after: SPACE.afterEntryTitle } }),
    para([run(item.note, { italics: true })], {
      indent,
      spacing: { after: isLast ? 0 : SPACE.entryGap },
    }),
  ];
}
