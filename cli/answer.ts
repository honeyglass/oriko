/**
 * The answer of one call as JSON for a program, or as text for a person.
 *
 * json: the answer as one line of JSON, a refusal with its issues.
 * text: the answer as text, at a terminal with its next steps below it.
 *
 * @example io.write(asText ? text(result, io.isTTY) : json(result));
 */
import { refusal, shown } from '@honeyglass/utils/ts';
import type { Rejection, Result } from '../core/errors.ts';
import type { Step } from './next.old.ts';
import type { Fields } from './types.ts';

export const json = (result: Result<Fields>) =>
  `${JSON.stringify(result.error === null ? { ok: true, ...result.data } : refused(result.error))}\n`;

function refused(error: Rejection) {
  const { kind, step, reason, next, state } = error.refusal;
  return { ok: false, kind, step, reason, next, state, issues: error.issues };
}

// Text for a person: the answer, and at a terminal its next steps below it. Piped text stays bare.
export function text(result: Result<Fields>, isTTY: boolean) {
  if (result.error === null) {
    const { next, ...data } = result.data;
    const body =
      typeof data.preview === 'string' ? data.preview : `${JSON.stringify(data, null, 2)}\n`;
    const lines = isTTY && Array.isArray(next) ? next.filter(isStep).map(nextLine) : [];
    return lines.length === 0 ? body : `${body}${lines.join('\n')}\n`;
  }
  const issues = result.error.issues.map(
    issue =>
      `- ${issue.code} at ${shown(issue.path)}: ${shown(issue.message)}. ${issue.hint}.` +
      (issue.command === undefined ? '' : ` Command: ${issue.command}`),
  );
  return `${[refusal(result.error.refusal), ...issues].join('\n')}\n`;
}

const isStep = (value: unknown): value is Step =>
  typeof value === 'object' && value !== null && 'does' in value;

function nextLine(step: Step) {
  if (step.command === undefined) return `Next: ${step.does}`;
  const needs = step.needs?.map(need => (need === 'file' ? '<file>' : `--${need}`)).join(', ');
  return needs === undefined ? `Next: ${step.command}` : `Next: ${step.command} (needs ${needs})`;
}
