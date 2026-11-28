/**
 * The routing of a checked call to its command, and the thin adapters of the commands.
 *
 * dispatched: the answer of the command a call names.
 *
 * @example const result = await dispatched(call);
 */
import { RefusalError } from '@honeyglass/utils/ts';
import { done } from '../core/errors.ts';
import type { Result } from '../core/errors.ts';
import { cvNames, profileNames } from '../core/home.old.ts';
import { actionsOf } from './route.ts';
import { schema } from './describe.ts';
import type { Call, Fields } from './types.ts';

export async function dispatched(call: Call): Promise<Result<Fields>> {
  switch (call.command) {
    case undefined:
      return unrouted(call);
    case 'schema':
      return schema(call.rest.join(' '));
    // Every other command runs on adx: cli/interim.ts never sends one here, so a call that
    // reaches this line is a bug of the routing.
    default:
      throw new RefusalError({
        kind: 'bug',
        step: 'oriko',
        reason: `the command ${call.command} runs on adx, and the old shell has no case for it`,
        next: 'stop and tell the person; the maintainer of oriko fixes cli/interim.ts',
        state: 'Nothing was written.',
      });
  }
}

// A call without a command, which commandIssues let through: the start, or a group alone.
async function unrouted(call: Call): Promise<Result<Fields>> {
  const [group] = call.rest;
  if (group === undefined) return start(call);
  return done({ command: group, values: actionsOf(group) });
}

// Where a caller stands: the data folder with its CVs and profiles, empty lists when it has none.
async function start(call: Call): Promise<Result<Fields>> {
  return done({
    home: call.home,
    cvs: await cvNames(call.home),
    profiles: await profileNames(call.home),
  });
}
