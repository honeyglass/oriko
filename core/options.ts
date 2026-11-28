/**
 * The fields `--cv` and `--profile` of the commands on adx, with the one text each has.
 *
 * cv, profile: the field schemas a command puts into its input.
 *
 * Both take any name, as a stored file may have it: the source of each field holds the names
 * that exist, and adx refuses every other value before a command runs.
 *
 * @example const input = z.object({ cv, profile });
 */
import { z } from 'zod';

export const cv = z
  .string()
  .optional()
  .describe(
    'the name of one CV; may be left out when the data folder holds one CV or the profile names it',
  );
export const profile = z
  .string()
  .optional()
  .describe('the name of one profile; it names its CV in its field cv');
