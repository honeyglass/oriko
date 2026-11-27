import assert from 'node:assert/strict';
import { test } from 'node:test';
import JSZip from 'jszip';
import { withCredits } from '../../terminal/credits.ts';
import { place } from '../../core/place.old.ts';
import { preview } from '../../terminal/sheets.ts';
import { renderTerminal } from '../../terminal/docx.ts';
import { fixture, unwrap } from '../utils/fixture.ts';

const plan = () => unwrap(place(fixture()));
const build = async () => unwrap(await renderTerminal(fixture(), plan()));

// The text of each paragraph, page by page, as Google Docs reads it.
async function pages() {
  const zip = await JSZip.loadAsync(await build());
  const xml = (await zip.file('word/document.xml')?.async('string')) ?? '';
  const paragraphs = [...xml.matchAll(/<w:p>([\s\S]*?)<\/w:p>/g)].map(match => match[1] ?? '');
  const result: string[][] = [];
  for (const paragraph of paragraphs) {
    if (paragraph.includes('<w:pageBreakBefore/>') || result.length === 0) result.push([]);
    const text = [...paragraph.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map(m => m[1]).join('');
    result.at(-1)?.push(text);
  }
  return { xml, result };
}

test('renders the same bytes for the same input', async () => {
  assert.deepEqual(await build(), await build());
});

test('sets every sheet of the preview on a page of its own, in Fira Code', async () => {
  const { xml, result } = await pages();
  const sheets = preview(fixture(), plan()).trimEnd().split('\n\n');
  assert.equal(result.length, 2);
  assert.ok(xml.includes('w:ascii="Fira Code"'));
  for (const [index, sheet] of sheets.entries()) {
    const lines = sheet.split('\n');
    assert.equal(result[index]?.[0], lines[0]);
    assert.equal(result[index]?.at(-1), lines.at(-1));
    assert.equal(result[index]?.at(-3), lines.at(-3));
  }
});

// The frame grows with empty rows, so its lower edge lands at the bottom of every page.
test('gives every page as many lines as the tallest page can hold', async () => {
  const { result } = await pages();
  const [first = [], second = []] = result;
  assert.equal(first.length, second.length);
  assert.ok(first.length >= 60);
  const empty = /^│ +│ +│$/;
  assert.ok(empty.test(second.at(-4) ?? ''));
});

// The column breaks the address over two lines, so each of them is a link.
test('links the address of oriko in the credits, and nothing without them', async () => {
  const cv = withCredits(fixture(), 2);
  const zip = await JSZip.loadAsync(unwrap(await renderTerminal(cv, unwrap(place(cv)))));
  const xml = (await zip.file('word/document.xml')?.async('string')) ?? '';
  const rels = (await zip.file('word/_rels/document.xml.rels')?.async('string')) ?? '';
  assert.equal(xml.split('<w:hyperlink').length - 1, 2);
  assert.ok(rels.includes('Target="https://github.com/honeyglass/oriko"'));
  const { xml: plain } = await pages();
  assert.equal(plain.includes('<w:hyperlink'), false);
});
