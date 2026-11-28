import assert from 'node:assert/strict';
import { test } from 'node:test';
import { withCredits } from '../../terminal/credits.ts';
import { pagePlan } from '../../core/place.ts';
import { preview } from '../../terminal/sheets.ts';
import { fixture, unwrap } from '../utils/fixture.ts';

const text = preview(fixture(), unwrap(pagePlan(fixture())));
const lines = text.split('\n');

test('shows every page with the blocks the plan puts on it', () => {
  const secondPage = text.indexOf('Page 2 of 2');
  assert.ok(text.indexOf('Page 1 of 2') >= 0 && secondPage > 0);
  assert.ok(text.indexOf('Northwind Logistics GmbH') < secondPage);
  assert.ok(text.indexOf('Campus Software Lab') > secondPage);
  assert.ok(text.indexOf('Team Award') > secondPage);
});

// The date stands right of the title, so a reader of the text finds it with its job.
test('shows a job with its date and a rated item with its dots', () => {
  const title = lines.findIndex(line =>
    /^│ ● Senior Backend Engineer +03\/2021 – today │/.test(line),
  );
  assert.ok(title > 0);
  assert.match(lines[title + 1] ?? '', /^│ │ +│/);
  assert.match(lines[title + 2] ?? '', /^│ │ Northwind Logistics GmbH · Berlin \(DE\) +│/);
  assert.ok(lines.some(line => /Go\s+●●●●● │$/.test(line)));
  assert.ok(lines.some(line => /Python\s+●●●○○ │$/.test(line)));
});

test('continues a long job title on the timeline, below the title text', () => {
  const cv = fixture();
  const job = cv.blocks[0];
  if (job?.kind === 'job') job.title = 'Apprenticeship IT Specialist for System Integration';
  const sheet = preview(cv, unwrap(pagePlan(cv))).split('\n');
  const first = sheet.findIndex(line => line.includes('● Apprenticeship IT Specialist for'));
  assert.match(sheet[first + 1] ?? '', /^│ │ System Integration +│/);
});

test('wraps a long rated name instead of cutting it off', () => {
  const cv = fixture();
  const rated = cv.blocks.find(block => block.kind === 'rated');
  if (rated?.kind === 'rated') rated.items[0] = { name: 'Event-driven systems at scale', level: 5 };
  const sheet = preview(cv, unwrap(pagePlan(cv))).split('\n');
  const first = sheet.findIndex(line => /│   Event-driven\s+●●●●● │$/.test(line));
  assert.match(sheet[first + 1] ?? '', /│   systems at scale {8}│$/);
});

// The right column of a row: the 25 characters between its two frame lines.
const rightCell = (line: string) => line.slice(-27, -2).trim();

test('rules each section heading off, with more room above it than between groups', () => {
  const heading = lines.findIndex(line => rightCell(line).startsWith('INTERESTS ─'));
  assert.deepEqual(lines.slice(heading - 2, heading + 2).map(rightCell), [
    '',
    '',
    rightCell(lines[heading] ?? ''),
    '',
  ]);
  assert.ok(lines.some(line => line.includes('│ PROFESSIONAL EXPERIENCE ──')));
  assert.ok(lines.some(line => rightCell(line).startsWith('CONTACT ─')));
});

// Row 0 is the top edge. The fixture's contact takes six rows, one more than the name block.
test('starts both columns of page 1 on one row, with a blank row below the contact', () => {
  const rowOf = (sheet: string[], start: string) =>
    sheet.findIndex(line => line.includes(`│ ${start} ─`));
  assert.equal(rowOf(lines, 'SKILLS'), 11);
  assert.equal(rowOf(lines, 'PROFESSIONAL EXPERIENCE'), 11);
  assert.match(rightCell(lines[9] ?? ''), /^Profile/);
  assert.equal(rightCell(lines[10] ?? ''), '');
  const cv = fixture();
  cv.contact.items.pop();
  const shorter = preview(cv, unwrap(pagePlan(cv))).split('\n');
  assert.equal(rowOf(shorter, 'SKILLS'), 10);
  assert.equal(rowOf(shorter, 'PROFESSIONAL EXPERIENCE'), 10);
});

test('starts both columns of a later page one blank row below the top edge', () => {
  const top = lines.findIndex(line => line.startsWith('╭─ Page 2 of 2'));
  assert.equal(lines[top + 1], `│ ${' '.repeat(52)} │ ${' '.repeat(25)} │`);
  assert.match(lines[top + 2] ?? '', /^│ PROFESSIONAL EXPERIENCE ─+ │ LANGUAGES ─+ │$/);
});

test('indents the items of a group below its title', () => {
  assert.ok(lines.some(line => /│   Go\s+●●●●● │$/.test(line)));
  assert.equal(
    lines.some(line => /│ Go\s+●●●●● │$/.test(line)),
    false,
  );
});

test('names only the page in the top edge of every sheet', () => {
  const tops = lines.filter(line => line.startsWith('╭─ Page'));
  assert.equal(tops.length, 2);
  for (const top of tops) assert.match(top, /^╭─ Page \d of 2 ─+┬─+╮$/);
});

// The credits pin to the last page; only a word longer than the column breaks at its slash.
test('shows the credits on the right of the last page, the address broken after a slash', () => {
  const cv = withCredits(fixture(), 2);
  const sheet = preview(cv, unwrap(pagePlan(cv))).split('\n');
  const heading = sheet.findIndex(line => /│ MADE WITH ─+ │$/.test(line));
  assert.ok(heading > sheet.findIndex(line => line.startsWith('╭─ Page 2')));
  assert.deepEqual(
    sheet.slice(heading + 2, heading + 6).map(line => line.split('│').at(-2)?.trim()),
    ['This CV was made with', 'github.com/honeyglass/', 'oriko', 'Author: Serkan Sipahi'],
  );
  assert.equal(text.includes('MADE WITH'), false);
  assert.ok(sheet.some(line => /│ 09\/2022 +│$/.test(line)));
});

test('keeps every line within 84 characters, so the frame holds in a narrow terminal', () => {
  assert.deepEqual(
    lines.filter(line => [...line].length > 84),
    [],
  );
});

test('frames every page, so all of its lines are equally wide', () => {
  const widths = new Set(lines.filter(line => line !== '').map(line => [...line].length));
  assert.equal(widths.size, 1);
  assert.equal(lines.filter(line => line.startsWith('╭─ Page')).length, 2);
});

// Oriko, six rows tall, so the place of the photo stands out on paper too.
test('shows a face where the photo stands, on the first page only', () => {
  assert.equal(text.split('│ ●   ●  │').length - 1, 1);
  assert.ok(text.indexOf('│ ●   ●  │') < text.indexOf('Page 2 of 2'));
  const top = lines.findIndex(line => line.includes('╭───────┐'));
  assert.ok(lines[top + 5]?.includes('╰────────╯'));
  assert.ok(lines.slice(top, top + 6).some(line => line.includes('Jane')));
});

// A blank row above the photo, two characters left of it: about the same room, as a row is
// twice as high as a character is wide. Name and contact start on the photo's first row.
test('leaves as much room above the photo as left of it, and lines the name up with it', () => {
  const top = lines.findIndex(line => line.includes('╭───────┐'));
  assert.match(lines[top] ?? '', /^│   ╭───────┐ +Jane │ CONTACT ─+ │$/);
  assert.match(lines[top - 1] ?? '', /^│ +│ +│$/);
  assert.equal(lines[top - 2]?.startsWith('╭─ Page 1'), true);
});

test('marks each bullet of a job with an angle that every font sets', () => {
  assert.ok(lines.some(line => line.includes('│ › Rebuilt the shipment')));
});

test('shows how full each column of a page is', () => {
  const half = { used: 394, free: 394, blocks: [] };
  const full = { used: 788, free: 0, blocks: [] };
  const sheet = preview(fixture(), { pages: [{ left: half, right: full }] });
  assert.ok(sheet.includes('Left  ■■■■■□□□□□ 50 % full'));
  assert.ok(sheet.includes('Right ■■■■■■■■■■ 100 % full'));
});
