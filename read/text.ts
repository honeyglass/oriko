/**
 * A document as clean text: a posting, notes or an old CV, from a file or a download.
 *
 * textOf: the kind of the document, its text, and how many characters were replaced.
 * Kind: the kinds oriko reads.
 *
 * The kind comes from the content, never from a file name or a header a server sends. The list
 * holds PDF, Word, HTML and UTF-8 text; a kind nobody planned for is refused.
 *
 * @example const read = await textOf(bytes, 'posting');
 */
import { trySync$ } from '@honeyglass/utils/ts';
import { done, rejected } from '../core/errors.ts';
import type { Result } from '../core/errors.ts';
import * as issue from './issues.data.ts';
import * as coreIssue from '../core/issues.data.ts';
import { READ_LIMITS } from './limits.ts';
import { cleanText } from './clean.ts';
import { docxText } from './docx.ts';
import { htmlText } from './html.ts';
import { pdfText } from './pdf.ts';

export type Kind = 'pdf' | 'docx' | 'html' | 'text';

type Read = { kind: Kind; text: string; replaced: number };

/**
 * @param bytes - the whole document
 * @param option - the cli option that named it, for the path of an issue
 * @returns its kind and clean text; a refusal for another kind, a broken document or no text
 */
export async function textOf(bytes: Buffer, option: string): Promise<Result<Read>> {
  const raw = await rawText(bytes, option);
  if (raw.error !== null) return raw;
  const { text, replaced } = cleanText(raw.data.text);
  if (text === '') return rejected([issue.noText(option)]);
  return done({ kind: raw.data.kind, text, replaced });
}

const PDF = Buffer.from('%PDF-');
const ZIP = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

// One property per kind, tested in this order; the first that holds decides.
async function rawText(
  bytes: Buffer,
  option: string,
): Promise<Result<{ kind: Kind; text: string }>> {
  if (startsWith(bytes, PDF)) {
    const read = await pdfText(bytes);
    if (read.error !== null) return rejected([issue.unreadable(option, 'PDF')], read.error);
    return done({ kind: 'pdf', text: read.data });
  }
  if (startsWith(bytes, ZIP)) return wordText(bytes, option);
  const decoded = utf8(bytes);
  if (decoded === null) return rejected([issue.unsupportedKind(option)]);
  if (HTML_START.test(decoded)) return done({ kind: 'html', text: htmlText(decoded) });
  return done({ kind: 'text', text: decoded });
}

const startsWith = (bytes: Buffer, magic: Buffer) => bytes.subarray(0, magic.length).equals(magic);

async function wordText(
  bytes: Buffer,
  option: string,
): Promise<Result<{ kind: Kind; text: string }>> {
  const read = await docxText(bytes);
  switch (read.problem) {
    case null:
      return done({ kind: 'docx', text: read.text });
    case 'no-word':
      return rejected([issue.unsupportedKind(option)]);
    case 'too-large':
      return rejected([coreIssue.tooLarge(option, READ_LIMITS.documentBytes)]);
    case 'broken':
      return rejected([issue.unreadable(option, 'Word file')]);
  }
}

// Strict UTF-8, so a binary file is never read as text; a byte order mark is dropped.
function utf8(bytes: Buffer) {
  const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false });
  const decoded = trySync$(() => decoder.decode(bytes));
  return decoded.error === null ? decoded.data : null;
}

// A page whose first element is html, after an optional XML declaration and comments.
const HTML_START = /^\s*(?:<\?xml[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*<(?:!doctype\s+html|html)[\s>]/i;
