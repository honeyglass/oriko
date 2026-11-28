// A download goes only to a public address over https on port 443, at every hop, and stops at a
// limit; anything nobody planned for is refused.
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { test } from 'node:test';
import { FILE_LIMITS } from '../../core/files.limits.ts';
import { READ_LIMITS } from '../../read/limits.ts';
import { isPublic } from '../../read/address.ts';
import { download } from '../../read/web.ts';
import { codes } from '../utils/fixture.ts';
import { fakeWeb } from '../utils/web.ts';

const PUBLIC = '93.184.216.34';

test('only a public unicast address passes, a range nobody planned for too is refused', () => {
  const cases: [string, boolean][] = [
    ['93.184.216.34', true],
    ['1.1.1.1', true],
    ['2606:4700:4700::1111', true],
    ['127.0.0.1', false],
    ['10.1.2.3', false],
    ['172.16.0.1', false],
    ['192.168.1.1', false],
    ['169.254.169.254', false],
    ['100.64.0.1', false],
    ['0.0.0.0', false],
    ['224.0.0.1', false],
    ['255.255.255.255', false],
    ['::1', false],
    ['::', false],
    ['fe80::1', false],
    ['fc00::1', false],
    ['::ffff:127.0.0.1', false],
    ['2001:db8::1', false],
    ['2002:7f00:1::', false],
    ['5f00::1', false],
    ['jobs.example', false],
  ];
  assert.deepEqual(
    cases.map(([address]) => [address, isPublic(address)]),
    cases,
  );
});

test('refuses a URL that is no https URL on port 443 without a user', async () => {
  const { web, requests } = fakeWeb({}, {});
  const links = [
    'not a url',
    'http://jobs.example/1',
    'ftp://jobs.example/1',
    'https://jobs.example:8443/1',
    'https://user:secret@jobs.example/1',
  ];
  for (const link of links)
    assert.deepEqual(codes(await download(link, web, 'posting')), ['URL_NOT_ALLOWED'], link);
  assert.deepEqual(requests, []);
});

// The check runs on the address the request goes to, so a name that resolves to a private
// address, or one written as a private address, sends nothing.
test('sends a request only to a public address a name resolves to', async () => {
  const { web, requests } = fakeWeb(
    { 'intranet.example': ['10.0.0.5'], 'jobs.example': ['10.0.0.5', PUBLIC] },
    { 'https://jobs.example/1': { status: 200, body: 'Senior Go Engineer' } },
  );
  assert.deepEqual(codes(await download('https://intranet.example/', web, 'posting')), [
    'PRIVATE_ADDRESS',
  ]);
  assert.deepEqual(codes(await download('https://127.0.0.1/', web, 'posting')), [
    'PRIVATE_ADDRESS',
  ]);
  assert.deepEqual(codes(await download('https://[::1]/', web, 'posting')), ['PRIVATE_ADDRESS']);
  const read = await download('https://jobs.example/1', web, 'posting');
  assert.deepEqual(
    [read.data?.toString(), requests],
    ['Senior Go Engineer', [{ address: PUBLIC, url: 'https://jobs.example/1' }]],
  );
});

// Every redirect passes the same check as the first request, and only a few are followed.
test('checks every redirect as the first request, and follows at most a few', async () => {
  const hops = Object.fromEntries(
    Array.from({ length: READ_LIMITS.redirects + 1 }, (_, index) => [
      `https://jobs.example/${index}`,
      { status: 302, location: `/${index + 1}` },
    ]),
  );
  const { web } = fakeWeb(
    { 'jobs.example': [PUBLIC], 'intranet.example': ['10.0.0.5'] },
    {
      ...hops,
      'https://jobs.example/private': { status: 302, location: 'https://intranet.example/' },
      'https://jobs.example/plain': { status: 302, location: 'http://ats.example/job' },
    },
  );
  const firm = fakeWeb(
    { 'firm.example': [PUBLIC], 'ats.example': [PUBLIC] },
    {
      'https://firm.example/1': { status: 301, location: 'https://ats.example/job' },
      'https://ats.example/job': { status: 200, body: 'Posting' },
    },
  );
  assert.equal(
    (await download('https://firm.example/1', firm.web, 'posting')).data?.toString(),
    'Posting',
  );
  const refused = [
    await download('https://jobs.example/private', web, 'posting'),
    await download('https://jobs.example/plain', web, 'posting'),
    await download('https://jobs.example/0', web, 'posting'),
  ];
  assert.deepEqual(refused.map(codes), [
    ['PRIVATE_ADDRESS'],
    ['URL_NOT_ALLOWED'],
    ['TOO_MANY_REDIRECTS'],
  ]);
});

async function* endless() {
  while (true) yield Buffer.alloc(65_536, 'a');
}

// The body stops at the limit as it arrives, and a compressed body stops at it as it unpacks.
test('stops a body at the limit, packed or not, and takes only listed encodings', async () => {
  const { web } = fakeWeb(
    { 'jobs.example': [PUBLIC] },
    {
      'https://jobs.example/endless': { status: 200, body: endless() },
      'https://jobs.example/bomb': {
        status: 200,
        encoding: 'gzip',
        body: gzipSync(Buffer.alloc(FILE_LIMITS.readBytes + 1, 'a')),
      },
      'https://jobs.example/packed': { status: 200, encoding: 'gzip', body: gzipSync('Posting') },
      'https://jobs.example/odd': { status: 200, encoding: 'x-unknown', body: 'Posting' },
    },
  );
  const answers = await Promise.all(
    ['endless', 'bomb', 'packed', 'odd'].map(page =>
      download(`https://jobs.example/${page}`, web, 'posting'),
    ),
  );
  assert.deepEqual(
    answers.map(answer => answer.data?.toString() ?? codes(answer)),
    [['INPUT_TOO_LARGE'], ['INPUT_TOO_LARGE'], 'Posting', ['ENCODING_NOT_ALLOWED']],
  );
});

// A missing page is the caller's to fix; a busy server or a failed connection is for later, a
// kind read/issues.ts declares for the code each of these turns into.
test('tells a missing page apart from a busy server and a failed connection', async () => {
  const { web } = fakeWeb(
    { 'jobs.example': [PUBLIC] },
    {
      'https://jobs.example/gone': { status: 404 },
      'https://jobs.example/busy': { status: 503 },
    },
  );
  const answers = [
    await download('https://jobs.example/gone', web, 'posting'),
    await download('https://jobs.example/busy', web, 'posting'),
    await download('https://nowhere.example/', web, 'posting'),
  ];
  assert.deepEqual(
    answers.map(answer => codes(answer)[0]),
    ['HTTP_STATUS', 'SERVER_BUSY', 'NETWORK_FAILED'],
  );
});
