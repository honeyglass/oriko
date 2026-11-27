/**
 * The codes the classic look and its photo raise on adx, each declared once with its kind and hint.
 *
 * photoUnreadable: a picture or a stored photo that is neither a PNG nor a JPEG picture.
 * noPicture, pictureNotAFile, pictureTooLarge, pathRefused: a picture `photo set` cannot read.
 *
 * adx owns FILE_NOT_FOUND, NOT_A_FILE and INPUT_TOO_LARGE, and a tool that declares one does not
 * start, so the read of the picture names its own; each keeps the kind and the hint it had.
 *
 * @example return [issue.photoUnreadable.at(['cv', 'person', 'photo'])];
 */
import { code } from '@honeyglass/adx';
import { FILE_LIMITS } from '../core/files.limits.ts';

export const photoUnreadable = code(
  'PHOTO_UNREADABLE',
  'fix',
  'Use a PNG or JPEG file, for example with "oriko photo set --file <file>"',
);

export const noPicture = code(
  'NO_PICTURE',
  'fix',
  'Check the path, or pass the full path of the file',
);
export const pictureNotAFile = code(
  'PICTURE_NOT_A_FILE',
  'fix',
  'Pass the path of a file, not of a folder',
);
export const pictureTooLarge = code(
  'PICTURE_TOO_LARGE',
  'fix',
  `Send at most ${FILE_LIMITS.photoBytes} bytes; a CV is a few thousand, a photo a few million`,
);
export const pathRefused = code(
  'PATH_REFUSED',
  'fix',
  'Check the path and that you may read and write there',
);
