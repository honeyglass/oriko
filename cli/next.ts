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
import { build } from './build.ts';

export const next = [after(photoSet, (_, { cv, profile }) => [build.step({ cv, profile })])];
