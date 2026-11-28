import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pagePlan } from '../../core/place.ts';
import { codes, fixture, unwrap } from '../utils/fixture.ts';

const ids = (blocks: { id: string }[]) => blocks.map(block => block.id);
const near = (actual: number | undefined, expected: number) =>
  assert.ok(
    actual !== undefined && Math.abs(actual - expected) <= 1,
    `${actual} is not within 1 pt of ${expected}`,
  );

test('places the reference CV as the reference PDF shows it', () => {
  const { pages } = unwrap(pagePlan(fixture()));
  assert.equal(pages.length, 2);
  assert.deepEqual(ids(pages[0]?.left.blocks ?? []), ['northwind', 'bluebird', 'harbor', 'lumen']);
  assert.deepEqual(ids(pages[1]?.left.blocks ?? []), ['campus', 'freelance', 'cedar']);
  assert.deepEqual(ids(pages[0]?.right.blocks ?? []), [
    'programming-languages',
    'expertise',
    'libraries',
    'strengths',
    'additional-skills',
  ]);
  assert.deepEqual(ids(pages[1]?.right.blocks ?? []), ['languages', 'interests', 'awards']);
});

// The expected heights are distances measured in the reference PDF, in pt: a job with three
// and with two bullet lines, and a titled group of five rated items. A job adds 13.6 pt for the
// blank line below its title, as a Google Docs PDF of the examples shows. The blocks here have
// that shape, with texts short enough that each stays on one line.
test('estimates a block as high as the reference PDF shows that shape', () => {
  const { pages } = unwrap(pagePlan(fixture()));
  const left = pages[0]?.left.blocks ?? [];
  const right = pages[0]?.right.blocks ?? [];
  near(left[1]?.height, 118.9);
  near(left[2]?.height, 105.4);
  near(pages[1]?.left.blocks[1]?.height, 118.9);
  near(right[1]?.height, 111.3);
});

test('prints a section heading once per page', () => {
  const { pages } = unwrap(pagePlan(fixture()));
  const headings = (pages[0]?.right.blocks ?? []).map(block => block.heading?.text ?? null);
  assert.deepEqual(headings, ['Skills', null, null, null, null]);
  assert.equal(pages[1]?.left.blocks[0]?.heading?.text, 'Professional Experience');
});

// The left heading of page 1 stands 210.2 pt down its column; the right one stands as far down,
// below a contact block of 163.7 pt here, and the first group sits as far below it as a job.
test('lines the first right heading and group up with the left ones on page 1', () => {
  const cv = fixture();
  const first = () => unwrap(pagePlan(cv)).pages[0]?.right.blocks[0]?.heading;
  assert.deepEqual(first(), { text: 'Skills', before: 929, after: 188 });
  cv.contact.items.pop();
  assert.equal(first()?.before, 929 + 392, 'one contact row of 19.6 pt less');
  cv.contact.items.push(
    ...Array.from({ length: 3 }, () => ({ icon: 'pin' as const, lines: ['x'] })),
  );
  assert.equal(first()?.before, 748, 'a long contact block keeps the gap between two sections');
});

test('moves a block that no longer fits to the next page as a whole', () => {
  const cv = fixture();
  const lumen = cv.blocks[3];
  if (lumen?.kind === 'job')
    lumen.bullets.push(...Array.from({ length: 10 }, (_, n) => `Extra point ${n}`));
  const campus = cv.blocks[4];
  if (campus !== undefined) delete campus.page;
  cv.pages = 3;
  const { pages } = unwrap(pagePlan(cv));
  assert.deepEqual(ids(pages[0]?.left.blocks ?? []), ['northwind', 'bluebird', 'harbor']);
  assert.equal(pages[1]?.left.blocks[0]?.id, 'lumen');
});

test('starts a pinned block and all blocks after it on its page', () => {
  const cv = fixture();
  const harbor = cv.blocks[2];
  if (harbor !== undefined) harbor.page = 2;
  cv.pages = 3;
  const { pages } = unwrap(pagePlan(cv));
  assert.deepEqual(ids(pages[0]?.left.blocks ?? []), ['northwind', 'bluebird']);
  assert.deepEqual(ids(pages[1]?.left.blocks ?? []).slice(0, 2), ['harbor', 'lumen']);
});

test('refuses a CV that needs more pages than it allows, and names the blocks', () => {
  const cv = fixture();
  cv.pages = 1;
  const result = pagePlan(cv);
  assert.deepEqual(codes(result), ['PAGE_OVERFLOW', 'PAGE_OVERFLOW']);
  assert.match(result.error?.issues[0]?.message ?? '', /campus/);
});

// Google Docs broke this role as "Clou d" onto a second line, below the name block.
test('refuses a role that does not fit on one line beside the photo', () => {
  const cv = fixture();
  cv.person.role = 'IT-Projektmanager Infrastruktur & Cloud';
  const result = pagePlan(cv);
  assert.deepEqual(codes(result), ['ROLE_TOO_LONG']);
  assert.equal(result.error?.issues[0]?.path, 'person.role');
  cv.person.role = 'IT-Projektmanager Infrastruktur';
  assert.equal(pagePlan(cv).error, null);
});

test('refuses a block that is higher than a page', () => {
  const cv = fixture();
  const northwind = cv.blocks[0];
  if (northwind?.kind === 'job')
    northwind.bullets = Array.from({ length: 12 }, () => 'word '.repeat(59) + 'end');
  assert.ok(codes(pagePlan(cv)).includes('BLOCK_TOO_TALL'));
});
