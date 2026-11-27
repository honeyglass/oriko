/**
 * The one error of this package: a refusal that lists every issue of the input.
 *
 * Issue: one thing wrong with the input, with its path and a hint that says how to fix it; a
 * command, when there is one, answers the values that fix it, and the hint says to run it.
 * Rejection: the refusal error that carries the issues.
 * Result: the shape every public function answers in.
 * done, rejected: a result with data, and a result refused for its issues.
 *
 * @example if (issues.length > 0) return rejected('check', issues);
 */
import { RefusalError } from '@honeyglass/utils/ts';
import type { Refusal } from '@honeyglass/utils/ts';

export type Issue = { code: string; path: string; message: string; hint: string; command?: string };

export class Rejection extends RefusalError {
  readonly refusal: Refusal;
  readonly issues: Issue[];

  constructor(refusal: Refusal, issues: Issue[]) {
    super(refusal);
    this.refusal = refusal;
    this.issues = issues;
  }
}

export type Result<Data> = { data: Data; error: null } | { data: null; error: Rejection };

export const done = <Data>(data: Data): Result<Data> => ({ data, error: null });

/** The codes of an issue only the person can solve, such as a full disk; they make a refusal `ask`. */
export const SYSTEM_REFUSED = 'SYSTEM_REFUSED';
const PERSON = new Set([SYSTEM_REFUSED]);

/** The codes of an issue a later call may not meet, such as a failed connection; they make it `retry`. */
export const NETWORK_FAILED = 'NETWORK_FAILED';
export const SERVER_BUSY = 'SERVER_BUSY';
const LATER = new Set([NETWORK_FAILED, SERVER_BUSY]);

// The person comes first, then a later call; every other issue the caller fixes now.
function kindOf(issues: Issue[]) {
  if (issues.some(issue => PERSON.has(issue.code))) return 'ask';
  return issues.some(issue => LATER.has(issue.code)) ? 'retry' : 'fix';
}

const NEXT = {
  fix: 'fix every listed issue and call again',
  retry: 'call again in a minute; after three tries, tell the person',
  ask: 'stop, tell the person every listed issue, and call again once they solved it',
} as const;

/**
 * A result refused as `fix`, so the caller corrects its input and calls again; as `ask` when an
 * issue is one only the person can solve, and as `retry` when a later call may succeed.
 *
 * @param step - where it failed, in lowercase words, such as 'block move'
 * @param issues - every issue found, so one call shows them all
 * @param cause - the original error, when another one led to the refusal
 * @param state - what the failure left; nothing written unless a caller says otherwise
 * @returns the refused result
 */
export const rejected = (
  step: string,
  issues: Issue[],
  cause?: unknown,
  state = 'Nothing was written.',
): { data: null; error: Rejection } => {
  const kind = kindOf(issues);
  const refusal: Refusal = {
    kind,
    step,
    reason: `the input has ${issues.length} issue(s)`,
    next: NEXT[kind],
    state,
    cause,
  };
  return { data: null, error: new Rejection(refusal, issues) };
};
