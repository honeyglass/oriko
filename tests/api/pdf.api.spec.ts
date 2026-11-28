import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { sofficePaths } from '../../pdf/convert.ts';
import { call, workspace } from '../utils/cli.ts';
import { textLines } from '../utils/pdflines.ts';

const EXAMPLES = fileURLToPath(new URL('../../examples', import.meta.url));
const PROFILES = ['galeria-cook', 'davita-it-project-manager', 'go-e-senior-backend'];
const skip = sofficePaths().some(path => existsSync(path)) ? false : 'LibreOffice is not installed';

// The showcase PDFs come from Google Docs. The PDF through LibreOffice must show the same lines on
// the same pages at the same places. LibreOffice rounds each line height to 1/20 pt, which adds up
// to about 1 pt down a classic page; the terminal look has one line height for the whole page.
const LOOKS = [
  { style: 'classic', suffix: '', columnEdge: 425, tolerance: 1.5 },
  { style: 'terminal', suffix: '-terminal', columnEdge: Infinity, tolerance: 0.75 },
];

for (const name of PROFILES)
  for (const { style, suffix, columnEdge, tolerance } of LOOKS) {
    const file = `${name}${suffix}`;
    test(`sets the example ${file} through LibreOffice as Google Docs does`, { skip }, async () => {
      const space = { ...workspace(), home: EXAMPLES };
      const argv = ['build', '--profile', name, '--style', style, '--out', `${file}.pdf`];
      assert.equal((await call(space, argv)).exit, 0);
      const google = await textLines(
        readFileSync(join(EXAMPLES, 'showcase', name, `${file}.pdf`)),
        columnEdge,
      );
      const local = await textLines(readFileSync(join(space.cwd, `${file}.pdf`)), columnEdge);
      const texts = (lines: typeof google) => lines.map(line => `${line.page} ${line.text}`);
      assert.deepEqual(texts(local), texts(google));
      for (const [index, line] of google.entries()) {
        const other = local[index] ?? line;
        const offset = Math.max(
          Math.abs(other.y - line.y),
          Math.abs(other.x - line.x),
          Math.abs(other.end - line.end),
        );
        assert.ok(
          offset <= tolerance,
          `page ${line.page} "${line.text}" is ${offset.toFixed(2)} pt off`,
        );
      }
    });
  }
