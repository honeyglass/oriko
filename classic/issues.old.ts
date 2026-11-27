/**
 * The issues of the classic look and its photo, each made by one function.
 *
 * photoUnreadable: a photo that is neither a PNG nor a JPEG picture.
 * missingPicture: a photo set without the picture to store.
 *
 * @example if (round.error !== null) return rejected('render', [issue.photoUnreadable()]);
 */
import type { Issue } from '../core/errors.ts';

export const photoUnreadable = () => ({
  code: 'PHOTO_UNREADABLE',
  path: 'person.photo',
  message: 'The photo is neither a PNG nor a JPEG picture',
  hint: 'Use a PNG or JPEG file, for example with "oriko photo set <file>"',
});

export const missingPicture = (): Issue => ({
  code: 'MISSING_INPUT',
  path: 'file',
  message: 'The command names no picture',
  hint: 'Pass the path of a PNG or JPEG file: oriko photo set <file>',
});
