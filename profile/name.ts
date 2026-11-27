/**
 * The name of a profile, checked before any path is built from it.
 *
 * profileName: the name a call gives, or a refusal when it is no id.
 *
 * @example const name = profileName(request.name, 'profile set');
 */
import { done, rejected } from '../core/errors.ts';
import type { Result } from '../core/errors.ts';
import * as coreIssue from '../core/issues.old.ts';
import { Id } from '../core/cv.schema.ts';

// The name becomes a file name, so it passes the id pattern before any path is built from it.
// The shell refuses a call without --profile before it runs; the pattern refuses undefined too.
export function profileName(name: string | undefined, command: string): Result<string> {
  const parsed = Id.safeParse(name);
  if (parsed.success === false)
    return rejected(command, coreIssue.schemaIssues(parsed.error, ['profile'], command));
  return done(parsed.data);
}
