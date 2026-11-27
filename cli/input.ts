/**
 * The JSON input of a command, from --json or from stdin.
 *
 * payload: the parsed input, refused when it is missing, too large, or no valid JSON.
 *
 * @example const input = await payload(call, 'init');
 */
import { trySync$ } from '@honeyglass/utils/ts';
import { done, rejected } from '../core/errors.ts';
import type { Result } from '../core/errors.ts';
import * as issue from './issues.old.ts';
import * as coreIssue from '../core/issues.old.ts';
import { FILE_LIMITS } from '../core/files.limits.ts';
import { schemaCommand } from './complete.ts';
import type { Call } from './types.ts';

export async function payload(call: Call, command: string): Promise<Result<unknown>> {
  const raw = call.values.json ?? (await call.io.stdin());
  const isEmpty = raw === null || raw.trim() === '';
  if (isEmpty) return rejected(command, [issue.missingInput(schemaCommand(command))]);
  if (Buffer.byteLength(raw) > FILE_LIMITS.inputBytes)
    return rejected(command, [coreIssue.tooLarge('json')]);
  const value = trySync$((): unknown => JSON.parse(raw));
  if (value.error !== null)
    return rejected(command, [coreIssue.invalidJson('The input')], value.error);
  return done(value.data);
}
