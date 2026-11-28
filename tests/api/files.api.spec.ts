// Piped input stops one byte past its limit, and a refusal of the system goes to who can solve it.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pathIssue, pipedBytes } from '../../core/files.ts';

async function* endless() {
  while (true) yield Buffer.alloc(1000, 'a');
}

async function* short() {
  yield Buffer.from('{"id":');
  yield Buffer.from('"awards"}');
}

test('reads piped input whole, and an endless one only to one byte past the limit', async () => {
  assert.equal((await pipedBytes(short(), 100)).toString(), '{"id":"awards"}');
  assert.equal((await pipedBytes(endless(), 2500)).length, 2501);
});

const systemError = (code: string) => Object.assign(new Error(code), { code, syscall: 'open' });

// A path the caller changes fixes a refused path; anything else the system refuses, a full disk
// or a code nobody planned for, is the person's to solve: it holds no issue, and the callers hand
// its error to adx, which answers SYSTEM_REFUSED.
test('a refusal of the system goes to the caller for a path, else to the person', () => {
  const codes = ['ENOENT', 'EACCES', 'ENOTDIR', 'ENOSPC', 'EIO', 'EUNPLANNED'].map(code => [
    code,
    pathIssue(systemError(code), '/x', 'out')?.code,
  ]);
  assert.deepEqual(codes, [
    ['ENOENT', 'FILE_NOT_FOUND'],
    ['EACCES', 'PATH_REFUSED'],
    ['ENOTDIR', 'PATH_REFUSED'],
    ['ENOSPC', undefined],
    ['EIO', undefined],
    ['EUNPLANNED', undefined],
  ]);
});
