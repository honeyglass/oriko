/**
 * The next steps after a successful answer, so a person or an agent always sees where to go on.
 *
 * nextSteps: the steps that follow one answer, from the call and the facts of the answer.
 * Step: one step; its command runs as it stands, unless it names what it still needs.
 *
 * The cli only names a step and never follows one. A step without a command is for the person.
 *
 * @example const next = nextSteps({ command: undefined, data });
 */
import { COMMANDS } from './commands.ts';
import type { CommandName } from './commands.ts';

export type Step = { does: string; command?: string; needs?: string[] };

type Facts = { command: CommandName | undefined; data: Record<string, unknown> };

/**
 * @param facts - the command of the call and its answer
 * @returns 0 to 2 steps, the main path first; none when nothing follows
 */
export function nextSteps(facts: Facts): Step[] {
  const { data } = facts;
  if ('option' in data) return [];
  // schema names no step, and every other command runs on adx, which names its own.
  if (facts.command !== undefined) return [];
  return Array.isArray(data.cvs) ? startSteps(data) : [];
}

const step = (name: CommandName, needs?: string[]): Step => {
  const command: { does: string } = COMMANDS[name];
  const base = { does: command.does, command: `oriko ${name}` };
  return needs === undefined ? base : { ...base, needs };
};

// Where to start depends on what the data folder holds: no CV, CVs only, or CVs and profiles.
function startSteps(data: Record<string, unknown>): Step[] {
  if (count(data.cvs) === 0) return [step('read', ['resume']), step('init', ['cv', 'json'])];
  const posting = step('read', ['posting', 'profile']);
  if (count(data.profiles) === 0) return [step('cvs'), posting];
  return [step('profiles'), posting];
}

const count = (list: unknown) => (Array.isArray(list) ? list.length : 0);
