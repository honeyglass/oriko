/**
 * The edit commands as the cli runs them: one edit applied to the stored CV, then written back.
 *
 * saveEdit: applies one edit to the CV, writes it, and says whether it still fits its pages.
 *
 * @example const answer = await saveEdit({ home, cv: 'erika', command: 'block move', input, isDryRun: true });
 */
import { done } from '../core/errors.ts';
import type { Result } from '../core/errors.ts';
import { check } from '../core/check.ts';
import type { Master } from '../core/cv.schema.ts';
import { place } from '../core/place.old.ts';
import { readJson, writeAll } from '../core/files.ts';
import { chosenCv } from '../core/home.old.ts';
import { apply } from './apply.ts';

type Fields = Record<string, unknown>;
type Request = {
  home: string;
  cv: string | undefined;
  command: string;
  input: unknown;
  isDryRun: boolean;
};

/**
 * @param request - the data folder, the CV's name, the command, its parsed input, and whether to write
 * @returns the command, whether it wrote the CV, and whether the CV still fits its pages
 */
export async function saveEdit(request: Request): Promise<Result<Fields>> {
  const { command, isDryRun } = request;
  const cv = await chosenCv(request.home, request.cv);
  if (cv.error !== null) return cv;
  const master = await readJson(cv.data.path, 'cv');
  if (master.error !== null) return master;
  const edited = apply(master.data, command, request.input);
  if (edited.error !== null) return edited;
  const content = `${JSON.stringify(edited.data, null, 2)}\n`;
  const files = [{ path: cv.data.path, content }];
  const written = isDryRun ? done(undefined) : await writeAll(files, 'home');
  if (written.error !== null) return written;
  return done({ command, written: isDryRun === false, ...fit(edited.data) });
}

// An edit may make the CV too long. The edit still stands; the answer says so, so the caller can act.
function fit(master: Master) {
  const cv = check(master);
  const placed = cv.error === null ? place(cv.data) : cv;
  return { fits: placed.error === null, layout: placed.error?.issues ?? [] };
}
