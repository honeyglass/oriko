/**
 * The refusal of oriko's own code: every issue it found, and the error that led to them.
 *
 * Issue: one thing wrong with the input, with its path and a hint that says how to fix it.
 * Rejection: the issues, and the error that led to the refusal, when another one did.
 * Result, done, rejected: the shape a function of the pure code answers in, with data or refused.
 *
 * The check and the page plan answer it, core/check.ts and core/place.ts, and so do the reads
 * oriko does itself, core/files.ts, read/web.ts and read/text.ts; core/issues.ts,
 * classic/images.ts and read/sources.ts turn each issue into one of adx, and hand adx a cause
 * they do not turn.
 *
 * @example if (issues.length > 0) return rejected(issues);
 */
export type Issue = { code: string; path: string; message: string; hint: string };

export type Rejection = { issues: Issue[]; cause?: unknown };

export type Result<Data> = { data: Data; error: null } | { data: null; error: Rejection };

export const done = <Data>(data: Data): Result<Data> => ({ data, error: null });

/**
 * @param issues - every issue found, so one answer shows them all
 * @param cause - the original error, when another one led to the refusal
 * @returns the refused result
 */
export const rejected = (issues: Issue[], cause?: unknown): { data: null; error: Rejection } => ({
  data: null,
  error: { issues, cause },
});
