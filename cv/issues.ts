/**
 * The code the CV commands raise on adx, declared once with its kind and hint.
 *
 * cvExists: an init with the name of a CV the data folder already holds.
 *
 * @example return refuse(issue.cvExists.at('cv', `The data folder already holds a CV ${shown(cv)}`));
 */
import { code } from '@honeyglass/adx';

export const cvExists = code(
  'CV_EXISTS',
  'fix',
  'Choose another name, or change that CV with cv update and the block commands',
);
