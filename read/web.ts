/**
 * A document from a URL, loaded only from a public address over https.
 *
 * download: the bytes behind a URL, after its redirects.
 * Web, Target, Answer: the two calls that reach the network, so a test stands in for them.
 * NODE_WEB: those two calls in Node, the resolver and one https request.
 *
 * Every hop passes the same checks: https on port 443 without a user, and a public address.
 * The address is checked where the request goes to it, so a name that resolves elsewhere a
 * moment later cannot lead past the check. The body, its unpacking, the redirects and the time
 * each stop at a limit, and an encoding not on the list is refused.
 *
 * @example const bytes = await download(link, io.web, 'posting');
 */
import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { isIP } from 'node:net';
import { brotliDecompressSync, gunzipSync, inflateSync } from 'node:zlib';
import { $try, trySync$ } from '@honeyglass/utils/ts';
import { done, rejected } from '../core/errors.ts';
import type { Result } from '../core/errors.ts';
import * as issue from './issues.old.ts';
import * as coreIssue from '../core/issues.old.ts';
import { FILE_LIMITS } from '../core/files.limits.ts';
import { pipedBytes } from '../core/files.ts';
import { isPublic } from './address.ts';
import { READ_LIMITS } from './limits.ts';

export type Target = { address: string; url: URL; signal: AbortSignal };
export type Answer = {
  status: number;
  location: string | undefined;
  encoding: string | undefined;
  body: AsyncIterable<unknown>;
};
export type Web = {
  /** Every address a host name resolves to. */
  lookup: (host: string) => Promise<string[]>;
  /** One request to the checked address; it never follows a redirect itself. */
  get: (target: Target) => Promise<Answer>;
};

/**
 * @param link - the URL the caller gave
 * @param web - the network
 * @param option - the cli option that named the URL, for the path of an issue
 * @returns the body, unpacked; a refusal for a URL, an address or an answer the lists do not allow
 */
export async function download(link: string, web: Web, option: string): Promise<Result<Buffer>> {
  const signal = AbortSignal.timeout(READ_LIMITS.downloadSeconds * 1_000);
  let next = link;
  for (let hop = 0; hop <= READ_LIMITS.redirects; hop += 1) {
    const reached = await requested(next, web, signal, option);
    if (reached.error !== null) return reached;
    const { url, answer } = reached.data;
    const location = redirectOf(answer, url);
    if (location === null) return bodyOf(answer, option);
    next = location;
  }
  return rejected('read', [issue.tooManyRedirects(option)]);
}

// One hop: the URL and the address pass their lists before anything is sent.
async function requested(link: string, web: Web, signal: AbortSignal, option: string) {
  const url = URL.parse(link);
  if (url === null) return rejected('read', [issue.urlNotAllowed(option, link, 'is no URL')]);
  const problem = urlProblem(url);
  if (problem !== null) return rejected('read', [issue.urlNotAllowed(option, link, problem)]);
  const address = await publicAddress(hostOf(url), web, option);
  if (address.error !== null) return address;
  const answer = await $try(web.get({ address: address.data, url, signal }));
  if (answer.error !== null)
    return rejected('read', [issue.networkFailed(option, url, answer.error)], answer.error);
  return done({ url, answer: answer.data });
}

// The three properties a URL must have; anything else it may hold is refused.
function urlProblem(url: URL) {
  if (url.protocol !== 'https:') return 'uses no https';
  if (url.port !== '') return 'names a port other than 443';
  if (url.username !== '' || url.password !== '') return 'holds a user or a password';
  return null;
}

const hostOf = (url: URL) => url.hostname.replace(/^\[|\]$/g, '');

// A host written as an address is that address; a name is the first public address it resolves to.
async function publicAddress(host: string, web: Web, option: string): Promise<Result<string>> {
  const candidates = isIP(host) === 0 ? await $try(web.lookup(host)) : done([host]);
  if (candidates.error !== null)
    return rejected('read', [issue.lookupFailed(option, host, candidates.error)], candidates.error);
  const address = candidates.data.find(isPublic);
  if (address === undefined) return rejected('read', [issue.privateAddress(option, host)]);
  return done(address);
}

const REDIRECTS = new Set([301, 302, 303, 307, 308]);

// The next URL of a redirect, resolved against the current one; null for any other answer.
function redirectOf(answer: Answer, url: URL) {
  if (REDIRECTS.has(answer.status) === false || answer.location === undefined) return null;
  return URL.parse(answer.location, url)?.href ?? answer.location;
}

// The encodings a body may come in, each unpacked only up to the limit.
const UNPACK: Record<string, ((body: Buffer) => Buffer) | undefined> = {
  identity: body => body,
  gzip: body => gunzipSync(body, { maxOutputLength: FILE_LIMITS.readBytes }),
  'x-gzip': body => gunzipSync(body, { maxOutputLength: FILE_LIMITS.readBytes }),
  deflate: body => inflateSync(body, { maxOutputLength: FILE_LIMITS.readBytes }),
  br: body => brotliDecompressSync(body, { maxOutputLength: FILE_LIMITS.readBytes }),
};

async function bodyOf(answer: Answer, option: string): Promise<Result<Buffer>> {
  if (answer.status === 429 || answer.status >= 500)
    return rejected('read', [issue.serverBusy(option, answer.status)]);
  if (answer.status < 200 || answer.status > 299)
    return rejected('read', [issue.httpStatus(option, answer.status)]);
  const encoding = (answer.encoding ?? 'identity').trim().toLowerCase();
  const unpack = Object.hasOwn(UNPACK, encoding) ? UNPACK[encoding] : undefined;
  if (unpack === undefined) return rejected('read', [issue.encodingNotAllowed(option, encoding)]);
  const body = await $try(pipedBytes(answer.body, FILE_LIMITS.readBytes));
  if (body.error !== null)
    return rejected('read', [issue.bodyFailed(option, body.error)], body.error);
  if (body.data.length > FILE_LIMITS.readBytes)
    return rejected('read', [coreIssue.tooLarge(option, FILE_LIMITS.readBytes)]);
  const unpacked = trySync$(() => unpack(body.data));
  if (unpacked.error === null) return done(unpacked.data);
  const isTooLarge = 'code' in unpacked.error && unpacked.error.code === 'ERR_BUFFER_TOO_LARGE';
  if (isTooLarge) return rejected('read', [coreIssue.tooLarge(option, FILE_LIMITS.readBytes)]);
  return rejected('read', [issue.notUnpacked(option, encoding)], unpacked.error);
}

// Node's calls; agent false, so no connection is shared with a host that passed another check.
export const NODE_WEB: Web = {
  lookup: async host =>
    (await lookup(host, { all: true, verbatim: true })).map(entry => entry.address),
  get: target =>
    new Promise((resolve, reject) => {
      const host = hostOf(target.url);
      const outgoing = request(
        {
          host: target.address,
          port: 443,
          method: 'GET',
          path: `${target.url.pathname}${target.url.search}`,
          servername: isIP(host) === 0 ? host : undefined,
          headers: {
            host: target.url.host,
            'user-agent': 'oriko',
            accept: '*/*',
            'accept-encoding': 'gzip, deflate, br',
          },
          signal: target.signal,
          agent: false,
        },
        incoming =>
          resolve({
            status: incoming.statusCode ?? 0,
            location: incoming.headers.location,
            encoding: incoming.headers['content-encoding'],
            body: incoming,
          }),
      );
      outgoing.on('error', reject);
      outgoing.end();
    }),
};
