/**
 * The codes of a PDF build, each declared once with its kind and hint.
 *
 * notInstalled, conversionFailed: LibreOffice missing, or failing on the .docx.
 *
 * Both are for the person to solve, so both are of kind ask. CONVERSION_FAILED has a name of its
 * own, since adx owns SYSTEM_REFUSED. A code has one hint, so the install commands of each system
 * stand in the message of NOT_INSTALLED.
 *
 * @example if (soffice === undefined) return [issue.notInstalled.at('out', INSTALL_COMMANDS)];
 */
import { code } from '@honeyglass/adx';

export const notInstalled = code(
  'NOT_INSTALLED',
  'ask',
  'Ask the person to install LibreOffice, then call again; without it, build a .docx and save it as PDF in Google Docs',
);
export const conversionFailed = code(
  'CONVERSION_FAILED',
  'ask',
  'Tell the person what LibreOffice answered; a .docx saved as PDF in Google Docs works without it',
);
