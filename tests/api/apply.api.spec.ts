import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Master } from '../../core/cv.schema.ts';
import { apply } from '../../edit/apply.ts';
import { fixture } from '../utils/fixture.ts';

const order = (master: { blocks: { id: string }[] }) => master.blocks.map(block => block.id);
const block = (master: Master, id: string) => master.blocks.find(candidate => candidate.id === id);

// The edits that pass answer the CV; a refusal is a list of issues, which fails the test here.
const edited = (result: Master | unknown[]) => {
  if (Array.isArray(result)) assert.fail(`refused: ${JSON.stringify(result)}`);
  return result;
};

test('block move puts a block after its anchor and sets or clears its page', () => {
  const moved = edited(
    apply(fixture(), 'block move', { id: 'strengths', after: 'programming-languages', page: 2 }),
  );
  assert.deepEqual(order(moved).slice(7, 10), ['programming-languages', 'strengths', 'expertise']);
  assert.equal(block(moved, 'strengths')?.page, 2);
  const cleared = edited(apply(moved, 'block move', { id: 'strengths', page: null }));
  assert.equal(block(cleared, 'strengths')?.page, undefined);
});

test('block add puts a new block before its anchor', () => {
  const added = {
    id: 'cloud',
    kind: 'rated' as const,
    section: 'Skills',
    title: 'Cloud',
    items: [{ name: 'AWS', level: 3 }],
  };
  const master = edited(apply(fixture(), 'block add', { block: added, before: 'expertise' }));
  assert.deepEqual(order(master).slice(7, 10), ['programming-languages', 'cloud', 'expertise']);
});

test('block update changes fields, and null removes an optional one', () => {
  const master = edited(
    apply(fixture(), 'block update', { id: 'campus', set: { title: 'Lead', page: null } }),
  );
  const changed = block(master, 'campus');
  assert.equal(changed?.kind === 'job' && changed.title, 'Lead');
  assert.equal(changed?.page, undefined);
});

test('block remove takes the block out', () => {
  const master = edited(apply(fixture(), 'block remove', { id: 'awards' }));
  assert.equal(order(master).includes('awards'), false);
});

test('item commands add, change, move and remove one item', () => {
  let master = edited(
    apply(fixture(), 'item add', {
      block: 'programming-languages',
      value: { name: 'Zig', level: 2 },
      index: 0,
    }),
  );
  master = edited(
    apply(master, 'item update', { block: 'programming-languages', index: 0, value: { level: 4 } }),
  );
  master = edited(apply(master, 'item move', { block: 'programming-languages', index: 0, to: 2 }));
  const languages = block(master, 'programming-languages');
  assert.deepEqual(languages?.kind === 'rated' && languages.items.slice(0, 3), [
    { name: 'Go', level: 5 },
    { name: 'TypeScript', level: 4 },
    { name: 'Zig', level: 4 },
  ]);
  master = edited(apply(master, 'item remove', { block: 'northwind', index: 0 }));
  const northwind = block(master, 'northwind');
  assert.equal(northwind?.kind === 'job' && northwind.bullets.length, 4);
});

test('cv update changes the language, the pages, the person and the contact title', () => {
  const input = {
    language: 'de',
    pages: 3,
    person: { role: 'Staff Engineer' },
    contact: { title: 'Kontakt' },
  };
  const master = edited(apply(fixture(), 'cv update', input));
  assert.deepEqual(
    [master.language, master.pages, master.person.role, master.contact.title],
    ['de', 3, 'Staff Engineer', 'Kontakt'],
  );
  assert.equal(master.person.firstName, 'Jane');
});

test('contact commands add, change, move and remove one contact line', () => {
  let master = edited(
    apply(fixture(), 'contact add', {
      value: { icon: 'globe', lines: ['Blog'], link: 'https://example.com/blog' },
      index: 0,
    }),
  );
  master = edited(apply(master, 'contact update', { index: 0, value: { lines: ['Weblog'] } }));
  master = edited(apply(master, 'contact move', { index: 0, to: 5 }));
  assert.deepEqual(master.contact.items[5], {
    icon: 'globe',
    lines: ['Weblog'],
    link: 'https://example.com/blog',
  });
  master = edited(apply(master, 'contact remove', { index: 5 }));
  assert.equal(master.contact.items.length, 5);
});

test('leaves the master it was given unchanged', () => {
  const before = fixture();
  edited(apply(before, 'block remove', { id: 'awards' }));
  assert.deepEqual(before, fixture());
});
