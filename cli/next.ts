/**
 * The steps on adx that lead from one folder into another, where the features meet.
 *
 * next: the steps the tool adds after a command of a feature, with after().
 *
 * A feature imports no other feature, and plan and build live in cli/, so the next steps of a
 * feature that name them stand here.
 *
 * @example tool({ ..., next });
 */
import { after, schema } from '@honeyglass/adx';
import { set as photoSet } from '../classic/photo.ts';
import { init } from '../cv/init.ts';
import { cvs } from '../cv/list.ts';
import { commands as edit } from '../edit/commands.ts';
import { profiles } from '../profile/list.ts';
import { set as profileSet } from '../profile/set.ts';
import { show as profileShow } from '../profile/show.ts';
import { build, preview } from './build.ts';
import { plan } from './plan.ts';

// The one step after every edit: a CV that still fits its pages is ready to draw and to build.
const fitted = (out: { fits: boolean }, { cv }: { cv?: string | undefined }) =>
  out.fits ? [preview.step({ cv }), build.step({ cv })] : [];

export const next = [
  after(cvs, () => [profiles.step()]),
  // A new CV is empty and names the placeholder photo.
  after(init, (_, { cv }) => [
    edit.contact.add.step({ cv }),
    edit.block.add.step({ cv }),
    photoSet.step({ cv }),
  ]),
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
  // Without a profile, the shape of one comes first.
  after(profiles, out =>
    out.items.length === 0 ? [schema.step('profile')] : [plan.step().needs('profile')],
  ),
  after(profileSet, (out, { profile }) =>
    out.fits ? [preview.step({ profile }), build.step({ profile })] : [],
  ),
  // A posting without a profile leads to storing one, which names its fields.
  after(profileShow, out =>
    out.profile === null
      ? [profileSet.step({ profile: out.name }).needs('cv', 'blocks')]
      : [plan.step({ profile: out.name })],
  ),
];
