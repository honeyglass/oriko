/**
 * The gate for a master file and a profile: nothing else in the package reads unchecked data.
 *
 * check: the CV to build, with the profile applied and the hidden blocks left out.
 *
 * @example const cv = check(JSON.parse(masterText), JSON.parse(profileText));
 */
import { done, rejected } from './errors.ts';
import type { Issue, Result } from './errors.ts';
import * as issue from './issues.old.ts';
import { COLUMN } from './cv.limits.ts';
import { Block, Master, PATCH, Profile } from './cv.schema.ts';

type Rated = Extract<Block, { kind: 'rated' }>;
type Entries = Extract<Block, { kind: 'entries' }>;

/**
 * Checks in layers: the shape first, then the profile, then the rules between blocks.
 *
 * @param master - the parsed master file
 * @param profile - the parsed profile of one job posting, or nothing
 * @returns the CV to build, or every issue of the first layer that failed
 */
export function check(master: unknown, profile?: unknown): Result<Master> {
  const parsed = Master.safeParse(master);
  if (parsed.success === false)
    return rejected('check', issue.schemaIssues(parsed.error, [], 'master'));
  const duplicates = duplicateIds(parsed.data.blocks);
  if (duplicates.length > 0) return rejected('check', duplicates);
  const resolved = applyProfile(parsed.data, profile);
  if (resolved.error !== null) return resolved;
  const lonely = untitledBesideSection(resolved.data.blocks);
  if (lonely.length > 0) return rejected('check', lonely);
  return resolved;
}

function duplicateIds(blocks: Block[]) {
  const seen = new Set<string>();
  const issues: Issue[] = [];
  for (const block of blocks) {
    if (seen.has(block.id)) issues.push(issue.duplicateId(block.id));
    seen.add(block.id);
  }
  return issues;
}

function applyProfile(master: Master, value: unknown): Result<Master> {
  if (value === undefined) return done(withoutHidden(master, master.blocks));
  const parsed = Profile.safeParse(value);
  if (parsed.success === false)
    return rejected('check', issue.schemaIssues(parsed.error, [], 'profile'));
  const profile = parsed.data;
  const issues = unknownIds(master, profile);
  const blocks = master.blocks.map(block => patched(block, profile.blocks?.[block.id], issues));
  issues.push(...changedFacts(master.blocks, blocks));
  const sorted = ordered(blocks, profile.order ?? []);
  if (jobsMoved(master.blocks, sorted)) issues.push(issue.jobMoved());
  if (issues.length > 0) return rejected('check', issues);
  const person = { ...master.person, ...profile.person };
  return done(withoutHidden({ ...master, person }, sorted));
}

function unknownIds(master: Master, profile: Profile) {
  const known = new Set(master.blocks.map(block => block.id));
  const issues: Issue[] = [];
  for (const id of Object.keys(profile.blocks ?? {})) {
    if (known.has(id) === false) issues.push(issue.unknownBlock(id, `blocks.${id}`));
  }
  for (const [index, id] of (profile.order ?? []).entries()) {
    if (known.has(id) === false) issues.push(issue.unknownBlock(id, `order.${index}`));
  }
  return issues;
}

/**
 * The facts of the master a profile changes: a profile may hide, drop, reorder, shorten and reword,
 * but never claim what the master does not.
 *
 * A job keeps its dates, employer, title and place; its bullets stay free. A list, a rated block and
 * an entries block keep only items of the master, and a level never rises above the master's.
 *
 * @param master - the blocks of the master file
 * @param blocks - the same blocks with the profile laid over them, in the same order
 * @returns one issue per block with a changed fact, and one per changed field of a job
 */
function changedFacts(master: Block[], blocks: Block[]) {
  return master.flatMap((block, index) => blockFacts(block, blocks[index]));
}

/** The fields of a job that state a fact, unlike its bullets, which a profile may reword. */
const JOB_FACTS = ['from', 'to', 'employer', 'title', 'place'] as const;

function blockFacts(block: Block, result: Block | undefined): Issue[] {
  if (block.kind === 'job' && result?.kind === 'job')
    return JOB_FACTS.filter(field => result[field] !== block[field]).map(field =>
      issue.factChanged(block.id, field),
    );
  if (block.kind === 'list' && result?.kind === 'list')
    return added(
      block.id,
      result.items.filter(item => block.items.includes(item) === false),
    );
  if (block.kind === 'rated' && result?.kind === 'rated') return ratedFacts(block, result);
  if (block.kind === 'entries' && result?.kind === 'entries')
    return added(
      block.id,
      result.items.filter(item => knownEntry(block, item) === false).map(item => item.title),
    );
  return [];
}

// An entry keeps its note whole, since the note of an award or a course is often its date.
function knownEntry(block: Entries, item: Entries['items'][number]) {
  return block.items.some(known => known.title === item.title && known.note === item.note);
}

function ratedFacts(block: Rated, result: Rated) {
  const levels = new Map(block.items.map(item => [item.name, item.level]));
  const unknown = result.items.filter(item => levels.has(item.name) === false);
  const raised = result.items.filter(item => item.level > (levels.get(item.name) ?? item.level));
  return [
    ...added(
      block.id,
      unknown.map(item => item.name),
    ),
    ...(raised.length === 0
      ? []
      : [
          issue.levelRaised(
            block.id,
            raised.map(item => item.name),
          ),
        ]),
  ];
}

const added = (id: string, items: string[]) =>
  items.length === 0 ? [] : [issue.itemsNotInMaster(id, items)];

// Jobs stand newest first in the master; a profile hides an old job, but never moves one.
function jobsMoved(master: Block[], blocks: Block[]) {
  return jobIds(master).join('\n') !== jobIds(blocks).join('\n');
}

const jobIds = (blocks: Block[]) =>
  blocks.filter(block => block.kind === 'job').map(block => block.id);

/**
 * A block with a patch laid over it; a null in the patch removes the field.
 *
 * @param block - the block of the master file
 * @param patch - the unchecked fields to replace, or nothing
 * @param issues - collects what is wrong with the patch
 * @returns the patched block, or the block as it was when the patch is refused
 */
export function patched(block: Block, patch: unknown, issues: Issue[]) {
  if (patch === undefined) return block;
  const fields = PATCH[block.kind].safeParse(patch);
  if (fields.success === false) {
    issues.push(...issue.schemaIssues(fields.error, ['blocks', block.id], 'block'));
    return block;
  }
  const kept = Object.entries({ ...block, ...fields.data }).filter(([, value]) => value !== null);
  const merged = Block.safeParse(Object.fromEntries(kept));
  if (merged.success) return merged.data;
  issues.push(...issue.schemaIssues(merged.error, ['blocks', block.id], 'block'));
  return block;
}

function ordered(blocks: Block[], order: string[]) {
  const first = order.flatMap(id => blocks.filter(block => block.id === id));
  return [...first, ...blocks.filter(block => order.includes(block.id) === false)];
}

const withoutHidden = (master: Master, blocks: Block[]): Master => ({
  ...master,
  blocks: blocks.filter(block => block.hidden !== true),
});

// A block without a title sits right below its section heading, so no second block fits beside it.
function untitledBesideSection(blocks: Block[]) {
  const right = blocks.filter(block => COLUMN[block.kind] === 'right');
  const issues: Issue[] = [];
  for (const [index, block] of right.entries()) {
    const neighbours = [right[index - 1], right[index + 1]];
    const shared = neighbours.some(neighbour => neighbour?.section === block.section);
    const isUntitled = block.kind !== 'job' && block.title === undefined;
    if (isUntitled && shared) issues.push(issue.untitledNotAlone(block.id));
  }
  return issues;
}
