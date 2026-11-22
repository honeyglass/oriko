/**
 * The program answers every recorded call as tests/fixtures/behavior.json holds it.
 *
 * The golden is the behavior a rebuild of oriko's shell must keep: stdout, stderr, the exit code
 * and the files of each call. After a change that alters an answer on purpose, record it again
 * with pnpm behavior:update and read the diff of the golden before the commit.
 *
 * @example node --test tests/api/behavior.api.spec.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { z } from 'zod';
import { BEHAVIOR_URL, behaviorOf } from '../utils/behavior.ts';

// Loose, so every other field of a record stays for the comparison below.
const Golden = z.array(z.looseObject({ scenario: z.string(), argv: z.array(z.string()) }));

const golden = Golden.parse(JSON.parse(readFileSync(BEHAVIOR_URL, 'utf8')));
const now = behaviorOf();

const named = ({ scenario, argv }: { scenario: string; argv: string[] }) =>
  `${scenario}: oriko ${argv.join(' ')}`;

test('the program makes the calls the golden holds, in its order', () => {
  assert.deepEqual(now.map(named), golden.map(named));
});

for (const [index, call] of now.entries())
  test(`${named(call)} (call ${index + 1}) answers as recorded`, () => {
    assert.deepEqual(call, golden[index]);
  });
