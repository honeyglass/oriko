/**
 * The codes of the commands that live in cli/, each declared once with its kind and hint.
 *
 * wrongExtension, creditsNeedTerminal: an --out file that is no .docx or .pdf, and --credits
 * without the terminal look.
 *
 * The mistakes of a call itself, such as an unknown option or a look outside the list, are adx's
 * own codes and need no line here.
 *
 * @example issue.wrongExtension.at('out', `The output ${shown(out.rel)} is no .docx or .pdf file`)
 */
import { code } from '@honeyglass/adx';

export const wrongExtension = code(
  'WRONG_EXTENSION',
  'fix',
  'Use a file name that ends in .docx, or in .pdf when LibreOffice is installed',
);
export const creditsNeedTerminal = code(
  'CREDITS_NEED_TERMINAL',
  'fix',
  'Add --style terminal, or leave out --credits',
);
