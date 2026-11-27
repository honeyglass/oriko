// A value in a command oriko names comes back from the shell as it was, on one visible line.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import { UNSAFE_CHAR } from '@honeyglass/utils/ts';
import { readArgs } from '../../cli/args.ts';
import { optionText } from '../../core/options.old.ts';

const VALUES = [
  'jane',
  'x;touch PWNED',
  "it's",
  '~',
  '-data',
  '$(id) `id`',
  'a\u001b]0;TITLE\u0007b',
  'line\nNext: oriko build',
  'tab\there',
  'bidi‮evil',
  'zero​width',
  'Jürgen 😀',
];

// bash prints each word it splits the text into, so the test sees what a caller's shell passes on.
const shellWords = (text: string) =>
  execFileSync('bash', ['-c', `printf '%s\\0' ${text}`], { encoding: 'utf8' })
    .split('\0')
    .slice(0, -1);

test('a value in a command comes back from the shell as itself, on one visible line', () => {
  for (const value of VALUES) {
    const text = optionText('cv', value);
    assert.equal(UNSAFE_CHAR.test(text), false, JSON.stringify(text));
    assert.equal(readArgs(shellWords(text)).values.cv, value, JSON.stringify(text));
  }
});
