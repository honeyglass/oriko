import assert from 'node:assert/strict';
import { test } from 'node:test';
import JSZip from 'jszip';
import { place } from '../../core/place.old.ts';
import { render } from '../../classic/docx.ts';
import { fixture, photo, unwrap } from '../utils/fixture.ts';

const build = async () => {
  const docx = await render(fixture(), unwrap(place(fixture())), { bytes: photo(), file: 'cv' });
  assert.ok(docx instanceof Uint8Array);
  return docx;
};

test('renders the same bytes for the same input', async () => {
  assert.deepEqual(await build(), await build());
});

test('renders every page of the plan and the text of its blocks', async () => {
  const zip = await JSZip.loadAsync(await build());
  const xml = (await zip.file('word/document.xml')?.async('string')) ?? '';
  assert.equal(xml.split('<w:pageBreakBefore/>').length - 1, 1);
  for (const text of [
    'Jane',
    'Programming Languages',
    'Campus Software Lab',
    'Team Award',
    'Gin, gRPC, React',
  ]) {
    assert.ok(xml.includes(text), text);
  }
});

// A text reader takes a job in document order: title, date, then employer and place.
test('writes the date of a job after its title and the place after its employer', async () => {
  const zip = await JSZip.loadAsync(await build());
  const xml = (await zip.file('word/document.xml')?.async('string')) ?? '';
  const at = (text: string) => xml.indexOf(text);
  assert.ok(at('Senior Backend Engineer') < at('03/2021 – today'));
  assert.ok(at('03/2021 – today') < at('Northwind Logistics GmbH'));
  assert.ok(at('Northwind Logistics GmbH') < at('Berlin (DE)'));
});

// The issue stands below the file that names the photo, so a profile's photo is the profile's.
test('refuses a photo that is no PNG, below the file that names it', async () => {
  const plan = unwrap(place(fixture()));
  const bytes = Buffer.from('not a png');
  for (const file of ['cv', 'profile'] as const) {
    const result = await render(fixture(), plan, { bytes, file });
    assert.deepEqual(Array.isArray(result) ? result.map(issue => [issue.code, issue.path]) : [], [
      ['PHOTO_UNREADABLE', [file, 'person', 'photo']],
    ]);
  }
});
