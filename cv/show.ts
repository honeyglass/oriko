/**
 * The command show: the outline of one CV, or one of its blocks in full.
 *
 * showCv: the outline of the CV, or the one block named.
 * masterOf: the master file of a path, read and parsed.
 * outline: what a caller needs to pick a block, never its whole text.
 *
 * @example const answer = await showCv(home, 'erika', undefined, 'awards');
 */
import { done, rejected } from '../core/errors.ts';
import type { Result } from '../core/errors.ts';
import * as coreIssue from '../core/issues.old.ts';
import { COLUMN } from '../core/cv.limits.ts';
import { Master } from '../core/cv.schema.ts';
import type { Block } from '../core/cv.schema.ts';
import { readJson } from '../core/files.ts';
import { chosenCv } from '../core/home.old.ts';
import { profileCv } from '../core/load.old.ts';

type Fields = Record<string, unknown>;

/**
 * @param home - the data folder
 * @param cvName - the CV the caller names with --cv, if any
 * @param profileName - the profile the caller names, whose CV is shown, if any
 * @param id - the block to show in full; the outline when left out
 * @returns the CV's name, pages and outline, or the one block
 */
export async function showCv(
  home: string,
  cvName: string | undefined,
  profileName: string | undefined,
  id: string | undefined,
): Promise<Result<Fields>> {
  const cv = await chosenCv(home, cvName, await profileCv(home, profileName));
  if (cv.error !== null) return cv;
  const master = await masterOf(cv.data.path, 'show');
  if (master.error !== null) return master;
  const { blocks, pages } = master.data;
  if (id === undefined) return done({ cv: cv.data.name, pages, blocks: blocks.map(outline) });
  const block = blocks.find(candidate => candidate.id === id);
  if (block === undefined) return rejected('show', [coreIssue.unknownBlock(id, 'block')]);
  return done({ block });
}

export async function masterOf(path: string, step: string): Promise<Result<Master>> {
  const raw = await readJson(path, 'cv');
  if (raw.error !== null) return raw;
  const master = Master.safeParse(raw.data);
  if (master.success === false)
    return rejected(step, coreIssue.schemaIssues(master.error, [], 'master'));
  return done(master.data);
}

// What a caller needs to pick a block: never its whole text.
export const outline = (block: Block) => ({
  id: block.id,
  kind: block.kind,
  column: COLUMN[block.kind],
  section: block.section,
  title: block.title,
  page: block.page,
  hidden: block.hidden,
  items: block.kind === 'job' ? block.bullets.length : block.items.length,
});
