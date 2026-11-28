/**
 * The commands in a refusal and in the next steps, completed so each runs as it stands.
 *
 * withCommands: a refusal whose commands carry the --home of the call.
 * withNext: a success with the steps that follow it.
 * schemaCommand: the schema command for a command or shape, or the full schema.
 *
 * @example return { result: withCommands(call, withNext(call, result)), asText };
 */
import { Rejection, done } from '../core/errors.ts';
import type { Result } from '../core/errors.ts';
import { optionText } from '../core/options.old.ts';
import { nextSteps } from './next.old.ts';
import { isSchemaName } from './route.ts';
import type { Call, Fields } from './types.ts';

export const schemaCommand = (command: string) =>
  isSchemaName(command) ? `oriko schema ${command}` : 'oriko schema';

/**
 * Completes the commands of a refusal, so each one runs as it stands.
 *
 * @param call - the call that was refused
 * @param result - its answer
 * @returns the answer, every command given the --home of this call
 */
export function withCommands(call: Call, result: Result<Fields>): Result<Fields> {
  if (result.error === null) return result;
  const home = homeArg(call);
  const issues = result.error.issues.map(issue =>
    issue.command === undefined ? issue : { ...issue, command: `${issue.command}${home}` },
  );
  return { data: null, error: new Rejection(result.error.refusal, issues) };
}

// A success gets the steps that follow it, with this call's data folder in each command.
export function withNext(call: Call, result: Result<Fields>): Result<Fields> {
  if (result.error !== null) return result;
  const steps = nextSteps({ command: call.command, data: result.data });
  if (steps.length === 0) return result;
  const home = homeArg(call);
  const next = steps.map(step =>
    step.command === undefined ? step : { ...step, command: `${step.command}${home}` },
  );
  return done({ ...result.data, next });
}

const homeArg = (call: Call) =>
  call.values.home === undefined ? '' : optionText('home', call.values.home);
