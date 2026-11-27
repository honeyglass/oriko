/**
 * The commands of edit/ on adx, by the words that call each: four groups of one feature.
 *
 * commands: the groups block, item, cv and contact, which the tool spreads into its table.
 *
 * @example tool({ ..., commands: { plan, ...edit } });
 */
import * as block from './block.ts';
import * as contact from './contact.ts';
import * as cv from './cv.ts';
import * as item from './item.ts';

export const commands = {
  block: { add: block.add, update: block.update, remove: block.remove, move: block.move },
  item: { add: item.add, update: item.update, remove: item.remove, move: item.move },
  cv: { update: cv.update },
  contact: {
    add: contact.add,
    update: contact.update,
    remove: contact.remove,
    move: contact.move,
  },
};
