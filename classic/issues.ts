/**
 * The codes the classic look raises on adx, each declared once with its kind and hint.
 *
 * photoUnreadable: a stored photo that is neither a PNG nor a JPEG picture.
 *
 * `photo set` still runs on the old shell and raises its issues from issues.old.ts.
 *
 * @example return [issue.photoUnreadable.at(['cv', 'person', 'photo'])];
 */
import { code } from '@honeyglass/adx';

export const photoUnreadable = code(
  'PHOTO_UNREADABLE',
  'fix',
  'Use a PNG or JPEG file, for example with "oriko photo set <file>"',
);
