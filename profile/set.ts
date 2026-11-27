/**
 * The command profile set: checks the profile of one job posting against its CV, then stores it.
 *
 * setProfile: checks a whole profile against its CV, then stores it, and names what it changed.
 *
 * A profile is checked by the same check plan runs, before it is written, so a refused profile is
 * never stored. It replaces the stored one whole, and only on request, so the answer names every
 * part it adds, changes or removes.
 *
 * @example const answer = await setProfile({ home, name: 'acme', input, isReplace: false, isDryRun: true });
 */
import { join } from 'node:path';
import { trySync$ } from '@honeyglass/utils/ts';
import { done, rejected } from '../core/errors.ts';
import type { Result } from '../core/errors.ts';
import * as issue from './issues.ts';
import * as coreIssue from '../core/issues.old.ts';
import { check } from '../core/check.ts';
import { Profile } from '../core/cv.schema.ts';
import { place } from '../core/place.old.ts';
import { existingText, readJson, writeAll } from '../core/files.ts';
import { chosenCv } from '../core/home.old.ts';
import { profileName } from './name.ts';

type Fields = Record<string, unknown>;
type Request = {
  home: string;
  name: string | undefined;
  input: unknown;
  isReplace: boolean;
  isDryRun: boolean;
};

/**
 * @param request - the data folder, the profile's name, the whole profile, and whether to write
 * @returns where it is stored, what it adds, changes and removes, and whether it fits its pages
 */
export async function setProfile(request: Request): Promise<Result<Fields>> {
  const name = profileName(request.name, 'profile set');
  if (name.error !== null) return name;
  const profile = Profile.safeParse(request.input);
  if (profile.success === false)
    return rejected('profile set', coreIssue.schemaIssues(profile.error, [], 'profile'));
  const fits = await checkedFit(request.home, profile.data);
  if (fits.error !== null) return fits;
  const stored = `profiles/${name.data}.json`;
  const path = join(request.home, stored);
  const existing = await existingText(path);
  if (existing.error !== null) return existing;
  if (existing.data !== null && request.isReplace === false)
    return rejected('profile set', [issue.profileExists(name.data)]);
  const content = `${JSON.stringify(request.input, null, 2)}\n`;
  const isWriting = request.isDryRun === false && existing.data !== content;
  const written = isWriting ? await writeAll([{ path, content }], 'home') : done(undefined);
  if (written.error !== null) return written;
  const changes = changesOf(parsedOrEmpty(existing.data), request.input);
  return done({ name: name.data, stored, written: isWriting, ...changes, ...fits.data });
}

// The checks plan runs on the profile's CV; a CV too long for its pages is answered, not refused.
async function checkedFit(home: string, profile: Profile) {
  const cv = await chosenCv(home, undefined, profile.cv);
  if (cv.error !== null) return cv;
  const master = await readJson(cv.data.path, 'cv');
  if (master.error !== null) return master;
  const checked = check(master.data, profile);
  if (checked.error !== null) return checked;
  const placed = place(checked.data);
  return done({
    cv: cv.data.name,
    fits: placed.error === null,
    layout: placed.error?.issues ?? [],
  });
}

// The stored profile as a value; an unreadable one counts as empty, so every part counts as added.
function parsedOrEmpty(text: string | null) {
  if (text === null) return {};
  const value = trySync$((): unknown => JSON.parse(text));
  return value.error === null ? value.data : {};
}

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
  };
}
