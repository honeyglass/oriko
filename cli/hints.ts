/**
 * The commands that help with a refusal on adx and lie in another folder than its code.
 *
 * hints: the command of every issue of NO_CV, UNKNOWN_CV and UNKNOWN_BLOCK, with hint().
 *
 * The three codes lie in core/, which imports no feature, and every feature raises them, while
 * their commands init, cvs and show lie in cv/, so they meet here (adx decision 73).
 *
 * @example tool({ ..., hints });
 */
import { hint } from '@honeyglass/adx';
import { noCv, unknownBlock, unknownCv } from '../core/issues.ts';
import { init } from '../cv/init.ts';
import { cvs } from '../cv/list.ts';
import { show } from '../cv/show.ts';

export const hints = [
  // Without a CV, the first thing to do is to create one.
  hint(noCv, () => init.step()),
  // The list names the CVs a profile may belong to.
  hint(unknownCv, () => cvs.step()),
  // The ids of the CV the refused call worked on. A profile that is not stored yet, as in
  // profile set with a new name, stays out: the source of --profile in show does not list it
  // (adx decision 79).
  hint(unknownBlock, () => show.step().carry('cv', 'profile').lists('block')),
];
