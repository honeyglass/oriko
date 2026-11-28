/**
 * The issues the download and the text of a source raise, each made by one function.
 *
 * unsupportedKind, unreadable, noText: a document oriko cannot turn into text.
 * urlNotAllowed, privateAddress, tooManyRedirects, encodingNotAllowed, notUnpacked: a download
 * the checks refuse.
 * lookupFailed, networkFailed, bodyFailed, serverBusy, httpStatus: a failed download.
 *
 * ./web.ts and ./text.ts answer these issues of their own; ./sources.ts turns each into the code
 * of ./issues.ts that adx answers, since adx owns some of their names.
 *
 * @example return rejected('read', [issue.tooManyRedirects(option)]);
 */
import { shown } from '@honeyglass/utils/ts';
import { NETWORK_FAILED, SERVER_BUSY } from '../core/errors.ts';
import type { Issue } from '../core/errors.ts';
import { READ_LIMITS } from './limits.ts';

export const unsupportedKind = (option: string): Issue => ({
  code: 'UNSUPPORTED_KIND',
  path: option,
  message: 'The document is no PDF, Word file, HTML page or UTF-8 text',
  hint: 'Save it as PDF or as text, then pass that file',
});

export const unreadable = (option: string, kind: string): Issue => ({
  code: 'DOCUMENT_UNREADABLE',
  path: option,
  message: `The ${kind} is broken, encrypted or cannot be opened`,
  hint: `Open it, save it again as a new ${kind} without a password, and pass that file`,
});

export const noText = (option: string): Issue => ({
  code: 'NO_TEXT',
  path: option,
  message: `The document behind --${shown(option)} holds no text, such as a scan`,
  hint: 'Copy the text into a .txt or .md file and pass that file',
});

export const urlNotAllowed = (option: string, link: string, problem: string): Issue => ({
  code: 'URL_NOT_ALLOWED',
  path: option,
  message: `The address ${shown(link)} ${problem}`,
  hint: 'Pass an https:// address without a port, a user or a password, or save the page and pass the file',
});

export const privateAddress = (option: string, host: string): Issue => ({
  code: 'PRIVATE_ADDRESS',
  path: option,
  message: `${shown(host)} leads to no public address`,
  hint: 'oriko loads only from the public internet; save the page and pass the file',
});

export const tooManyRedirects = (option: string): Issue => ({
  code: 'TOO_MANY_REDIRECTS',
  path: option,
  message: `The address leads on more than ${READ_LIMITS.redirects} times`,
  hint: 'Open it in a browser and pass the address it ends at, or save the page and pass the file',
});

export const encodingNotAllowed = (option: string, encoding: string): Issue => ({
  code: 'ENCODING_NOT_ALLOWED',
  path: option,
  message: `The server sent the body as ${shown(encoding)}`,
  hint: 'Save the page and pass the file',
});

export const notUnpacked = (option: string, encoding: string): Issue => ({
  code: 'DOCUMENT_UNREADABLE',
  path: option,
  message: `The body could not be unpacked from ${shown(encoding)}`,
  hint: 'Save the page and pass the file',
});

export const lookupFailed = (option: string, host: string, error: Error): Issue => ({
  code: NETWORK_FAILED,
  path: option,
  message: `The name ${shown(host)} could not be resolved: ${'code' in error ? `${error.code}` : error.name}`,
  hint: 'Check the address and the connection, then call again',
});

export const networkFailed = (option: string, url: URL, error: Error): Issue => ({
  code: NETWORK_FAILED,
  path: option,
  message: `The request to ${shown(url.host)} failed: ${'code' in error ? `${error.code}` : error.name}`,
  hint: 'Check the connection, then call again; or save the page and pass the file',
});

export const bodyFailed = (option: string, error: Error): Issue => ({
  code: NETWORK_FAILED,
  path: option,
  message: `The download stopped: ${'code' in error ? `${error.code}` : error.name}`,
  hint: `Call again; a download may take at most ${READ_LIMITS.downloadSeconds} seconds`,
});

export const serverBusy = (option: string, status: number): Issue => ({
  code: SERVER_BUSY,
  path: option,
  message: `The server answered ${status}`,
  hint: 'Call again later',
});

export const httpStatus = (option: string, status: number): Issue => ({
  code: 'HTTP_STATUS',
  path: option,
  message: `The server answered ${status}`,
  hint: 'Check the address, or save the page and pass the file',
});
