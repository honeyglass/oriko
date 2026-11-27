/**
 * The command `oriko profile set` on adx: the profile of one job posting, checked, then stored.
 *
 * set: the command, which the tool lists under the words profile set.
 *
 * A profile is checked by the same check plan runs, before it is staged, so a refused profile is
 * never stored. It replaces the stored one whole, and only with --replace; the same profile again
 * writes nothing (adx decision 81). The answer names every part it adds, changes or removes, in
 * the profile's own words. The name and the fields fill one object, so `--profile` and `--json`
 * go together as before. A call that names no field is refused: piped text that no `--json -`
 * reads would else store an empty profile.
 *
 * @example const { exit, out } = await run(oriko, ['profile', 'set', '--profile', 'globex', '--cv', 'jane']);
 */
import { effect, fresh, schema } from '@honeyglass/adx';
import type { File, Issue } from '@honeyglass/adx';
import { trySync$ } from '@honeyglass/utils/ts';
import { z } from 'zod';
import { check } from '../core/check.ts';
import { Block, Id, Master, Profile } from '../core/cv.schema.ts';
import type { Issue as Found } from '../core/errors.ts';
import { FILE_LIMITS } from '../core/files.limits.ts';
import { home, isListed, profileFile, profileNames, targetIssue } from '../core/home.ts';
import { issueAt, oversized, turnedEach } from '../core/issues.ts';
import type { Stored } from '../core/issues.ts';
import { fileOf, storedCv } from '../core/load.ts';
import { fit } from '../core/place.ts';
import { cvChoices } from '../core/sources.ts';
import * as issue from './issues.ts';

export const set = effect({
  does: 'stores the profile of one job posting, checked against its CV',
  input: z.object({ profile: Id.describe('the name of the profile'), ...Profile.shape }),
  example: { profile: 'globex', cv: 'jane', blocks: { freelance: { hidden: true } } },
  values: { profile: fresh(profileNames), cv: cvChoices },
  check: input => [...oversized(input), ...(namesAField(input) ? [] : [nothingToStore()])],
  plan: async ({ profile: name, ...profile }, { files, refuse }) => {
    const cv = await storedCv(profile.cv);
    if (Array.isArray(cv)) return refuse(...cv);
    const checked = check(cv.master, profile);
    if (checked.error !== null) {
      const inFile = fileOf(cv.master, profile);
      return refuse(...turnedEach(checked.error, found => placed(inFile(found), found)));
    }
    const file = profileFile(name);
    const blocked = await targetIssue('profile', home, file);
    if (blocked !== undefined) return refuse(blocked);
    const stored = await storedText(file);
    const changes = changesOf(parsedOrEmpty(stored), profile);
    const written = files.write(file, textOf(profile, stored, changes));
    return { name, ...written, changes, cv: cv.name, ...fit(checked.data) };
  },
});

const FIELDS = Object.keys(Profile.shape);

const namesAField = (input: object) => FIELDS.some(field => field in input);

const nothingToStore = () =>
  issue.nothingToStore
    .issue('The call names no field of the profile, only its name')
    .command(schema.step('profile set'));

/** The fields of the input a profile's own issue stands at; `cv` names the CV, whose issues lie below it. */
const OWN = ['person', 'order', 'blocks'] as const;

/**
 * The profile is the input here, so an issue it causes stands at its own field, such as
 * `blocks.nobody`, and one that lies in the CV below `cv` (adx decision 69).
 *
 * @param file - the file the issue lies in, as fileOf() finds it
 * @param found - the issue of the check
 * @returns the issue with the same code and message; SCHEMA inside a patch names the shape block
 */
function placed(file: Stored, found: Found): Issue<'cv' | (typeof OWN)[number]> {
  const parts = found.path.split('.');
  const [first, ...rest] = parts;
  const own = OWN.find(field => field === first);
  if (file === 'profile' && own !== undefined) return issueAt([own, ...rest], found, Block);
  return issueAt(['cv', ...parts], found, Master);
}

// The text of the stored profile; a link that adx replaces holds none.
async function storedText(file: File) {
  return (await isListed(home, file)) ? file.text(FILE_LIMITS.readBytes) : undefined;
}

// The stored profile as a value; an unreadable one counts as empty, so every part counts as added.
function parsedOrEmpty(text: string | undefined) {
  if (text === undefined) return {};
  const value = trySync$((): unknown => JSON.parse(text));
  return value.error === null ? value.data : {};
}

/**
 * The input comes in the key order of its schema, so a profile stored before in another order
 * would differ in its bytes alone; the same content keeps the stored text, and adx writes nothing.
 *
 * @param profile - the profile of the call
 * @param stored - the text of the stored profile, if any
 * @param changes - what the profile adds, changes and removes against it
 * @returns the text to write
 */
function textOf(profile: Profile, stored: string | undefined, changes: Changes) {
  const isSame = changes.added.length + changes.changed.length + changes.removed.length === 0;
  return stored !== undefined && isSame ? stored : `${JSON.stringify(profile, null, 2)}\n`;
}

type Changes = ReturnType<typeof changesOf>;

// The parts of a profile: each top-level field, and each block or person field one level down.
function partsOf(profile: unknown) {
  const parts = new Map<string, string>();
  if (isRecord(profile) === false) return parts;
  for (const [key, value] of Object.entries(profile)) {
    const isNested = (key === 'blocks' || key === 'person') && isRecord(value);
    if (isNested === false) {
      parts.set(key, JSON.stringify(value));
      continue;
    }
    for (const [inner, part] of Object.entries(value))
      parts.set(`${key}.${inner}`, JSON.stringify(part));
  }
  return parts;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && Array.isArray(value) === false;

// Every part, uncapped as before, so `more` counts nothing.
function changesOf(before: unknown, after: unknown) {
  const old = partsOf(before);
  const fresh = partsOf(after);
  const sorted = (keys: string[]) => keys.sort();
  return {
    added: sorted([...fresh.keys()].filter(key => old.has(key) === false)),
    changed: sorted(
      [...fresh.keys()].filter(key => old.has(key) && old.get(key) !== fresh.get(key)),
    ),
    removed: sorted([...old.keys()].filter(key => fresh.has(key) === false)),
    more: 0,
  };
}
