/**
 * The codes `oriko read` raises on adx, each declared once with its kind and hint.
 *
 * nothingToRead, profileMissing: a call that names no source, and a posting without a profile.
 * sourceNotFound, sourceNotAFile, sourceTooLarge: a source file that cannot be read.
 * unsupportedKind, unreadable, noText: a document oriko cannot turn into text.
 * addressNotAllowed, privateAddress, tooManyRedirects, encodingNotAllowed, httpStatus: a download
 * the checks refuse.
 * downloadFailed, siteBusy: a download a later call may finish.
 *
 * adx owns MISSING_INPUT, FILE_NOT_FOUND, NOT_A_FILE, INPUT_TOO_LARGE, URL_NOT_ALLOWED,
 * NETWORK_FAILED and SERVER_BUSY, and a tool that declares one does not start, so these codes have
 * names of their own. A code has one hint, so where the old issues had several, the message
 * names what differs.
 *
 * @example return [issue.nothingToRead.at('posting', 'The command names nothing to read')];
 */
import { code } from '@honeyglass/adx';
import { READ_LIMITS } from './limits.ts';

export const nothingToRead = code(
  'NOTHING_TO_READ',
  'fix',
  'Run the command and pass --posting, --notes or --resume with a file or an https:// address',
);
export const profileMissing = code(
  'MISSING_OPTION',
  'fix',
  'Run the command for the existing profiles, or pass a new name in lower-case words joined by hyphens',
);

export const sourceNotFound = code(
  'SOURCE_NOT_FOUND',
  'fix',
  'Check the path, or pass the full path of the file',
);
export const sourceNotAFile = code(
  'SOURCE_NOT_A_FILE',
  'fix',
  'Pass the path of a file, not of a folder',
);
export const sourceTooLarge = code(
  'SOURCE_TOO_LARGE',
  'fix',
  'Pass a smaller document, or copy the text into a .txt or .md file and pass that file',
);

export const unsupportedKind = code(
  'UNSUPPORTED_KIND',
  'fix',
  'Save it as PDF or as text, then pass that file',
);
export const unreadable = code(
  'DOCUMENT_UNREADABLE',
  'fix',
  'Save it again as a new file without a password, or save the page, and pass that file',
);
export const noText = code(
  'NO_TEXT',
  'fix',
  'Copy the text into a .txt or .md file and pass that file',
);

export const addressNotAllowed = code(
  'ADDRESS_NOT_ALLOWED',
  'fix',
  'Pass an https:// address without a port, a user or a password, or save the page and pass the file',
);
export const privateAddress = code(
  'PRIVATE_ADDRESS',
  'fix',
  'oriko loads only from the public internet; save the page and pass the file',
);
export const tooManyRedirects = code(
  'TOO_MANY_REDIRECTS',
  'fix',
  'Open it in a browser and pass the address it ends at, or save the page and pass the file',
);
export const encodingNotAllowed = code(
  'ENCODING_NOT_ALLOWED',
  'fix',
  'Save the page and pass the file',
);
export const httpStatus = code(
  'HTTP_STATUS',
  'fix',
  'Check the address, or save the page and pass the file',
);

export const downloadFailed = code(
  'DOWNLOAD_FAILED',
  'retry',
  `Check the address and the connection, then call again; a download may take at most ${READ_LIMITS.downloadSeconds} seconds, or save the page and pass the file`,
);
export const siteBusy = code('SITE_BUSY', 'retry', 'Call again later');
