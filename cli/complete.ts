/**
 * The commands in a refusal and in the next steps, completed so each runs as it stands.
 *
 * withCommands: a refusal whose commands carry the --home of the call and the CV of a block list.
 * withNext: a success with the steps that follow it; after a dry run, the call itself.
 * schemaCommand: the schema command for a command or shape, or the full schema.
 *
 * @example return { result: await withCommands(call, withNext(call, result)), asText };
 */
import { trySync$ } from '@honeyglass/utils/ts';
import { z } from 'zod';
import { Rejection, done } from '../core/errors.ts';
import type { Issue, Result } from '../core/errors.ts';
import * as coreIssue from '../core/issues.old.ts';
import { isDashed, optionText, optionsText, shellWord } from '../core/options.old.ts';
import { chosenCv } from '../core/home.old.ts';
import { nextSteps } from './next.old.ts';
import { profileCv } from '../core/load.old.ts';
import { COMMANDS } from './commands.ts';
import type { Command, CommandName } from './commands.ts';
import { isSchemaName } from './route.ts';
import type { Call, Fields } from './types.ts';

export const schemaCommand = (command: string) =>
  isSchemaName(command) ? `oriko schema ${command}` : 'oriko schema';

/**
 * Completes the commands of a refusal, so each one runs as it stands.
 *
 * @param call - the call that was refused
 * @param result - its answer
 * @returns the answer, an unknown block given the command for the ids of this call's CV, and every
 *   command given the --home of this call
 */
export async function withCommands(call: Call, result: Result<Fields>): Promise<Result<Fields>> {
  if (result.error === null) return result;
  const blockCommand = await blockListCommand(call, result.error.issues);
  const home = homeArg(call);
  const issues = result.error.issues.map(issue => {
    const command =
      issue.code === coreIssue.UNKNOWN_BLOCK ? (issue.command ?? blockCommand) : issue.command;
    return command === undefined ? issue : { ...issue, command: `${command}${home}` };
  });
  return { data: null, error: new Rejection(result.error.refusal, issues) };
}

// A success gets the steps that follow it, with this call's CV and data folder in each command.
export function withNext(call: Call, result: Result<Fields>): Result<Fields> {
  if (result.error !== null) return result;
  const steps = nextSteps({
    command: call.command,
    selector: selectorOf(call),
    data: result.data,
    isDryRun: call.values['dry-run'] === true,
    repeated: repeatedArgs(call),
    isPiped: call.values.json === undefined && takesInput(call.command),
  });
  if (steps.length === 0) return result;
  const home = homeArg(call);
  const next = steps.map(step =>
    step.command === undefined ? step : { ...step, command: `${step.command}${home}` },
  );
  return done({ ...result.data, next });
}

// Every selector of the call, never a pick: a profile without a CV needs the --cv beside it.
function selectorOf(call: Call) {
  const { profile, cv } = call.values;
  const ofProfile = profile === undefined ? '' : optionText('profile', profile);
  return cv === undefined ? ofProfile : `${ofProfile}${optionText('cv', cv)}`;
}

// The options and words of the call, less --dry-run and the --home every command gets anyway.
function repeatedArgs(call: Call) {
  const options = optionsText({ ...call.values, 'dry-run': undefined, home: undefined });
  const separator = call.rest.some(isDashed) ? ' --' : '';
  return `${options}${separator}${call.rest.map(word => ` ${shellWord(word)}`).join('')}`;
}

function takesInput(name: CommandName | undefined) {
  if (name === undefined) return false;
  const command: Command = COMMANDS[name];
  return command.input !== undefined;
}

const homeArg = (call: Call) =>
  call.values.home === undefined ? '' : optionText('home', call.values.home);

async function blockListCommand(call: Call, issues: Issue[]) {
  if (issues.some(issue => issue.code === coreIssue.UNKNOWN_BLOCK) === false) return undefined;
  const named = (await inputCv(call)) ?? (await profileCv(call.home, call.values.profile));
  const cv = await chosenCv(call.home, call.values.cv, named);
  return cv.error === null ? `oriko show${optionText('cv', cv.data.name)} --block` : undefined;
}

const Named = z.object({ cv: z.string() });

// The CV the JSON input names, such as a profile's; it is the one the command checked.
async function inputCv(call: Call) {
  if (takesInput(call.command) === false) return undefined;
  const raw = call.values.json ?? (await call.io.stdin()) ?? '';
  const parsed = trySync$((): unknown => JSON.parse(raw));
  const input = Named.safeParse(parsed.data);
  return input.success ? input.data.cv : undefined;
}
