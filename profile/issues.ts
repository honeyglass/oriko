/**
 * The code the profile commands raise on adx, declared once with its kind and hint.
 *
 * nothingToStore: a profile set that names no field of a profile, only its name.
 *
 * adx owns MISSING_INPUT, the code for a call without input, so this one has a name of oriko's.
 *
 * @example return [issue.nothingToStore.issue('The call names no field of the profile')];
 */
import { code } from '@honeyglass/adx';

export const nothingToStore = code(
  'NOTHING_TO_STORE',
  'fix',
  'Run the command for the input shape, then pass it with --json, or through stdin with --json -',
);
