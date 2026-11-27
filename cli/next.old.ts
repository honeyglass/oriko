/**
 * The next steps after a successful answer, so a person or an agent always sees where to go on.
 *
 * nextSteps: the steps that follow one answer, from the call and the facts of the answer.
 * Step: one step; its command runs as it stands, unless it names what it still needs.
 *
 * The cli only names a step and never follows one. A step without a command is for the person.
 *
 * @example const next = nextSteps({ command: 'plan', selector: ' --profile go-e', data, isDryRun });
 */
import { optionText } from '../core/options.old.ts';
import { COMMANDS } from './commands.ts';
import type { CommandName } from './commands.ts';

export type Step = { does: string; command?: string; needs?: string[] };

type Facts = {
  command: CommandName | undefined;
  /** The --cv or --profile of the call, so a step works on the same CV. */
  selector: string;
  data: Record<string, unknown>;
  isDryRun: boolean;
  /** The options and words of the call without --dry-run, so the step after a dry run repeats it. */
  repeated: string;
  /** The input came through stdin, which a repeated call does not hold. */
  isPiped: boolean;
};

const UPLOAD: Step = {
  does: 'upload the .docx to Google Docs, then choose File, Download, PDF; or build a .pdf with LibreOffice',
};

/**
 * @param facts - the command of the call, its --cv or --profile, its answer, and --dry-run
 * @returns 0 to 3 steps, the main path first; none when nothing follows
 */
export function nextSteps(facts: Facts): Step[] {
  const { data, selector } = facts;
  if ('option' in data) return [];
  if (facts.isDryRun) return data.written === false ? again(facts) : [];
  switch (facts.command) {
    case undefined:
      return Array.isArray(data.cvs) ? startSteps(data) : [];
    case 'cvs':
      return cvsSteps(data.cvs);
    case 'profiles':
      return count(data.profiles) > 0
        ? [step('plan', '', ['profile'])]
        : [step('schema', ' profile')];
    case 'show':
      return data.block === undefined ? [step('show', selector, ['block'])] : [];
    case 'init':
      return [
        step('contact add', selector, ['json']),
        step('block add', selector, ['json']),
        step('photo set', selector, ['file']),
      ];
    case 'plan':
      return [step('preview', selector), step('build', selector, ['out'])];
    case 'preview':
    case 'photo set':
      return [step('build', selector, ['out'])];
    case 'build':
      return isDocxWritten(data) ? [UPLOAD] : [];
    case 'schema':
      return [];
    case 'read':
      return readSteps(data);
    case 'profile show':
      return data.profile === null
        ? [step('profile set', selector, ['json'])]
        : [step('plan', selector)];
    default:
      return data.fits === true
        ? [step('preview', selector), step('build', selector, ['out'])]
        : [];
  }
}

// The call itself without --dry-run; a piped input is not part of it, so the step needs it.
function again({ command, repeated, isPiped }: Facts): Step[] {
  // Only a named command takes --dry-run; a call without one is refused before it runs.
  if (command === undefined) return [];
  const base = {
    does: 'repeat the call without --dry-run to write',
    command: `oriko ${command}${repeated}`,
  };
  return [isPiped ? { ...base, needs: ['json'] } : base];
}

const step = (name: CommandName, args = '', needs?: string[]): Step => {
  const command: { does: string } = COMMANDS[name];
  const base = { does: command.does, command: `oriko ${name}${args}` };
  return needs === undefined ? base : { ...base, needs };
};

// Where to start depends on what the data folder holds: no CV, CVs only, or CVs and profiles.
function startSteps(data: Record<string, unknown>): Step[] {
  if (count(data.cvs) === 0)
    return [step('read', '', ['resume']), step('init', '', ['cv', 'json'])];
  const posting = step('read', '', ['posting', 'profile']);
  if (count(data.profiles) === 0) return [step('cvs'), posting];
  return [step('profiles'), posting];
}

// A posting leads to storing its profile, notes to the CV they belong to, an old CV to a new one.
function readSteps(data: Record<string, unknown>): Step[] {
  const roles = Array.isArray(data.read) ? data.read.map(roleOf) : [];
  const steps: Step[] = [];
  if (roles.includes('posting') && typeof data.profile === 'string')
    steps.push(
      step('schema', ' profile'),
      step('profile set', optionText('profile', data.profile), ['json']),
    );
  if (roles.includes('notes') && typeof data.cv === 'string')
    steps.push(step('show', optionText('cv', data.cv)));
  if (steps.length > 0) return steps;
  return [step('init', '', ['cv', 'json']), step('schema', ' init')];
}

const roleOf = (entry: unknown) =>
  typeof entry === 'object' && entry !== null && 'role' in entry ? entry.role : undefined;

// With one CV the step names it; with several the caller picks one.
function cvsSteps(cvs: unknown): Step[] {
  const only = Array.isArray(cvs) && cvs.length === 1 ? nameOf(cvs[0]) : undefined;
  const show = only === undefined ? step('show', '', ['cv']) : step('show', optionText('cv', only));
  return [show, step('profiles')];
}

// A PDF is the finished file; only a .docx still goes through Google Docs.
const isDocxWritten = (data: Record<string, unknown>) =>
  data.written === true && typeof data.out === 'string' && data.out.endsWith('.docx');

const count = (list: unknown) => (Array.isArray(list) ? list.length : 0);

const nameOf = (entry: unknown) =>
  typeof entry === 'object' && entry !== null && 'name' in entry && typeof entry.name === 'string'
    ? entry.name
    : undefined;
