/**
 * The PDF of a .docx, set by LibreOffice, so a CV leaves oriko without a detour through Google Docs.
 *
 * toPdf: the PDF of a .docx, or the issue when LibreOffice is missing or fails.
 * libreOffice: the one place that finds the program, so a test can stand in for it.
 * sofficePaths: where LibreOffice keeps its program on this system; install.sh imports it.
 *
 * LibreOffice runs outside adx, with a temporary folder of its own. It gets the fonts in
 * assets/fonts, the versions Google Docs uses, so the PDF matches the one Google Docs makes;
 * render() writes the .docx for LibreOffice's way of setting it.
 *
 * Inspired by libreoffice-convert (MIT, Copyright (c) 2020 René Rössler,
 * https://github.com/elwerene/libreoffice-convert), rewritten with promises and without its packages.
 *
 * @example const pdf = await toPdf(docx);
 */
import { execFile } from 'node:child_process';
import { constants } from 'node:fs';
import { access, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { $try, causeText } from '@honeyglass/utils/ts';
import type { Issues } from '../core/issues.ts';
import * as issue from './issues.ts';
import { PDF_LIMITS } from './limits.ts';

const run = promisify(execFile);

/**
 * The file the call asks for is a PDF, so both issues stand at `out`.
 *
 * @param docx - the Word file
 * @returns the PDF; NOT_INSTALLED or CONVERSION_FAILED, both of kind ask
 */
export async function toPdf(docx: Uint8Array): Promise<Uint8Array | Issues<'out'>> {
  const soffice = await libreOffice.program();
  if (soffice === undefined) return [issue.notInstalled.at('out', INSTALL_COMMANDS)];
  const folder = await mkdtemp(join(tmpdir(), 'oriko-pdf-'));
  const pdf = await $try(converted(soffice, folder, docx));
  await rm(folder, { recursive: true, force: true });
  if (pdf.error !== null)
    return [issue.conversionFailed.at('out', `LibreOffice wrote no PDF: ${causeText(pdf.error)}`)];
  return pdf.data;
}

const INSTALL_COMMANDS =
  'A PDF needs LibreOffice, and it is not installed: on macOS brew install --cask libreoffice, ' +
  'on Debian or Ubuntu sudo apt install libreoffice, on Windows winget install ' +
  'TheDocumentFoundation.LibreOffice, or from https://www.libreoffice.org/download';

/** The program is found through this object, so a test replaces `program` in its own process. */
export const libreOffice = {
  /** @returns the first path of sofficePaths() that runs, or undefined */
  program: () => firstInstalled(sofficePaths()),
};

async function firstInstalled(candidates: string[]) {
  for (const path of candidates) {
    const found = await $try(access(path, constants.X_OK));
    if (found.error === null) return path;
  }
  return undefined;
}

// A profile of its own, so a LibreOffice the person has open neither blocks the run nor sees it.
async function converted(soffice: string, folder: string, docx: Uint8Array) {
  const source = join(folder, 'cv.docx');
  await writeFile(source, docx);
  const profile = `-env:UserInstallation=${pathToFileURL(join(folder, 'profile')).href}`;
  const args = [profile, '--headless', '--convert-to', 'pdf', '--outdir', folder, source];
  const env = await fontEnv(soffice, folder);
  await run(soffice, args, { timeout: PDF_LIMITS.pdfSeconds * 1000, env });
  return readFile(join(folder, 'cv.pdf'));
}

// Without a window, LibreOffice finds fonts through fontconfig; on macOS through a copy that knows
// only LibreOffice's own fonts. The file names oriko's fonts first, then LibreOffice's and the
// system's, and leaves out the folders a person installs fonts into: another version of Open Sans
// or Fira Code sets other line breaks. Windows has no fontconfig.
async function fontEnv(soffice: string, folder: string) {
  if (process.platform === 'win32') return process.env;
  const config = join(folder, 'fonts.conf');
  await writeFile(config, fontConfig(await fontFolders(soffice), join(folder, 'fontcache')));
  return { ...process.env, FONTCONFIG_FILE: config };
}

const FONTS = join(import.meta.dirname, '..', 'assets', 'fonts');

// LibreOffice keeps its fonts beside its program: in the app bundle on macOS, in share elsewhere.
async function fontFolders(soffice: string) {
  const program = dirname(await realpath(soffice));
  if (process.platform === 'darwin')
    return [FONTS, resolve(program, '..', 'Resources', 'fonts'), '/System/Library/Fonts'];
  return [FONTS, resolve(program, '..', 'share', 'fonts'), '/usr/share/fonts'];
}

// Google Docs sets the bullet mark, written in Segoe UI Symbol, in Quattrocento Sans. Calibri is
// not free: Oriko Heading is Carlito, which has its widths, with the baseline Google Docs gives it.
// LibreOffice swaps Calibri for Carlito on its own, so Carlito is hidden and leads there too.
const fontConfig = (folders: string[], cache: string) =>
  [
    '<?xml version="1.0"?>',
    '<fontconfig>',
    ...folders.map(folder => `  <dir>${xmlText(folder)}</dir>`),
    '  <alias binding="same"><family>Segoe UI Symbol</family>',
    '    <prefer><family>Quattrocento Sans</family></prefer></alias>',
    '  <selectfont><rejectfont><pattern><patelt name="family"><string>Carlito</string>',
    '    </patelt></pattern></rejectfont></selectfont>',
    ...['Calibri', 'Carlito'].map(
      family =>
        `  <alias binding="same"><family>${family}</family><prefer><family>Oriko Heading</family></prefer></alias>`,
    ),
    `  <cachedir>${xmlText(cache)}</cachedir>`,
    '</fontconfig>',
    '',
  ].join('\n');

const xmlText = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;');

/** @returns the places the LibreOffice installer of each system puts its program */
export function sofficePaths() {
  switch (process.platform) {
    case 'darwin':
      return ['/Applications/LibreOffice.app/Contents/MacOS/soffice'];
    case 'win32':
      return [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)']]
        .filter(folder => folder !== undefined)
        .map(folder => join(folder, 'LibreOffice', 'program', 'soffice.exe'));
    default:
      return [
        '/usr/bin/soffice',
        '/usr/bin/libreoffice',
        '/snap/bin/libreoffice',
        '/opt/libreoffice/program/soffice',
      ];
  }
}
