/**
 * The codes the edit commands raise on adx, each declared once with its kind and hint.
 *
 * nothingToDo, bothAnchors, otherColumn: a block move that names no place, or a wrong anchor.
 * outOfRange: an index past the end of a list.
 *
 * A code of adx has one hint, so where the hint named the column or the places of a list, the
 * message names them now.
 *
 * @example return issue.bothAnchors.at('after', 'The input names two anchors');
 */
import { code } from '@honeyglass/adx';

export const nothingToDo = code(
  'NOTHING_TO_DO',
  'fix',
  'Send at least one of "before", "after" or "page"',
);
export const bothAnchors = code('BOTH_ANCHORS', 'fix', 'Send "before" or "after", not both');
export const otherColumn = code(
  'OTHER_COLUMN',
  'fix',
  'Use an anchor of the column the block stands in, one the message lists',
);

export const outOfRange = code(
  'INDEX_OUT_OF_RANGE',
  'fix',
  'Use a place the message names; to an empty list, add an item first',
);
