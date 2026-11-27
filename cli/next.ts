/**
 * The steps on adx that lead from one folder into another, where the features meet.
 *
 * next: the steps the tool adds after a command of a feature, with after().
 *
 * A feature imports no other feature, and build lives in cli/, so the next steps of a feature
 * that name it stand here.
 *
 * @example tool({ ..., next });
 */
import { after } from '@honeyglass/adx';
import { set as photoSet } from '../classic/photo.ts';
import { commands as edit } from '../edit/commands.ts';
import { build, preview } from './build.ts';

// The one step after every edit: a CV that still fits its pages is ready to draw and to build.
const fitted = (out: { fits: boolean }, { cv }: { cv?: string | undefined }) =>
  out.fits ? [preview.step({ cv }), build.step({ cv })] : [];

export const next = [
  after(photoSet, (_, { cv, profile }) => [build.step({ cv, profile })]),
  after(
    [
      edit.block.add,
      edit.block.update,
      edit.block.remove,
      edit.block.move,
      edit.item.add,
      edit.item.update,
      edit.item.remove,
      edit.item.move,
      edit.cv.update,
      edit.contact.add,
      edit.contact.update,
      edit.contact.remove,
      edit.contact.move,
    ],
    fitted,
  ),
];
