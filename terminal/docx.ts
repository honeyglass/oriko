/**
 * The .docx of a CV in the look of the terminal preview: each sheet of the preview on an A4 page.
 *
 * renderTerminal: the bytes of that .docx for a checked CV and its plan.
 *
 * Fira Code is the one monospace font of Google Docs that sets every character of a sheet in the
 * same width. The sizes below are measured in a PDF that Google Docs made: 84 characters at 11 pt
 * are 554 pt wide, and a line at single spacing is 14.43 pt high. Each sheet grows with empty rows
 * to the height of the page, so its frame runs along all four edges, about 21 pt from each.
 *
 * @example const docx = await renderTerminal(cv, plan);
 */
import { Document, ExternalHyperlink, Packer, Paragraph, TextRun } from 'docx';
import type { ParagraphChild } from 'docx';
import { done } from '../core/errors.ts';
import type { Result } from '../core/errors.ts';
import type { Master } from '../core/cv.schema.ts';
import type { Plan } from '../core/place.old.ts';
import { HEIGHT, WIDTH } from '../core/metrics.ts';
import { REPOSITORY } from './credits.ts';
import { repositoryLines, sheets } from './sheets.ts';
import { stable } from '../core/zip.ts';

const FONT = 'Fira Code';
/** 11 pt, in half points. */
const SIZE = 22;
/** The line spacing in 240ths of a single line: 12.27 pt, close enough for the frame to join. */
const SPACING = 204;
/** The lines of a page: 797 pt at that spacing, which ends about 21 pt above the lower edge. */
const PAGE_LINES = 65;
/** The edge above and left of the frame, in DXA: 21 pt, as left and right of the 554 pt lines. */
const EDGE = 420;
/** Below and right, the page may hold more than the frame needs, so no line moves on or wraps. */
const SPARE_EDGE = 300;

/**
 * @param cv - a checked CV
 * @param plan - the plan place() made for this CV
 * @returns the bytes of the .docx, the same for the same input
 */
export async function renderTerminal(cv: Master, plan: Plan): Promise<Result<Uint8Array>> {
  const pages = sheets(cv, plan, PAGE_LINES);
  const spacing = lineSpacing(Math.max(...pages.map(lines => lines.length)));
  const links = repositoryLines();
  const paragraphs = pages.flatMap((lines, page) =>
    lines.map((text, row) => line(linked(text, links), spacing, page > 0 && row === 0)),
  );
  return done(await stable(await Packer.toBuffer(document(paragraphs))));
}

// A sheet taller than a page gets a tighter spacing for every page, so no sheet spills over.
const lineSpacing = (tallest: number) =>
  Math.min(SPACING, Math.floor((SPACING * PAGE_LINES) / tallest));

const line = (children: ParagraphChild[], spacing: number, isPageStart: boolean) =>
  new Paragraph({
    pageBreakBefore: isPageStart,
    spacing: { before: 0, after: 0, line: spacing },
    children,
  });

const run = (text: string) => new TextRun({ text, font: FONT, size: SIZE });

/**
 * The address of oriko in the credits becomes a link a reader of the PDF can click.
 *
 * The right column breaks the address over lines, so a row links when its right cell holds
 * exactly one of those lines; the left column may hold the same text without a link.
 *
 * @param text - one row of a sheet
 * @param links - the lines of the address
 * @returns the runs of the row, the address line as a link
 */
function linked(text: string, links: string[]) {
  const cell = text.split('│').at(-2)?.trim() ?? '';
  if (links.includes(cell) === false) return [run(text)];
  const at = text.lastIndexOf(cell);
  const link = new ExternalHyperlink({ link: `https://${REPOSITORY}`, children: [run(cell)] });
  return [run(text.slice(0, at)), link, run(text.slice(at + cell.length))];
}

function document(paragraphs: Paragraph[]) {
  return new Document({
    title: 'Curriculum Vitae',
    sections: [
      {
        properties: {
          page: {
            size: { width: WIDTH.page, height: HEIGHT.page },
            margin: {
              top: EDGE,
              bottom: SPARE_EDGE,
              left: EDGE,
              right: SPARE_EDGE,
              header: 0,
              footer: 0,
            },
          },
        },
        children: paragraphs,
      },
    ],
  });
}
